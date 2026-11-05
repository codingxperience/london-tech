import { after, before, test } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"

process.env.NODE_ENV = "test"
process.env.LOCAL_DATABASE_PATH = "memory://"
process.env.RESEND_API_KEY = "email-auth-test-fixture"
process.env.EMAIL_FROM = "London Tech Stores <accounts@example.com>"
delete process.env.DATABASE_URL
delete process.env.POSTGRES_URL
delete process.env.ADMIN_EMAIL
delete process.env.ADMIN_PASSWORD

const { emailAuthRoute } = await import("../server/email-auth.js")
const { getDatabase } = await import("../server/db.js")
const { hash, hashPassword } = await import("../server/security.js")
let db
const sent = []
const realFetch = globalThis.fetch
let providerFailure = false

before(async () => {
  db = await getDatabase()
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "https://api.resend.com/emails")
    if (providerFailure === "timeout") throw new Error("Provider timed out")
    if (providerFailure)
      return Response.json({ message: "Private provider failure detail" }, {
        status: 403,
      })
    const payload = JSON.parse(options.body)
    sent.push({ payload, headers: options.headers })
    return Response.json({ id: randomUUID() })
  }
})
after(async () => {
  globalThis.fetch = realFetch
  await db.close()
})

function response() {
  const headers = new Map()
  return {
    getHeader: (key) => headers.get(key),
    setHeader: (key, value) => headers.set(key, value),
  }
}
async function call(
  route,
  body,
  { cookie = "", ip = "test-" + randomUUID() } = {},
) {
  const res = response()
  const result = await emailAuthRoute({
    route,
    method: "POST",
    body,
    db,
    req: { headers: { cookie, host: "localhost:5173" } },
    res,
    ip,
  })
  return { ...result, cookies: res.getHeader("Set-Cookie") || [] }
}
const binding = (result) =>
  result.cookies
    .find((value) => value.startsWith("lt_email_challenge="))
    ?.split(";")[0]
function lastCode() {
  const match = sent.at(-1)?.payload.text.match(/\b\d{6}\b/)
  assert.ok(match, "Verification email contains a six-digit code")
  return match[0]
}
async function start(address, options = {}) {
  const result = await call("auth/email-code", { email: address }, options)
  return {
    ...result,
    code: lastCode(),
    cookie: binding(result),
    email: address,
  }
}
const verify = (challenge, override = {}) =>
  call(
    "auth/verify-code",
    {
      challengeId: challenge.body.challengeId,
      code: challenge.code,
      terms: true,
      ...override,
    },
    { cookie: challenge.cookie },
  )
const rejectsStatus = (fn, status) =>
  assert.rejects(fn, (error) => error.status === status)
async function allowResend(challenge) {
  await db.query(
    "UPDATE email_challenges SET resend_at=NOW()-INTERVAL '1 second' WHERE id=$1",
    [challenge.body.challengeId],
  )
  await db.query(
    "UPDATE rate_limits SET expires_at=NOW()-INTERVAL '1 second' WHERE key=$1",
    [hash("email-code-send-cooldown:" + challenge.email.trim().toLowerCase())],
  )
}

