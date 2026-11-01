import { after, before, test } from "node:test"
import assert from "node:assert/strict"
import { createServer } from "node:http"
import { randomUUID } from "node:crypto"

process.env.NODE_ENV = "test"
process.env.LOCAL_DATABASE_PATH = "memory://"
process.env.ADMIN_EMAIL = "audience-admin@example.com"
process.env.ADMIN_PASSWORD = "A-local-audience-password-49!"

const { default: handler } = await import("../server/handler.js")
const { getDatabase } = await import("../server/db.js")
const { recordVisit, visitorDay, audienceSummary } = await import(
  "../server/audience.js"
)
let server, origin, db, adminCookie, customerCookie
async function request(
  path,
  {
    method = "GET",
    body,
    cookie,
    originHeader,
    userAgent = "Audience test browser",
  } = {},
) {
  const response = await fetch(origin + "/api/" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: originHeader || origin,
      "User-Agent": userAgent,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  }
}
before(async () => {
  server = createServer(handler)
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  origin = "http://127.0.0.1:" + server.address().port
  db = await getDatabase()
  adminCookie = (
    await request("auth/login", {
      method: "POST",
      body: {
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      },
    })
  ).cookie
  customerCookie = (
    await request("auth/register", {
      method: "POST",
      body: {
        name: "Audience customer",
        email: "audience-customer@example.com",
        password: "A-local-customer-password-28!",
      },
    })
  ).cookie
})
after(async () => {
  await new Promise((resolve) => server.close(resolve))
  await db.close()
})

test("visitor counting deduplicates concurrent browser visits by Kampala calendar day without retaining identifiers", async () => {
  assert.equal(visitorDay("2026-10-31T20:59:59Z"), "2026-10-31")
  assert.equal(visitorDay("2026-10-31T21:00:00Z"), "2026-11-01")
  const id = randomUUID()
  const concurrent = await Promise.all(
    Array.from({ length: 5 }, () =>
      recordVisit(db, id, new Date("2026-11-01T00:00:00Z")),
    ),
  )
  assert.equal(concurrent.filter(Boolean).length, 1)
  assert.equal(
    await recordVisit(db, id, new Date("2026-11-01T20:59:00Z")),
    false,
  )
  assert.equal(
    await recordVisit(db, id, new Date("2026-11-01T21:00:00Z")),
    true,
  )
  const rows = (await db.query("SELECT * FROM audience_visitors ORDER BY day"))
    .rows
  assert.equal(rows.length, 2)
  assert.notEqual(rows[0].visitor_hash, rows[1].visitor_hash)
  assert.ok(!JSON.stringify(rows).includes(id))
  assert.deepEqual(Object.keys(rows[0]).sort(), ["day", "visitor_hash"])
  await recordVisit(db, randomUUID(), new Date("2026-12-15T00:00:00Z"))
  assert.equal(
    (await db.query("SELECT * FROM audience_visitors")).rows.length,
    1,
  )
  assert.equal(
    Number(
      (await db.query("SELECT SUM(visitors) AS count FROM audience_daily"))
        .rows[0].count,
    ),
    3,
  )
})

test("the measured summary keeps pre-tracking days unknown and returns real day totals", async () => {
  await db.query(
    "UPDATE audience_meta SET started_at='2026-10-31T00:00:00Z' WHERE id='traffic'",
  )
  const { analytics } = await audienceSummary(
    db,
    new Date("2026-11-01T12:00:00Z"),
  )
  assert.equal(analytics.available, true)
  assert.equal(analytics.timeZone, "Africa/Kampala")
  assert.equal(analytics.today, 1)
  assert.equal(analytics.yesterday, 0)
  assert.equal(analytics.daily.length, 30)
  assert.equal(analytics.daily[0].visitors, null)
  assert.equal(analytics.daily.at(-1).date, "2026-11-01")
  assert.ok(!JSON.stringify(analytics).includes("visitor_hash"))
  await db.query("TRUNCATE audience_daily,audience_visitors")
})

test("the public collector rejects foreign writes and malformed IDs, ignores bots and administrators, and keeps overview private", async () => {
  const visitorId = randomUUID()
  assert.equal(
    (
      await request("analytics/visit", {
        method: "POST",
        body: { visitorId },
        originHeader: "https://outsider.example",
      })
    ).status,
    403,
  )
  assert.equal(
    (
      await request("analytics/visit", {
        method: "POST",
        body: { visitorId: "email@example.com" },
      })
    ).status,
    400,
  )
  assert.equal(
    (
      await request("analytics/visit", {
        method: "POST",
        body: { visitorId },
        userAgent: "Googlebot/2.1",
      })
    ).data.recorded,
    false,
  )
  assert.equal(
    (
      await request("analytics/visit", {
        method: "POST",
        body: { visitorId },
        cookie: adminCookie,
      })
    ).data.recorded,
    false,
  )
  assert.equal(
    (await request("analytics/visit", { method: "POST", body: { visitorId } }))
      .data.recorded,
    true,
  )
  assert.equal(
    (await request("analytics/visit", { method: "POST", body: { visitorId } }))
      .data.recorded,
    false,
  )
  assert.equal((await request("admin/overview")).status, 401)
  assert.equal(
    (await request("admin/overview", { cookie: customerCookie })).status,
    403,
  )
  const overview = await request("admin/overview", { cookie: adminCookie })
  assert.equal(overview.status, 200)
  assert.equal(overview.data.analytics.today, 1)
})

