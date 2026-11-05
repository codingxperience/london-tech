import { createHmac, randomBytes, randomInt, randomUUID } from "node:crypto"
import { z } from "zod"
import { emailReady, sendEmail } from "./email.js"
import { verificationEmail } from "./email-templates.js"
import {
  audit,
  createSession,
  email,
  fail,
  hash,
  hashPassword,
  rateLimit,
  safeEqual,
} from "./security.js"

const COOKIE = "lt_email_challenge"
const COOKIE_PATH = "/api/auth/"
const invalidCode = "This code is incorrect or expired. Please try again."
const limitedCode =
  "Too many incorrect codes. Please wait 15 minutes and try again."
const startSchema = z.object({ email })
const verifySchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
  terms: z.literal(true),
})

function browserSecret(req) {
  const value = String(req.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(COOKIE + "="))
    ?.slice(COOKIE.length + 1)
  return /^[a-f0-9]{64}$/.test(value || "") ? value : null
}

function appendCookie(res, value) {
  res.setHeader("Set-Cookie", [
    ...[res.getHeader("Set-Cookie") || []].flat(),
    value,
  ])
}

function bindingCookie(res, secret, maxAge = 1800) {
  appendCookie(
    res,
    `${COOKIE}=${secret}; HttpOnly; SameSite=Lax; Path=${COOKIE_PATH}; Max-Age=${maxAge}${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`,
  )
}

// A database-only attacker cannot search the six-digit keyspace without the
// separate browser secret. Neither the secret nor the code is persisted.
function codeHash(secret, id, address, code) {
  return createHmac("sha256", secret)
    .update(`${id}:${address}:${code}`)
    .digest("hex")
}

async function start({ body, db, req, res, ip }) {
  const input = startSchema.parse(body)
  if (!emailReady())
    fail(
      503,
      "Email sign-in is not available yet. Please sign in with your password.",
    )

  await rateLimit(db, "email-code-send-ip:" + ip, 15, 15)
  await rateLimit(db, "email-code-send-email:" + input.email, 6, 30)
  const secret = browserSecret(req) || randomBytes(32).toString("hex")
  const binding = hash(secret)
  await rateLimit(db, "email-code-send-browser:" + binding, 8, 30)

  // Expired secrets have no operational use. Bound each cleanup so an auth
  // request cannot spend unbounded work on an old backlog.
  await db.query(
    `DELETE FROM email_challenges WHERE id IN
     (SELECT id FROM email_challenges WHERE expires_at<NOW()-INTERVAL '1 hour'
      ORDER BY expires_at LIMIT 50)`,
  )

  const id = randomUUID()
  const code = String(randomInt(0, 1000000)).padStart(6, "0")
  const sendLease = hash("email-code-send-cooldown:" + input.email)
  const challenge = await db.transaction(async (tx) => {
    // The email-level lease prevents parallel initial requests with no
    // browser cookie from sending several different codes at once.
    const lease = await tx.query(
      `INSERT INTO rate_limits(key,hits,expires_at) VALUES($1,1,NOW()+INTERVAL '60 seconds')
       ON CONFLICT(key) DO UPDATE SET hits=1,expires_at=EXCLUDED.expires_at
       WHERE rate_limits.expires_at<=NOW() RETURNING key`,
      [sendLease],
    )
    if (!lease.rows.length)
      fail(429, "Please wait 60 seconds before requesting another code.")
    const {
      rows: [reserved],
    } = await tx.query(
      `INSERT INTO email_challenges(id,email,browser_hash,code_hash,expires_at,resend_at,state)
     VALUES($1,$2,$3,$4,NOW()+INTERVAL '10 minutes',NOW()+INTERVAL '60 seconds','sending')
     ON CONFLICT(browser_hash,email) DO UPDATE SET
       id=EXCLUDED.id,code_hash=EXCLUDED.code_hash,expires_at=EXCLUDED.expires_at,
       resend_at=EXCLUDED.resend_at,state='sending',attempts=0,created_at=NOW()
     WHERE email_challenges.resend_at<=NOW()
     RETURNING id,expires_at,resend_at`,
      [id, input.email, binding, codeHash(secret, id, input.email, code)],
    )
    if (!reserved)
      fail(429, "Please wait 60 seconds before requesting another code.")
    return reserved
  })
  // Only the winning request may set a new browser binding. A concurrent
  // throttled response must not replace the cookie for the code just sent.
  bindingCookie(res, secret)

  try {
    await sendEmail({
      to: input.email,
      ...verificationEmail({ code, expiresMinutes: 10 }),
      idempotencyKey: "london-tech/email-code/" + id,
    })
  } catch (error) {
    // Do not present a code as sent or strand the user behind a cooldown if
    // the provider rejected it. A later send always generates a new code.
    await db.query(
      "UPDATE email_challenges SET state='failed',resend_at=CASE WHEN $2 THEN resend_at ELSE NOW() END WHERE id=$1 AND state='sending'",
      [id, error.deliveryUncertain === true],
    )
    if (error.deliveryUncertain !== true)
      await db.query(
        "UPDATE rate_limits SET expires_at=NOW() WHERE key=$1 AND expires_at=(SELECT created_at+INTERVAL '60 seconds' FROM email_challenges WHERE id=$2)",
        [sendLease, id],
      )
    fail(503, "The code could not be sent. Please try again.")
  }
  const ready = await db.query(
    "UPDATE email_challenges SET state='ready' WHERE id=$1 AND state='sending' RETURNING id",
    [id],
  )
  if (!ready.rows.length)
    fail(503, "Sign-in could not start. Please request a new code.")

  return {
    body: {
      challengeId: id,
      expiresAt: new Date(challenge.expires_at).toISOString(),
      resendAt: new Date(challenge.resend_at).toISOString(),
      codeLength: 6,
    },
  }
}