test("email codes create an account only after proof and issue a normal session", async () => {
  const challenge = await start("  Verified.Customer@Example.com  ")
  assert.deepEqual(Object.keys(challenge.body).sort(), [
    "challengeId",
    "codeLength",
    "expiresAt",
    "resendAt",
  ])
  assert.equal(challenge.body.codeLength, 6)
  assert.equal(
    new Date(challenge.body.expiresAt) - new Date(challenge.body.resendAt),
    540000,
  )
  assert.match(
    challenge.cookies[0],
    /HttpOnly; SameSite=Lax; Path=\/api\/auth\//,
  )
  assert.equal(
    (
      await db.query("SELECT id FROM users WHERE email=$1", [
        "verified.customer@example.com",
      ])
    ).rows.length,
    0,
  )
  const row = (
    await db.query("SELECT * FROM email_challenges WHERE id=$1", [
      challenge.body.challengeId,
    ])
  ).rows[0]
  assert.equal(row.email, "verified.customer@example.com")
  assert.equal(new Date(row.expires_at) - new Date(row.created_at), 600000)
  assert.equal(new Date(row.resend_at) - new Date(row.created_at), 60000)
  assert.notEqual(row.code_hash, hash(challenge.code))
  assert.ok(!JSON.stringify(row).includes(challenge.cookie.split("=")[1]))

  const verified = await verify(challenge)
  assert.equal(verified.body.user.email, "verified.customer@example.com")
  assert.equal(verified.body.user.role, "customer")
  assert.ok(!("password_hash" in verified.body.user))
  assert.ok(
    verified.cookies.some((value) => /^lt_session=.+; HttpOnly/.test(value)),
  )
  assert.ok(
    verified.cookies.some(
      (value) =>
        value.startsWith("lt_email_challenge=;") && value.includes("Max-Age=0"),
    ),
  )
  const record = (
    await db.query("SELECT * FROM users WHERE id=$1", [verified.body.user.id])
  ).rows[0]
  assert.ok(record.email_verified_at)
  assert.ok(record.password_hash.length > 100)
  const used = (
    await db.query("SELECT * FROM email_challenges WHERE id=$1", [
      challenge.body.challengeId,
    ])
  ).rows[0]
  assert.equal(used.state, "consumed")
  assert.equal(used.code_hash, "")
  await rejectsStatus(() => verify(challenge), 400)
})

test("existing administrator keeps role, profile and password after email proof", async () => {
  const passwordHash = await hashPassword("A fixture password for testing")
  const id = randomUUID()
  await db.query(
    "INSERT INTO users(id,name,email,password_hash,role,phone) VALUES($1,$2,$3,$4,'admin',$5)",
    [
      id,
      "Existing owner",
      "existing-owner@example.com",
      passwordHash,
      "0788000000",
    ],
  )
  const challenge = await start("existing-owner@example.com")
  const verified = await verify(challenge)
  assert.equal(verified.body.user.id, id)
  assert.equal(verified.body.user.role, "admin")
  assert.equal(verified.body.user.name, "Existing owner")
  assert.equal(verified.body.user.phone, "0788000000")
  assert.equal(
    (await db.query("SELECT password_hash FROM users WHERE id=$1", [id]))
      .rows[0].password_hash,
    passwordHash,
  )
})

test("code verification requires the issuing browser and terms before creating users", async () => {
  const challenge = await start("browser-bound@example.com")
  await rejectsStatus(
    () =>
      call("auth/verify-code", {
        challengeId: challenge.body.challengeId,
        code: challenge.code,
        terms: true,
      }),
    400,
  )
  await rejectsStatus(
    () =>
      call(
        "auth/verify-code",
        {
          challengeId: challenge.body.challengeId,
          code: challenge.code,
          terms: true,
        },
        { cookie: "lt_email_challenge=" + "a".repeat(64) },
      ),
    400,
  )
  await assert.rejects(() => verify(challenge, { terms: false }))
  assert.equal(
    (await db.query("SELECT id FROM users WHERE email=$1", [challenge.email]))
      .rows.length,
    0,
  )
  assert.equal((await verify(challenge)).body.user.email, challenge.email)
})

test("expired codes never create a session or customer", async () => {
  const challenge = await start("expired-code@example.com")
  await db.query(
    "UPDATE email_challenges SET expires_at=NOW()-INTERVAL '1 second' WHERE id=$1",
    [challenge.body.challengeId],
  )
  await rejectsStatus(() => verify(challenge), 400)
  assert.equal(
    (await db.query("SELECT id FROM users WHERE email=$1", [challenge.email]))
      .rows.length,
    0,
  )
  assert.equal(
    (
      await db.query("SELECT state FROM email_challenges WHERE id=$1", [
        challenge.body.challengeId,
      ])
    ).rows[0].state,
    "expired",
  )
})

test("resend is server throttled and replaces the old challenge and its code", async () => {
  const challenge = await start("resend-code@example.com")
  const beforeCount = sent.length
  await rejectsStatus(
    () => start(challenge.email, { cookie: challenge.cookie }),
    429,
  )
  assert.equal(sent.length, beforeCount)
  await allowResend(challenge)
  const replacement = await start(challenge.email, { cookie: challenge.cookie })
  assert.notEqual(replacement.body.challengeId, challenge.body.challengeId)
  assert.equal(replacement.cookie, challenge.cookie)
  await rejectsStatus(() => verify(challenge), 400)
  assert.equal((await verify(replacement)).body.user.email, challenge.email)
})

