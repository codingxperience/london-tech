import { createHmac, randomBytes, randomUUID } from "node:crypto"
import * as client from "openid-client"
import { localReturnPath } from "../src/lib/navigation.js"
import {
  createSession,
  currentOrigin,
  email,
  fail,
  hash,
  hashPassword,
  rateLimit,
  safeEqual,
} from "./security.js"

const providers = {
  google: { id: "GOOGLE_CLIENT_ID", secret: "GOOGLE_CLIENT_SECRET" },
  facebook: { id: "FACEBOOK_APP_ID", secret: "FACEBOOK_APP_SECRET" },
}
const cookies = { state: "lt_oauth_state", link: "lt_oauth_link" }
const graphVersion = () =>
  /^v\d+\.\d+$/.test(process.env.FACEBOOK_GRAPH_VERSION || "")
    ? process.env.FACEBOOK_GRAPH_VERSION
    : "v24.0"

export function socialProviders() {
  return Object.fromEntries(
    Object.entries(providers).map(([name, keys]) => [
      name,
      Boolean(process.env[keys.id] && process.env[keys.secret]),
    ]),
  )
}

function cookie(req, name) {
  return String(req.headers.cookie || "")
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(name + "="))
    ?.slice(name.length + 1)
}

function setCookie(res, name, value, seconds) {
  const previous = res.getHeader("Set-Cookie") || []
  res.setHeader("Set-Cookie", [
    ...(Array.isArray(previous) ? previous : [previous]),
    `${name}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${seconds}${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`,
  ])
}

function redirect(res, path) {
  res.statusCode = 303
  res.setHeader("Location", path)
  res.setHeader("Referrer-Policy", "no-referrer")
  res.end()
  return true
}

function configuration(provider) {
  const keys = providers[provider]
  if (!keys || !socialProviders()[provider])
    fail(
      503,
      "This sign-in option is being connected. Please continue with email.",
    )
  const metadata =
    provider === "google"
      ? {
          issuer: "https://accounts.google.com",
          authorization_endpoint:
            "https://accounts.google.com/o/oauth2/v2/auth",
          token_endpoint: "https://oauth2.googleapis.com/token",
          jwks_uri: "https://www.googleapis.com/oauth2/v3/certs",
        }
      : {
          issuer: "https://www.facebook.com",
          authorization_endpoint: `https://www.facebook.com/${graphVersion()}/dialog/oauth`,
          token_endpoint: `https://graph.facebook.com/${graphVersion()}/oauth/access_token`,
        }
  const config = new client.Configuration(
    metadata,
    process.env[keys.id],
    {
      client_secret: process.env[keys.secret],
    },
    client.ClientSecretPost(process.env[keys.secret]),
  )
  config.timeout = 12
  // OAuth calls use the host fetch so existing request instrumentation applies.
  config[client.customFetch] = (...args) => fetch(...args)
  if (provider === "google") client.enableNonRepudiationChecks(config)
  return config
}

async function identity(provider, config, url, state, payload) {
  const tokens = await client.authorizationCodeGrant(config, url, {
    expectedState: state,
    ...(provider === "google"
      ? {
          pkceCodeVerifier: payload.verifier,
          expectedNonce: payload.nonce,
          idTokenExpected: true,
        }
      : {}),
  })
  if (provider === "google") {
    const claims = tokens.claims()
    if (
      !claims ||
      claims.email_verified !== true ||
      typeof claims.sub !== "string"
    )
      fail(
        400,
        "Google could not confirm your email. Please continue with email.",
      )
    return {
      subject: claims.sub,
      email: email.parse(claims.email),
      name: claims.name,
    }
  }
  const proof = createHmac("sha256", process.env.FACEBOOK_APP_SECRET)
    .update(tokens.access_token)
    .digest("hex")
  const profileUrl = new URL(`https://graph.facebook.com/${graphVersion()}/me`)
  profileUrl.searchParams.set("fields", "id,name,email")
  profileUrl.searchParams.set("appsecret_proof", proof)
  const response = await fetch(profileUrl, {
    headers: { Authorization: "Bearer " + tokens.access_token },
    signal: AbortSignal.timeout(12000),
  })
  const profile = await response.json()
  if (!response.ok || typeof profile.id !== "string" || !profile.email)
    fail(
      400,
      "Facebook could not share an email address. Please continue with email.",
    )
  return {
    subject: profile.id,
    email: email.parse(profile.email),
    name: profile.name,
  }
}

export async function finishSocialLink(db, req, res, userId) {
  const token = cookie(req, cookies.link)
  if (!token) return
  setCookie(res, cookies.link, "", 0)
  if (!/^[a-f0-9]{64}$/.test(token)) return
  await db.transaction(async (tx) => {
    const {
      rows: [flow],
    } = await tx.query(
      "DELETE FROM oauth_flows WHERE token_hash=$1 AND purpose='link' AND expires_at>NOW() RETURNING payload",
      [hash(token)],
    )
    if (!flow || flow.payload.userId !== userId) return
    await tx.query(
      "INSERT INTO oauth_accounts(provider,subject,user_id) VALUES($1,$2,$3) ON CONFLICT(provider,subject) DO NOTHING",
      [flow.payload.provider, flow.payload.subject, userId],
    )
  })
}

