import assert from "node:assert/strict"
import { before, after, beforeEach, test } from "node:test"
import { PGlite } from "@electric-sql/pglite"
import nodemailer from "nodemailer"
import { retryOrderEmails } from "../server/email-dispatch.js"
import { deliverOrderEmail } from "../server/order-emails.js"

let local
const envNames = [
  "EMAIL_PROVIDER",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "GMAIL_USER",
  "GMAIL_APP_PASSWORD",
]
const originalEnv = Object.fromEntries(
  envNames.map((name) => [name, process.env[name]]),
)
const realFetch = globalThis.fetch
const realCreateTransport = nodemailer.createTransport
const db = { query: (...args) => local.query(...args) }
const message = {
  to: "private-customer@example.com",
  title: "Order confirmed",
  message: {
    subject: "Order confirmed",
    text: "A private order update.",
    html: "<p>A private order update.</p>",
  },
}

before(async () => {
  local = new PGlite("memory://")
  await local.waitReady
  await local.query(
    `CREATE TABLE order_emails(id TEXT PRIMARY KEY,order_id TEXT NOT NULL,payload JSONB NOT NULL,state TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,provider_id TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  )
})
beforeEach(async () => {
  await local.query("DELETE FROM order_emails")
  process.env.RESEND_API_KEY = "fixture-resend-key"
  process.env.EMAIL_FROM = "London Tech <orders@example.com>"
  process.env.EMAIL_PROVIDER = "resend"
  nodemailer.createTransport = realCreateTransport
  globalThis.fetch = async () => Response.json({ id: "accepted-fixture" })
})
after(async () => {
  globalThis.fetch = realFetch
  nodemailer.createTransport = realCreateTransport
  for (const [name, value] of Object.entries(originalEnv)) {
    if (value == null) delete process.env[name]
    else process.env[name] = value
  }
  await local.close()
})

async function job(
  id,
  {
    state = "pending",
    attempts = 0,
    age = "10 minutes",
    created = "1 hour",
  } = {},
) {
  await local.query(
    `INSERT INTO order_emails(id,order_id,payload,state,attempts,updated_at,created_at) VALUES($1,$2,$3::jsonb,$4,$5,NOW()-$6::interval,NOW()-$7::interval)`,
    [
      id,
      "LT-" + id,
      JSON.stringify({
        ...message,
        ...(attempts > 0 ? { deliveryProvider: "resend" } : {}),
      }),
      state,
      attempts,
      age,
      created,
    ],
  )
}

test("dispatch does nothing until the verified sender is configured", async () => {
  delete process.env.EMAIL_FROM
  let queried = false
  const result = await retryOrderEmails({
    query: async () => {
      queried = true
      throw new Error("Should not query")
    },
  })
  assert.equal(queried, false)
  assert.deepEqual(result, {
    selected: 0,
    attempted: 0,
    accepted: 0,
    failed: 0,
    uncertain: 0,
    deferred: 0,
  })
})

test("dispatch selects only due events, uses exponential backoff and caps attempts", async () => {
  await job("pending")
  await job("failed-due", { state: "failed", attempts: 2, age: "3 minutes" })
  await job("failed-wait", { state: "failed", attempts: 2, age: "1 minute" })
  await job("cap-wait", { state: "failed", attempts: 7, age: "59 minutes" })
  await job("cap-due", { state: "failed", attempts: 7, age: "61 minutes" })
  await job("attempts-exhausted", {
    state: "failed",
    attempts: 8,
    age: "3 hours",
  })
  await job("leased", { state: "sending", attempts: 1, age: "1 minute" })
  await job("stale-lease", { state: "sending", attempts: 1, age: "3 minutes" })
  await job("uncertain-outside-dedupe", {
    state: "sending",
    attempts: 2,
    age: "3 hours",
    created: "24 hours",
  })
  await job("already-accepted", { state: "sent", attempts: 1 })
  const keys = []
  globalThis.fetch = async (url, options) => {
    keys.push(options.headers["Idempotency-Key"])
    return Response.json({ id: "accepted-" + keys.length })
  }
  const result = await retryOrderEmails(db)
  assert.deepEqual(result, {
    selected: 4,
    attempted: 4,
    accepted: 4,
    failed: 0,
    uncertain: 0,
    deferred: 0,
  })
  assert.deepEqual(
    keys.sort(),
    ["cap-due", "failed-due", "pending", "stale-lease"]
      .map((id) => "london-tech/" + id)
      .sort(),
  )
  const exhausted = (
    await local.query(
      "SELECT attempts FROM order_emails WHERE id='attempts-exhausted'",
    )
  ).rows[0]
  assert.equal(exhausted.attempts, 8)
  assert.ok(Object.values(result).every((value) => typeof value === "number"))
  assert.doesNotMatch(
    JSON.stringify(result),
    /private-customer|LT-|london-tech\//,
  )
})

test("dispatch respects the six-event bound and at most two simultaneous sends", async () => {
  for (let i = 0; i < 10; i++) await job("bounded-" + i)
  let active = 0
  let maximum = 0
  globalThis.fetch = async () => {
    active++
    maximum = Math.max(maximum, active)
    await new Promise((resolve) => setTimeout(resolve, 15))
    active--
    return Response.json({ id: "accepted-fixture" })
  }
  const result = await retryOrderEmails(db, { limit: 999 })
  assert.equal(result.accepted, 6)
  assert.equal(maximum, 2)
  assert.equal(
    Number(
      (
        await local.query(
          "SELECT COUNT(*) FROM order_emails WHERE state='pending'",
        )
      ).rows[0].count,
    ),
    4,
  )
})

test("concurrent workers rely on atomic claims and send each event once", async () => {
  await job("concurrent-a")
  await job("concurrent-b")
  const keys = []
  globalThis.fetch = async (url, options) => {
    keys.push(options.headers["Idempotency-Key"])
    await new Promise((resolve) => setTimeout(resolve, 15))
    return Response.json({ id: "accepted-" + keys.length })
  }
  const results = await Promise.all([
    retryOrderEmails(db),
    retryOrderEmails(db),
  ])
  assert.equal(keys.length, 2)
  assert.equal(new Set(keys).size, 2)
  assert.equal(
    results.reduce((sum, result) => sum + result.accepted, 0),
    2,
  )
  assert.equal(
    results.reduce((sum, result) => sum + result.attempted, 0),
    2,
  )
})

test("provider timeouts keep the uncertain lease and retry with the original idempotency key", async () => {
  await job("timeout")
  const keys = []
  globalThis.fetch = async (url, options) => {
    keys.push(options.headers["Idempotency-Key"])
    throw Object.assign(new Error("provider private diagnostic"), {
      name: "TimeoutError",
    })
  }
  const first = await retryOrderEmails(db)
  assert.equal(first.uncertain, 1)
  assert.equal(
    (await local.query("SELECT state FROM order_emails WHERE id='timeout'"))
      .rows[0].state,
    "sending",
  )
  assert.equal((await retryOrderEmails(db)).selected, 0)
  await local.query(
    "UPDATE order_emails SET updated_at=NOW()-INTERVAL '3 minutes' WHERE id='timeout'",
  )
  globalThis.fetch = async (url, options) => {
    keys.push(options.headers["Idempotency-Key"])
    return Response.json({ id: "same-accepted-message" })
  }
  assert.equal((await retryOrderEmails(db)).accepted, 1)
  assert.equal(keys[0], keys[1])
  assert.equal(
    (await local.query("SELECT attempts FROM order_emails WHERE id='timeout'"))
      .rows[0].attempts,
    2,
  )
})

test("provider rejection stays retryable after backoff and never becomes accepted falsely", async () => {
  await job("rejected")
  globalThis.fetch = async () =>
    Response.json({ message: "private provider diagnostic" }, { status: 503 })
  const result = await retryOrderEmails(db)
  assert.equal(result.failed, 1)
  assert.equal(result.accepted, 0)
  assert.equal((await retryOrderEmails(db)).selected, 0)
  assert.equal(
    (await local.query("SELECT state FROM order_emails WHERE id='rejected'"))
      .rows[0].state,
    "failed",
  )
})

test("never-attempted backlog remains eligible while an unsafe uncertain backlog stays for staff", async () => {
  await job("old-pending", { created: "10 days", age: "10 days" })
  await job("old-uncertain", {
    state: "sending",
    attempts: 1,
    created: "10 days",
    age: "9 days",
  })
  const result = await retryOrderEmails(db)
  assert.equal(result.selected, 1)
  assert.equal(result.accepted, 1)
  assert.equal(
    (
      await local.query(
        "SELECT state FROM order_emails WHERE id='old-uncertain'",
      )
    ).rows[0].state,
    "sending",
  )
})

test("Gmail never retries uncertain SMTP sends, including stale sending left by interrupted database updates", async () => {
  process.env.EMAIL_PROVIDER = "gmail"
  process.env.GMAIL_USER = "londontechstore1@gmail.com"
  process.env.GMAIL_APP_PASSWORD = "gmail-fixture-password"
  await job("gmail-timeout")
  let calls = 0
  nodemailer.createTransport = () => ({
    sendMail: async () => {
      calls++
      throw Object.assign(new Error("private SMTP error"), {
        code: "ETIMEDOUT",
      })
    },
    close() {},
  })
  const result = await retryOrderEmails(db)
  assert.equal(result.uncertain, 1)
  assert.equal(
    (
      await local.query(
        "SELECT state FROM order_emails WHERE id='gmail-timeout'",
      )
    ).rows[0].state,
    "uncertain",
  )
  await local.query("UPDATE order_emails SET updated_at=NOW()-INTERVAL '1 day'")
  assert.equal((await retryOrderEmails(db)).selected, 0)
  await local.query(
    "UPDATE order_emails SET state='sending',updated_at=NOW()-INTERVAL '1 hour'",
  )
  assert.equal((await retryOrderEmails(db)).selected, 0)
  assert.equal(calls, 1)
})

test("Gmail definitive rejection can retry on the next daily dispatch and is never called delivered", async () => {
  process.env.EMAIL_PROVIDER = "gmail"
  process.env.GMAIL_USER = "londontechstore1@gmail.com"
  process.env.GMAIL_APP_PASSWORD = "gmail-fixture-password"
  await job("gmail-rejected", { created: "3 days" })
  let reject = true
  nodemailer.createTransport = () => ({
    sendMail: async (mail) => {
      if (reject)
        throw Object.assign(new Error("private Gmail rejection"), {
          code: "EAUTH",
          responseCode: 535,
        })
      return { accepted: mail.to, messageId: mail.messageId }
    },
    close() {},
  })
  const first = await retryOrderEmails(db)
  assert.equal(first.failed, 1)
  assert.equal(first.accepted, 0)
  await local.query("UPDATE order_emails SET updated_at=NOW()-INTERVAL '1 day'")
  reject = false
  const second = await retryOrderEmails(db)
  assert.equal(second.accepted, 1)
  assert.equal(
    (
      await local.query(
        "SELECT attempts FROM order_emails WHERE id='gmail-rejected'",
      )
    ).rows[0].attempts,
    2,
  )
})

test("switching providers cannot automatically resend an earlier ambiguous message", async () => {
  await job("earlier-smtp", { state: "sending", attempts: 1, age: "1 hour" })
  await local.query(
    "UPDATE order_emails SET payload=jsonb_set(jsonb_set(payload,'{deliveryProvider}','\"gmail\"'::jsonb),'{deliveryUncertain}','true'::jsonb)",
  )
  assert.equal((await retryOrderEmails(db)).selected, 0)
  await local.query("UPDATE order_emails SET state='failed'")
  assert.equal((await retryOrderEmails(db)).selected, 0)
})

test("normal order calls cannot resend uncertain Gmail; only confirmed staff retry can attempt it", async () => {
  process.env.EMAIL_PROVIDER = "gmail"
  process.env.GMAIL_USER = "londontechstore1@gmail.com"
  process.env.GMAIL_APP_PASSWORD = "gmail-fixture-password"
  await job("staff-confirm", {
    state: "uncertain",
    attempts: 1,
    created: "1 hour",
    age: "10 minutes",
  })
  await local.query(
    "UPDATE order_emails SET payload=jsonb_set(jsonb_set(payload,'{deliveryProvider}','\"gmail\"'::jsonb),'{deliveryUncertain}','true'::jsonb)",
  )
  let calls = 0
  nodemailer.createTransport = () => ({
    sendMail: async (mail) => {
      calls++
      return { accepted: mail.to, messageId: mail.messageId }
    },
    close() {},
  })
  assert.deepEqual(
    await deliverOrderEmail(db, "staff-confirm", "LT-staff-confirm"),
    { claimed: false },
  )
  assert.equal(calls, 0)
  assert.deepEqual(
    await deliverOrderEmail(db, "staff-confirm", "LT-staff-confirm", {
      allowUncertainRetry: true,
    }),
    { claimed: true, state: "sent" },
  )
  assert.equal(calls, 1)
})

test("the atomic claim enforces the attempt cap and automatic backoff for stale selections", async () => {
  await job("atomic-cap", { state: "failed", attempts: 8, age: "10 days" })
  await job("atomic-backoff", { state: "failed", attempts: 1, age: "1 second" })
  let calls = 0
  globalThis.fetch = async () => {
    calls++
    return Response.json({ id: "unexpected" })
  }
  assert.deepEqual(
    await deliverOrderEmail(db, "atomic-cap", "LT-atomic-cap", {
      allowUncertainRetry: true,
    }),
    { claimed: false },
  )
  assert.deepEqual(
    await deliverOrderEmail(db, "atomic-backoff", "LT-atomic-backoff", {
      automatic: true,
    }),
    { claimed: false },
  )
  assert.equal(calls, 0)
})