test("five failures persist across resends and browsers without account creation", async () => {
  const challenge = await start("guess-limited@example.com")
  await allowResend(challenge)
  const anotherBrowser = await start(challenge.email)
  const wrong = challenge.code === "000000" ? "000001" : "000000"
  for (let attempt = 0; attempt < 5; attempt++) {
    await rejectsStatus(
      () => verify(challenge, { code: wrong }),
      attempt === 4 ? 429 : 400,
    )
  }
  const locked = (
    await db.query("SELECT attempts,state FROM email_challenges WHERE id=$1", [
      challenge.body.challengeId,
    ])
  ).rows[0]
  assert.equal(locked.attempts, 5)
  assert.equal(locked.state, "locked")
  await rejectsStatus(() => verify(challenge), 429)
  await rejectsStatus(() => verify(anotherBrowser), 429)
  await allowResend(challenge)
  const replacement = await start(challenge.email, { cookie: challenge.cookie })
  await rejectsStatus(() => verify(replacement), 429)
  assert.equal(
    (await db.query("SELECT id FROM users WHERE email=$1", [challenge.email]))
      .rows.length,
    0,
  )
})

test("concurrent replay creates one session and one user", async () => {
  const challenge = await start("concurrent-code@example.com")
  const results = await Promise.allSettled([
    verify(challenge),
    verify(challenge),
  ])
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  )
  assert.equal(
    results.filter((result) => result.status === "rejected").length,
    1,
  )
  const user = (
    await db.query("SELECT id FROM users WHERE email=$1", [challenge.email])
  ).rows[0]
  assert.equal(
    (await db.query("SELECT * FROM sessions WHERE user_id=$1", [user.id])).rows
      .length,
    1,
  )
})

test("parallel initial sends issue one code and only the winner sets the browser cookie", async () => {
  const address = "parallel-first-send@example.com"
  const responses = [response(), response()]
  const sentBefore = sent.length
  const results = await Promise.allSettled(
    responses.map((res, index) =>
      emailAuthRoute({
        route: "auth/email-code",
        method: "POST",
        body: { email: address },
        db,
        req: { headers: {} },
        res,
        ip: "parallel-start-" + index,
      }),
    ),
  )
  const winner = results.findIndex((result) => result.status === "fulfilled")
  assert.notEqual(winner, -1)
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  )
  assert.equal(results[1 - winner].reason.status, 429)
  assert.equal(responses[1 - winner].getHeader("Set-Cookie"), undefined)
  assert.equal(sent.length - sentBefore, 1)
  const challenge = {
    body: results[winner].value.body,
    cookie: responses[winner].getHeader("Set-Cookie")[0].split(";")[0],
    code: lastCode(),
    email: address,
  }
  assert.equal((await verify(challenge)).body.user.email, address)
})

test("failure budgets reset on database expiry while consumed codes stay unusable", async () => {
  const challenge = await start("recover-budget@example.com")
  const wrong = challenge.code === "000000" ? "000001" : "000000"
  for (let attempt = 0; attempt < 5; attempt++)
    await rejectsStatus(
      () => verify(challenge, { code: wrong }),
      attempt === 4 ? 429 : 400,
    )
  await db.query(
    "UPDATE rate_limits SET expires_at=NOW()-INTERVAL '1 second' WHERE key=$1",
    [hash("email-code-fail-email:" + challenge.email)],
  )
  await allowResend(challenge)
  const replacement = await start(challenge.email, { cookie: challenge.cookie })
  assert.equal((await verify(replacement)).body.user.email, challenge.email)
  await rejectsStatus(() => verify(replacement), 400)
})