export async function socialRoute({
  route,
  method,
  body,
  db,
  req,
  res,
  url,
  ip,
}) {
  if (route === "auth/social-link" && method === "GET") {
    const token = cookie(req, cookies.link)
    if (!/^[a-f0-9]{64}$/.test(token || "")) return { link: null }
    const {
      rows: [flow],
    } = await db.query(
      "SELECT payload FROM oauth_flows WHERE token_hash=$1 AND purpose='link' AND expires_at>NOW()",
      [hash(token)],
    )
    return {
      link: flow
        ? {
            email: flow.payload.email,
            provider: flow.payload.provider,
            next: flow.payload.next,
          }
        : null,
    }
  }
  const match = route.match(
    /^auth\/social\/(google|facebook)(?:\/(callback))?$/,
  )
  if (!match) return false
  const [, provider, callback] = match
  const callbackUrl =
    currentOrigin(req) + `/api/auth/social/${provider}/callback/`
  if (!callback && method === "POST") {
    const config = configuration(provider)
    await rateLimit(db, "oauth-start:" + ip, 20, 15)
    const state = randomBytes(32).toString("hex")
    const verifier = client.randomPKCECodeVerifier()
    const nonce = client.randomNonce()
    const next = localReturnPath(body.next, "")
    await db.query("DELETE FROM oauth_flows WHERE expires_at<NOW()")
    await db.query(
      "INSERT INTO oauth_flows(token_hash,purpose,payload,expires_at) VALUES($1,'authorize',$2::jsonb,NOW()+INTERVAL '10 minutes')",
      [hash(state), JSON.stringify({ provider, verifier, nonce, next })],
    )
    const target = client.buildAuthorizationUrl(config, {
      redirect_uri: callbackUrl,
      state,
      scope:
        provider === "google" ? "openid email profile" : "email public_profile",
      ...(provider === "google"
        ? {
            nonce,
            code_challenge: await client.calculatePKCECodeChallenge(verifier),
            code_challenge_method: "S256",
          }
        : {}),
    })
    setCookie(res, cookies.state, state, 600)
    return { url: target.href }
  }
  if (!callback || method !== "GET")
    fail(405, "This sign-in action is unavailable.")
  const state = url.searchParams.get("state")
  const loginUrl = new URL("/login/", currentOrigin(req))
  try {
    const config = configuration(provider)
    if (
      !/^[a-f0-9]{64}$/.test(state || "") ||
      !safeEqual(cookie(req, cookies.state), state)
    )
      fail(400, "This sign-in session expired. Please try again.")
    const {
      rows: [flow],
    } = await db.query(
      "DELETE FROM oauth_flows WHERE token_hash=$1 AND purpose='authorize' AND expires_at>NOW() RETURNING payload",
      [hash(state)],
    )
    setCookie(res, cookies.state, "", 0)
    if (!flow || flow.payload.provider !== provider)
      fail(400, "This sign-in session expired. Please try again.")
    if (flow.payload.next) loginUrl.searchParams.set("next", flow.payload.next)
    const callbackRequest = new URL(callbackUrl)
    callbackRequest.search = url.search
    const profile = await identity(
      provider,
      config,
      callbackRequest,
      state,
      flow.payload,
    )
    const lockedPassword = await hashPassword(randomBytes(48).toString("hex"))
    const result = await db.transaction(async (tx) => {
      // Serialize initial linking for one provider identity, including parallel callbacks.
      await tx.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        provider + ":" + profile.subject,
      ])
      const {
        rows: [linked],
      } = await tx.query(
        "SELECT u.id,u.role FROM oauth_accounts a JOIN users u ON u.id=a.user_id WHERE a.provider=$1 AND a.subject=$2",
        [provider, profile.subject],
      )
      if (linked) return { user: linked }
      const {
        rows: [created],
      } = await tx.query(
        "INSERT INTO users(id,name,email,password_hash) VALUES($1,$2,$3,$4) ON CONFLICT(email) DO NOTHING RETURNING id,role",
        [
          randomUUID(),
          typeof profile.name === "string" && profile.name.trim().length >= 2
            ? profile.name.trim().slice(0, 100)
            : "London Tech customer",
          profile.email,
          lockedPassword,
        ],
      )
      if (created) {
        await tx.query(
          "INSERT INTO oauth_accounts(provider,subject,user_id) VALUES($1,$2,$3)",
          [provider, profile.subject, created.id],
        )
        return { user: created }
      }
      const {
        rows: [existing],
      } = await tx.query("SELECT id FROM users WHERE email=$1", [profile.email])
      const linkToken = randomBytes(32).toString("hex")
      await tx.query(
        "INSERT INTO oauth_flows(token_hash,purpose,payload,expires_at) VALUES($1,'link',$2::jsonb,NOW()+INTERVAL '5 minutes')",
        [
          hash(linkToken),
          JSON.stringify({
            provider,
            subject: profile.subject,
            email: profile.email,
            userId: existing.id,
            next: flow.payload.next,
          }),
        ],
      )
      return { linkToken }
    })
    if (result.linkToken) {
      setCookie(res, cookies.link, result.linkToken, 300)
      loginUrl.searchParams.set("social", "link")
      return redirect(res, loginUrl.pathname + loginUrl.search)
    }
    await createSession(db, res, result.user.id)
    return redirect(
      res,
      localReturnPath(
        flow.payload.next,
        result.user.role === "admin" ? "/admin/" : "/account/",
      ),
    )
  } catch (error) {
    setCookie(res, cookies.state, "", 0)
    loginUrl.searchParams.set(
      "social_error",
      error.status === 400
        ? error.message
        : "Social sign-in could not complete. Please try again or continue with email.",
    )
    return redirect(res, loginUrl.pathname + loginUrl.search)
  }
}
