import { after, before, test } from "node:test"
import assert from "node:assert/strict"
import { createServer } from "node:http"
import { randomUUID } from "node:crypto"

process.env.NODE_ENV = "test"
process.env.LOCAL_DATABASE_PATH = "memory://"
process.env.PUBLIC_SITE_URL = "https://london-tech.vercel.app"
delete process.env.DATABASE_URL
delete process.env.POSTGRES_URL
delete process.env.RESEND_API_KEY
delete process.env.EMAIL_FROM
delete process.env.ADMIN_EMAIL
delete process.env.ADMIN_PASSWORD
delete process.env.VERCEL_ENV

const { default: handler } = await import("../server/handler.js")
const { getDatabase } = await import("../server/db.js")
const { hashPassword } = await import("../server/security.js")
const realFetch = globalThis.fetch
const site = process.env.PUBLIC_SITE_URL
const sent = []
const knownEmail = "existing-email-flow@example.com"
const password = "email-flow-test-password"
let db,
  server,
  origin,
  rejectProvider = false

const enableEmail = () => {
  process.env.RESEND_API_KEY = "email-flow-test-fixture"
  process.env.EMAIL_FROM = "London Tech Stores <accounts@example.com>"
}

before(async () => {
  db = await getDatabase()
  await db.query(
    "INSERT INTO users(id,name,email,password_hash) VALUES($1,$2,$3,$4)",
    [
      randomUUID(),
      "Existing Shopper",
      knownEmail,
      await hashPassword(password),
    ],
  )
  // Exercise production origins, Secure cookies and HTTPS email links against
  // the already initialized in-memory database. No database network is used.
  process.env.NODE_ENV = "production"
  process.env.DATABASE_URL = "postgresql://unused-memory-fixture"
  server = createServer(handler)
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  origin = "http://127.0.0.1:" + server.address().port
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "https://api.resend.com/emails")
    if (rejectProvider)
      return Response.json({ message: "Private provider failure" }, {
        status: 403,
      })
    sent.push(JSON.parse(options.body))
    return Response.json({ id: randomUUID() })
  }
})

after(async () => {
  globalThis.fetch = realFetch
  await new Promise((resolve) => server.close(resolve))
  await db.close()
})