test("expired secret cleanup is bounded and preserves current challenges", async () => {
  await db.query(`INSERT INTO email_challenges(id,email,browser_hash,code_hash,state,expires_at,resend_at)
    SELECT 'cleanup-'||n,'cleanup-'||n||'@example.com','cleanup-binding','old-hash','failed',
      NOW()-INTERVAL '2 hours',NOW()-INTERVAL '2 hours' FROM generate_series(1,55) n`)
  const live = await start("cleanup-live@example.com")
  assert.equal(
    Number(
      (
        await db.query(
          "SELECT COUNT(*) FROM email_challenges WHERE id LIKE 'cleanup-%'",
        )
      ).rows[0].count,
    ),
    5,
  )
  await start("cleanup-second@example.com")
  assert.equal(
    Number(
      (
        await db.query(
          "SELECT COUNT(*) FROM email_challenges WHERE id LIKE 'cleanup-%'",
        )
      ).rows[0].count,
    ),
    0,
  )
  assert.equal((await verify(live)).body.user.email, live.email)
})

test("provider rejection cannot claim a sent code or leave the resend cooldown stuck", async () => {
  const res = response()
  providerFailure = true
  try {
    await assert.rejects(
      () =>
        emailAuthRoute({
          route: "auth/email-code",
          method: "POST",
          body: { email: "mail-failure@example.com" },
          db,
          req: { headers: {} },
          res,
          ip: "mail-failure-ip",
        }),
      (error) =>
        error.status === 503 && !error.message.includes("Private provider"),
    )
  } finally {
    providerFailure = false
  }
  const failed = (
    await db.query("SELECT * FROM email_challenges WHERE email=$1", [
      "mail-failure@example.com",
    ])
  ).rows[0]
  assert.equal(failed.state, "failed")
  assert.ok(new Date(failed.resend_at) <= new Date())
  const cookie = res.getHeader("Set-Cookie")[0].split(";")[0]
  const retry = await start("mail-failure@example.com", { cookie })
  assert.equal(
    (await verify(retry)).body.user.email,
    "mail-failure@example.com",
  )
})

test("missing email configuration fails without exposing secrets or issuing a challenge", async () => {
  delete process.env.RESEND_API_KEY
  try {
    await rejectsStatus(() => start("not-configured@example.com"), 503)
    assert.equal(
      (
        await db.query("SELECT id FROM email_challenges WHERE email=$1", [
          "not-configured@example.com",
        ])
      ).rows.length,
      0,
    )
  } finally {
    process.env.RESEND_API_KEY = "email-auth-test-fixture"
  }
})

test("uncertain delivery retains its cooldown without claiming the code was sent", async () => {
  const res = response()
  providerFailure = "timeout"
  try {
    await rejectsStatus(
      () =>
        emailAuthRoute({
          route: "auth/email-code",
          method: "POST",
          body: { email: "mail-timeout@example.com" },
          db,
          req: { headers: {} },
          res,
          ip: "mail-timeout-ip",
        }),
      503,
    )
  } finally {
    providerFailure = false
  }
  const failed = (
    await db.query("SELECT * FROM email_challenges WHERE email=$1", [
      "mail-timeout@example.com",
    ])
  ).rows[0]
  assert.equal(failed.state, "failed")
  assert.equal(new Date(failed.resend_at) - new Date(failed.created_at), 60000)
  const cookie = res.getHeader("Set-Cookie")[0].split(";")[0]
  await rejectsStatus(() => start("mail-timeout@example.com", { cookie }), 429)
})

test("shared IP failure budget also stops guesses across different email addresses", async () => {
  const ip = "shared-guess-ip"
  const challenges = []
  for (let index = 0; index < 7; index++)
    challenges.push(await start(`ip-budget-${index}@example.com`))
  for (let attempt = 0; attempt < 30; attempt++) {
    const challenge = challenges[Math.floor(attempt / 5)]
    const code = challenge.code === "000000" ? "000001" : "000000"
    await rejectsStatus(
      () =>
        call(
          "auth/verify-code",
          {
            challengeId: challenge.body.challengeId,
            code,
            terms: true,
          },
          { cookie: challenge.cookie, ip },
        ),
      attempt % 5 === 4 || attempt === 29 ? 429 : 400,
    )
  }
  const last = challenges.at(-1)
  await rejectsStatus(
    () =>
      call(
        "auth/verify-code",
        {
          challengeId: last.body.challengeId,
          code: last.code,
          terms: true,
        },
        { cookie: last.cookie, ip },
      ),
    429,
  )
  assert.equal(
    (
      await db.query(
        "SELECT id FROM users WHERE email LIKE 'ip-budget-%@example.com'",
      )
    ).rows.length,
    0,
  )
})
