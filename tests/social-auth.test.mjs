import { after, before, test } from "node:test"
import assert from "node:assert/strict"
import { createServer } from "node:http"
import { generateKeyPairSync, sign } from "node:crypto"

process.env.NODE_ENV = "test"
process.env.LOCAL_DATABASE_PATH = "memory://"
delete process.env.DATABASE_URL
delete process.env.POSTGRES_URL
delete process.env.RESEND_API_KEY
delete process.env.EMAIL_FROM
delete process.env.GOOGLE_CLIENT_ID
delete process.env.GOOGLE_CLIENT_SECRET
delete process.env.FACEBOOK_APP_ID
delete process.env.FACEBOOK_APP_SECRET
const { default: handler } = await import("../server/handler.js")
const { getDatabase } = await import("../server/db.js")
let db, server, origin
const realFetch = globalThis.fetch
const keys = generateKeyPairSync("rsa", { modulusLength: 2048 })
const jwk = {
  ...keys.publicKey.export({ format: "jwk" }),
  alg: "RS256",
  use: "sig",
  kid: "social-test",
}
let claims,
  facebookProfile,
  providerCalls = 0,
  invalidSignature = false
function jwt(payload) {
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", kid: jwk.kid }),
  ).toString("base64url")
  const data =
    header + "." + Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = sign("RSA-SHA256", Buffer.from(data), keys.privateKey)
  if (invalidSignature) signature[0] ^= 1
  return data + "." + signature.toString("base64url")
}
async function request(path, { method = "GET", data, cookie } = {}) {
  const response = await realFetch(origin + "/api/" + path, {
    method,
    redirect: "manual",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  })
  return {
    status: response.status,
    data: await response.json().catch(() => null),
    location: response.headers.get("location"),
    cookies: response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0]),
  }
}
function providerMock(url) {
  const address = String(url)
  if (address === "https://oauth2.googleapis.com/token") {
    providerCalls++
    return Response.json({
      access_token: "google-fixture-token",
      token_type: "Bearer",
      expires_in: 3600,
      id_token: jwt(claims),
    })
  }
  if (address === "https://www.googleapis.com/oauth2/v3/certs")
    return Response.json({ keys: [jwk] })
  if (address === "https://graph.facebook.com/v24.0/oauth/access_token")
    return Response.json({
      access_token: "facebook-fixture-token",
      token_type: "Bearer",
      expires_in: 3600,
    })
  if (address.startsWith("https://graph.facebook.com/v24.0/me?"))
    return Response.json(facebookProfile)
  throw Error("Unexpected provider request")
}
async function start(provider = "google", next = "/account/orders/") {
  const result = await request("auth/social/" + provider, {
    method: "POST",
    data: { next },
  })
  assert.equal(result.status, 200)
  const target = new URL(result.data.url)
  const now = Math.floor(Date.now() / 1000)
  claims = {
    sub: "google-person",
    email: "social-customer@example.com",
    email_verified: true,
    name: "Social Customer",
    iss: "https://accounts.google.com",
    aud: process.env.GOOGLE_CLIENT_ID,
    iat: now,
    exp: now + 300,
    nonce: target.searchParams.get("nonce"),
  }
  return {
    target,
    cookie: result.cookies.find((v) => v.startsWith("lt_oauth_state=")),
  }
}
const callback = (session, provider = "google", cookie = session.cookie) =>
  request(
    "auth/social/" +
      provider +
      "/callback/?code=fixture-code&state=" +
      session.target.searchParams.get("state"),
    { cookie },
  )