async function request(
  path,
  { method = "GET", body, cookie, requestOrigin = site } = {},
) {
  const response = await realFetch(origin + "/api/" + path, {
    method,
    headers: {
      Origin: requestOrigin,
      "Content-Type": "application/json",
      "X-Forwarded-For": "email-flow-" + randomUUID(),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return {
    status: response.status,
    data: await response.json(),
    cookies: response.headers.getSetCookie(),
  }
}

const post = (path, body, extra = {}) =>
  request(path, { method: "POST", body, ...extra })
const cookieValue = (result, name) =>
  result.cookies.find((value) => value.startsWith(name + "="))?.split(";")[0]
const codeFromLastEmail = () => {
  const match = sent.at(-1)?.text.match(/Your verification code: (\d{6})/)
  assert.ok(match, "A six-digit code was accepted by the mocked email provider")
  return match[1]
}

test("email availability gates the real routes without claiming an unconfigured code was sent", async () => {
  const config = await request("config")
  assert.equal(config.status, 200)
  assert.equal(config.data.emailCodes, false)
  assert.equal(config.data.orderEmails, false)
  const blocked = await post("auth/email-code", {
    email: "blocked@example.com",
  })
  assert.equal(blocked.status, 503)
  assert.equal(sent.length, 0)
  assert.equal(cookieValue(blocked, "lt_session"), undefined)
  enableEmail()
  const enabled = await request("config")
  assert.equal(enabled.data.emailCodes, true)
  assert.equal(enabled.data.orderEmails, true)
})

test("email code creation and verification preserve the handler origin and session boundaries", async () => {
  const address = "new-email-flow@example.com"
  const denied = await post("auth/email-code", { email: address }, {
    requestOrigin: "https://foreign.example",
  })
  assert.equal(denied.status, 403)
  assert.equal(sent.length, 0)
  const started = await post("auth/email-code", { email: address })
  assert.equal(started.status, 200)
  assert.deepEqual(Object.keys(started.data).sort(), [
    "challengeId",
    "codeLength",
    "expiresAt",
    "resendAt",
  ])
  assert.equal(started.data.codeLength, 6)
  assert.match(
    started.cookies.join(";"),
    /HttpOnly; SameSite=Lax; Path=\/api\/auth\/; Max-Age=1800; Secure/,
  )
  assert.equal(cookieValue(started, "lt_session"), undefined)
  assert.equal(
    (await db.query("SELECT id FROM users WHERE email=$1", [address])).rows
      .length,
    0,
  )
  const code = codeFromLastEmail()
  const body = { challengeId: started.data.challengeId, code, terms: true }
  const noBrowserProof = await post("auth/verify-code", body)
  assert.equal(noBrowserProof.status, 400)
  const verified = await post("auth/verify-code", body, {
    cookie: cookieValue(started, "lt_email_challenge"),
  })
  assert.equal(verified.status, 200)
  assert.equal(verified.data.user.email, address)
  assert.equal(verified.data.user.role, "customer")
  const session = cookieValue(verified, "lt_session")
  assert.ok(session)
  const me = await request("auth/me", { cookie: session })
  assert.equal(me.data.user.id, verified.data.user.id)
  assert.equal((await request("auth/me")).data.user, null)
  const replay = await post("auth/verify-code", body, {
    cookie: cookieValue(started, "lt_email_challenge"),
  })
  assert.equal(replay.status, 400)
  assert.equal(cookieValue(replay, "lt_session"), undefined)
})

test("existing addresses receive the same start response and retain their account after verification", async () => {
  const existing = (
    await db.query("SELECT id FROM users WHERE email=$1", [knownEmail])
  ).rows[0]
  const started = await post("auth/email-code", { email: knownEmail })
  assert.equal(started.status, 200)
  assert.deepEqual(Object.keys(started.data).sort(), [
    "challengeId",
    "codeLength",
    "expiresAt",
    "resendAt",
  ])
  assert.doesNotMatch(
    sent.at(-1).text,
    /already exists|existing account|new account/i,
  )
  const verified = await post(
    "auth/verify-code",
    {
      challengeId: started.data.challengeId,
      code: codeFromLastEmail(),
      terms: true,
    },
    { cookie: cookieValue(started, "lt_email_challenge") },
  )
  assert.equal(verified.status, 200)
  assert.equal(verified.data.user.id, existing.id)
  assert.equal(verified.data.user.name, "Existing Shopper")
})

test("password registration cannot bypass proof of email while email codes are enabled", async () => {
  const address = "registration-bypass@example.com"
  const result = await post("auth/register", {
    name: "Bypass Attempt",
    email: address,
    password,
  })
  assert.equal(result.status, 409)
  assert.match(result.data.error, /verify your email/i)
  assert.equal(cookieValue(result, "lt_session"), undefined)
  assert.equal(
    (await db.query("SELECT id FROM users WHERE email=$1", [address])).rows
      .length,
    0,
  )
})

test("password reset produces a branded HTTPS message, invalidates existing sessions and consumes the token once", async () => {
  const before = await post("auth/login", { email: knownEmail, password })
  assert.equal(before.status, 200)
  const oldSession = cookieValue(before, "lt_session")
  const result = await post("auth/forgot-password", { email: knownEmail })
  assert.equal(result.status, 200)
  const mail = sent.at(-1)
  assert.match(mail.subject, /Reset your London Tech Stores password/)
  assert.match(mail.html, /london-tech-logo\.png/)
  assert.match(mail.html, /Reset password/)
  assert.match(mail.text, /30 minutes/)
  const link = mail.text.match(/Reset password: (https:\/\/\S+)/)?.[1]
  assert.ok(link)
  const resetUrl = new URL(link)
  assert.equal(resetUrl.origin, site)
  assert.equal(resetUrl.pathname, "/reset-password/")
  const token = resetUrl.searchParams.get("token")
  assert.match(token, /^[a-f0-9]{64}$/)
  const newPassword = "replacement-password-for-test"
  assert.equal(
    (await post("auth/reset-password", { token, password: newPassword }))
      .status,
    200,
  )
  assert.equal(
    (await request("auth/me", { cookie: oldSession })).data.user,
    null,
  )
  assert.equal(
    (
      await post("auth/reset-password", {
        token,
        password: "another-replacement-password",
      })
    ).status,
    400,
  )
  assert.equal(
    (await post("auth/login", { email: knownEmail, password: newPassword }))
      .status,
    200,
  )
})

test("forgot-password does not reveal membership or provider failures and removes rejected reset tokens", async () => {
  const before = sent.length
  const unknown = await post("auth/forgot-password", {
    email: "no-account-here@example.com",
  })
  assert.equal(unknown.status, 200)
  assert.equal(sent.length, before)
  rejectProvider = true
  try {
    const known = await post("auth/forgot-password", { email: knownEmail })
    assert.equal(known.status, unknown.status)
    assert.deepEqual(known.data, unknown.data)
    assert.doesNotMatch(JSON.stringify(known.data), /Private provider failure/)
    assert.equal(
      (
        await db.query(
          "SELECT token_hash FROM reset_tokens WHERE user_id=(SELECT id FROM users WHERE email=$1)",
          [knownEmail],
        )
      ).rows.length,
      0,
    )
  } finally {
    rejectProvider = false
  }
})