async function failureBudgets(tx, address, ip) {
  // Lock shared counters in a stable order. Five failures across all browsers
  // for an email cannot be multiplied by requesting new challenges.
  const limits = [
    { key: hash("email-code-fail-email:" + address), limit: 5 },
    { key: hash("email-code-fail-ip:" + ip), limit: 30 },
  ].sort((a, b) => a.key.localeCompare(b.key))
  for (const budget of limits) {
    const {
      rows: [row],
    } = await tx.query(
      `INSERT INTO rate_limits(key,hits,expires_at) VALUES($1,0,NOW()+INTERVAL '15 minutes')
       ON CONFLICT(key) DO UPDATE SET
         hits=CASE WHEN rate_limits.expires_at<=NOW() THEN 0 ELSE rate_limits.hits END,
         expires_at=CASE WHEN rate_limits.expires_at<=NOW() THEN EXCLUDED.expires_at ELSE rate_limits.expires_at END
       RETURNING hits`,
      [budget.key],
    )
    budget.hits = Number(row.hits)
  }
  return limits
}

async function verify({ body, db, req, res, ip }) {
  const input = verifySchema.parse(body)
  await rateLimit(db, "email-code-verify-ip:" + ip, 60, 15)
  const secret = browserSecret(req)
  if (!secret) fail(400, invalidCode)

  const sessionHeaders = new Map()
  const sessionResponse = {
    getHeader: (name) => sessionHeaders.get(name),
    setHeader: (name, value) => sessionHeaders.set(name, value),
  }
  const result = await db.transaction(async (tx) => {
    const {
      rows: [challenge],
    } = await tx.query(
      "SELECT *,expires_at>NOW() AS code_live FROM email_challenges WHERE id=$1 AND browser_hash=$2 FOR UPDATE",
      [input.challengeId, hash(secret)],
    )
    if (challenge?.state === "locked")
      return { error: limitedCode, status: 429 }
    if (!challenge || challenge.state !== "ready")
      return { error: invalidCode, status: 400 }
    if (!challenge.code_live) {
      await tx.query(
        "UPDATE email_challenges SET state='expired' WHERE id=$1",
        [challenge.id],
      )
      return { error: invalidCode, status: 400 }
    }
    const budgets = await failureBudgets(tx, challenge.email, ip)
    if (budgets.some((budget) => budget.hits >= budget.limit))
      return { error: limitedCode, status: 429 }
    const valid = safeEqual(
      challenge.code_hash,
      codeHash(secret, challenge.id, challenge.email, input.code),
    )
    if (!valid) {
      await tx.query(
        "UPDATE email_challenges SET attempts=attempts+1,state=CASE WHEN attempts+1>=5 THEN 'locked' ELSE state END WHERE id=$1",
        [challenge.id],
      )
      for (const budget of budgets)
        await tx.query("UPDATE rate_limits SET hits=hits+1 WHERE key=$1", [
          budget.key,
        ])
      const locked =
        Number(challenge.attempts) + 1 >= 5 ||
        budgets.some((budget) => budget.hits + 1 >= budget.limit)
      return {
        error: locked ? limitedCode : invalidCode,
        status: locked ? 429 : 400,
      }
    }

    const existing = (
      await tx.query("SELECT * FROM users WHERE email=$1", [challenge.email])
    ).rows[0]
    let record = existing
    if (!record) {
      const passwordHash = await hashPassword(randomBytes(48).toString("hex"))
      const inserted = await tx.query(
        `INSERT INTO users(id,name,email,password_hash,email_verified_at)
         VALUES($1,'Customer',$2,$3,NOW()) ON CONFLICT(email) DO NOTHING RETURNING *`,
        [randomUUID(), challenge.email, passwordHash],
      )
      record =
        inserted.rows[0] ||
        (
          await tx.query("SELECT * FROM users WHERE email=$1", [
            challenge.email,
          ])
        ).rows[0]
    }
    await tx.query(
      "UPDATE users SET email_verified_at=COALESCE(email_verified_at,NOW()) WHERE id=$1",
      [record.id],
    )
    await tx.query(
      "UPDATE email_challenges SET state='consumed',code_hash='' WHERE id=$1",
      [challenge.id],
    )
    await createSession(tx, sessionResponse, record.id)
    await audit(tx, record.id, "auth.email_verified", { newAccount: !existing })
    return {
      user: {
        id: record.id,
        name: record.name,
        email: record.email,
        role: record.role,
        phone: record.phone,
        addresses: record.addresses,
      },
    }
  })
  // Errors are thrown after commit so failed guesses cannot roll back their
  // own counters. Session cookies are exposed only after successful commit.
  if (result.error) fail(result.status, result.error)
  for (const cookie of [sessionHeaders.get("Set-Cookie") || []].flat())
    appendCookie(res, cookie)
  bindingCookie(res, "", 0)
  return { body: { user: result.user } }
}

export async function emailAuthRoute(context) {
  if (context.method !== "POST") return null
  if (context.route === "auth/email-code") return start(context)
  if (context.route === "auth/verify-code") return verify(context)
  return null
}