test("newsletter consent persists once, protects management tokens and supports idempotent unsubscribe and renewed consent", async () => {
  assert.equal(
    (
      await request("newsletter/subscribe", {
        method: "POST",
        body: { email: "subscriber@example.com" },
      })
    ).status,
    400,
  )
  assert.equal(
    (
      await request("newsletter/subscribe", {
        method: "POST",
        body: { email: "bad", consent: true },
      })
    ).status,
    400,
  )
  assert.equal(
    (
      await request("newsletter/subscribe", {
        method: "POST",
        body: { email: "subscriber@example.com", consent: true },
        originHeader: "https://outsider.example",
      })
    ).status,
    403,
  )
  const first = await request("newsletter/subscribe", {
    method: "POST",
    body: { email: "Subscriber@Example.com", consent: true },
  })
  assert.equal(first.status, 200)
  assert.equal(first.data.subscribed, true)
  const token = new URL(first.data.unsubscribeUrl, origin).searchParams.get(
    "token",
  )
  assert.match(token, /^[a-f0-9]{64}$/)
  const again = await request("newsletter/subscribe", {
    method: "POST",
    body: { email: "subscriber@example.com", consent: true },
  })
  assert.equal(again.data.subscribed, true)
  assert.equal(again.data.unsubscribeUrl, undefined)
  const saved = (
    await db.query(
      "SELECT * FROM newsletter_subscribers WHERE email='subscriber@example.com'",
    )
  ).rows[0]
  assert.equal(saved.status, "active")
  assert.equal(saved.consent_version, "newsletter-v1")
  assert.ok(saved.consented_at)
  assert.notEqual(saved.token_hash, token)
  assert.equal((await request("admin/subscribers")).status, 401)
  assert.equal(
    (await request("admin/subscribers", { cookie: customerCookie })).status,
    403,
  )
  const subscribers = await request("admin/subscribers", {
    cookie: adminCookie,
  })
  assert.equal(subscribers.data.total, 1)
  assert.equal(subscribers.data.subscribers[0].email, "subscriber@example.com")
  assert.ok(!JSON.stringify(subscribers.data).includes("token"))
  assert.equal(
    (
      await request("newsletter/unsubscribe", {
        method: "POST",
        body: { token },
      })
    ).data.unsubscribed,
    true,
  )
  assert.equal(
    (
      await request("newsletter/unsubscribe", {
        method: "POST",
        body: { token },
      })
    ).data.unsubscribed,
    true,
  )
  assert.equal(
    (
      await request("newsletter/unsubscribe", {
        method: "POST",
        body: { token: "a".repeat(64) },
      })
    ).status,
    404,
  )
  const renewed = await request("newsletter/subscribe", {
    method: "POST",
    body: { email: "subscriber@example.com", consent: true },
  })
  assert.notEqual(renewed.data.unsubscribeUrl, first.data.unsubscribeUrl)
  assert.equal(
    (
      await request("newsletter/unsubscribe", {
        method: "POST",
        body: { token },
      })
    ).status,
    404,
  )
  assert.equal(
    (await request("admin/overview", { cookie: adminCookie })).data
      .subscriberCount,
    1,
  )
})

test("social settings accept platform profile URLs and reject lookalike, credential and script URLs", async () => {
  const current = (await request("admin/overview", { cookie: adminCookie }))
    .data.settings
  const socials = {
    facebook: "https://www.facebook.com/londontech",
    x: "https://x.com/londontech",
    tiktok: "https://www.tiktok.com/@londontech",
    instagram: "https://www.instagram.com/londontech/",
    snapchat: "https://www.snapchat.com/add/londontech",
  }
  const updated = await request("admin/settings", {
    method: "PUT",
    cookie: adminCookie,
    body: { ...current, socials },
  })
  assert.equal(updated.status, 200)
  for (const value of [
    "javascript:alert(1)",
    "https://facebook.com.attacker.example/name",
    "https://user:password@facebook.com/name",
    "http://facebook.com/name",
  ]) {
    assert.equal(
      (
        await request("admin/settings", {
          method: "PUT",
          cookie: adminCookie,
          body: { ...current, socials: { ...socials, facebook: value } },
        })
      ).status,
      400,
    )
  }
  const legacy = await request("admin/settings", {
    method: "PUT",
    cookie: adminCookie,
    body: { ...current, socials: undefined },
  })
  assert.equal(legacy.data.settings.socials.tiktok, socials.tiktok)
})

test("unconfigured production exposes honest unavailable states without creating local customer data", async () => {
  process.env.NODE_ENV = "production"
  process.env.PUBLIC_SITE_URL = origin
  try {
    const config = await request("config")
    assert.equal(config.data.newsletter, false)
    assert.equal(config.data.analytics, false)
    const traffic = await request("analytics/visit", {
      method: "POST",
      body: { visitorId: randomUUID() },
    })
    assert.equal(traffic.status, 202)
    assert.deepEqual(traffic.data, { available: false, recorded: false })
    assert.equal(
      (
        await request("newsletter/subscribe", {
          method: "POST",
          body: { email: "later@example.com", consent: true },
        })
      ).status,
      503,
    )
    assert.equal(
      (
        await db.query(
          "SELECT id FROM newsletter_subscribers WHERE email='later@example.com'",
        )
      ).rows.length,
      0,
    )
  } finally {
    process.env.NODE_ENV = "test"
    delete process.env.PUBLIC_SITE_URL
  }
})