before(async () => {
  db = await getDatabase()
  server = createServer(handler)
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  origin = "http://127.0.0.1:" + server.address().port
  globalThis.fetch = async (url, options) =>
    String(url).startsWith(origin)
      ? realFetch(url, options)
      : providerMock(url, options)
})
after(async () => {
  globalThis.fetch = realFetch
  await new Promise((resolve) => server.close(resolve))
  await db.close()
})
test("provider availability is server configured and starts remain origin protected", async () => {
  assert.deepEqual((await request("config")).data.socialProviders, {
    google: false,
    facebook: false,
  })
  assert.equal(
    (await request("auth/social/google", { method: "POST", data: {} })).status,
    503,
  )
  process.env.GOOGLE_CLIENT_ID = "test-client"
  process.env.GOOGLE_CLIENT_SECRET = "test-secret"
  process.env.FACEBOOK_APP_ID = "test-facebook-app"
  process.env.FACEBOOK_APP_SECRET = "test-facebook-secret"
  assert.deepEqual((await request("config")).data.socialProviders, {
    google: true,
    facebook: true,
  })
  const denied = await realFetch(origin + "/api/auth/social/google", {
    method: "POST",
    headers: {
      Origin: "https://foreign.example",
      "Content-Type": "application/json",
    },
    body: "{}",
  })
  assert.equal(denied.status, 403)
})
test("OAuth state binds the browser, expires once and limits redirects", async () => {
  const session = await start("google", "https://outside.example")
  assert.equal(session.target.hostname, "accounts.google.com")
  assert.equal(
    session.target.searchParams.get("redirect_uri"),
    origin + "/api/auth/social/google/callback/",
  )
  assert.equal(session.target.searchParams.get("code_challenge_method"), "S256")
  const before = providerCalls
  const rejected = await callback(
    session,
    "google",
    "lt_oauth_state=" + "a".repeat(64),
  )
  assert.equal(rejected.status, 303)
  assert.match(rejected.location, /social_error=/)
  assert.equal(providerCalls, before)
  const result = await callback(session)
  assert.equal(result.status, 303)
  assert.equal(result.location, "/account/")
  const auth = result.cookies.find((v) => v.startsWith("lt_session="))
  const user = (await request("auth/me", { cookie: auth })).data.user
  assert.equal(user.email, "social-customer@example.com")
  assert.equal(user.role, "customer")
  assert.match((await callback(session)).location, /social_error=/)
})
test("OIDC nonce, signature and verified email are checked before issuing sessions", async () => {
  const nonceSession = await start()
  claims.nonce = "wrong-nonce"
  assert.match((await callback(nonceSession)).location, /social_error=/)
  const emailSession = await start()
  claims.email_verified = false
  const unverified = await callback(emailSession)
  assert.match(unverified.location, /social_error=/)
  assert.ok(!unverified.cookies.some((v) => v.startsWith("lt_session=")))
  const signatureSession = await start()
  invalidSignature = true
  const invalid = await callback(signatureSession)
  invalidSignature = false
  assert.match(invalid.location, /social_error=/)
  assert.ok(!invalid.cookies.some((value) => value.startsWith("lt_session=")))
})
test("existing passwords must be confirmed before a provider can access that account", async () => {
  const email = "password-account@example.com"
  const password = "Social-link-test-password-77!"
  const account = await request("auth/register", {
    method: "POST",
    data: { email, password, name: "Password Customer" },
  })
  assert.equal(account.status, 201)
  const session = await start()
  claims.sub = "google-password-person"
  claims.email = email
  const pending = await callback(session)
  assert.match(pending.location, /social=link/)
  assert.ok(!pending.cookies.some((v) => v.startsWith("lt_session=")))
  const cookie = pending.cookies.find((v) => v.startsWith("lt_oauth_link="))
  assert.equal(
    (await request("auth/social-link", { cookie })).data.link.email,
    email,
  )
  assert.equal(
    (
      await request("auth/login", {
        method: "POST",
        data: { email, password: "incorrect-password" },
        cookie,
      })
    ).status,
    401,
  )
  const confirmed = await request("auth/login", {
    method: "POST",
    data: { email, password },
    cookie,
  })
  assert.equal(confirmed.status, 200)
  assert.ok(confirmed.cookies[0].startsWith("lt_session="))
  const again = await start()
  claims.sub = "google-password-person"
  claims.email = email
  assert.equal((await callback(again)).location, "/account/orders/")
})
test("Facebook authenticates the provider identity without trusting email for account linking", async () => {
  const session = await start("facebook")
  facebookProfile = {
    id: "facebook-fixture-user",
    name: "Facebook Customer",
    email: "facebook-customer@example.com",
  }
  const result = await callback(session, "facebook")
  assert.equal(result.location, "/account/orders/")
  const user = (
    await request("auth/me", {
      cookie: result.cookies.find((v) => v.startsWith("lt_session=")),
    })
  ).data.user
  assert.equal(user.email, facebookProfile.email)
  assert.equal(user.role, "customer")
})
