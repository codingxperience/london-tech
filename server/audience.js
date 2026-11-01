import { randomBytes, randomUUID } from "node:crypto"
import { z } from "zod"
import { email, fail, hash, rateLimit, requireAdmin } from "./security.js"

const dayLength = 86400000
export const visitorDay = (value = new Date()) =>
  new Date(new Date(value).getTime() + 3 * 3600000).toISOString().slice(0, 10)
const bot =
  /bot\b|crawler|spider|slurp|headless|facebookexternalhit|preview|monitor|uptime|lighthouse/i
const tokenSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, "This subscription link is invalid.")

// The browser supplies a random identifier, never an email, IP or fingerprint.
// Including the calendar day prevents linking stored hashes across days.
export async function recordVisit(db, visitorId, now = new Date()) {
  const day = visitorDay(now)
  const visitorHash = hash(day + ":" + visitorId)
  return db.transaction(async (tx) => {
    await tx.query(
      "DELETE FROM audience_visitors WHERE day < $1::date - INTERVAL '35 days'",
      [day],
    )
    const inserted = await tx.query(
      "INSERT INTO audience_visitors(day,visitor_hash) VALUES($1::date,$2) ON CONFLICT(day,visitor_hash) DO NOTHING RETURNING day",
      [day, visitorHash],
    )
    if (!inserted.rows.length) return false
    await tx.query(
      "INSERT INTO audience_daily(day,visitors) VALUES($1::date,1) ON CONFLICT(day) DO UPDATE SET visitors=audience_daily.visitors+1",
      [day],
    )
    return true
  })
}

export async function audienceSummary(db, now = new Date()) {
  const today = visitorDay(now)
  await db.query(
    "DELETE FROM audience_visitors WHERE day < $1::date - INTERVAL '35 days'",
    [today],
  )
  const [counts, meta, subscribers] = await Promise.all([
    db.query(
      "SELECT to_char(day,'YYYY-MM-DD') AS day,visitors FROM audience_daily WHERE day BETWEEN $1::date - INTERVAL '29 days' AND $1::date ORDER BY day",
      [today],
    ),
    db.query("SELECT started_at FROM audience_meta WHERE id='traffic'"),
    db.query(
      "SELECT COUNT(*)::int AS count FROM newsletter_subscribers WHERE status='active'",
    ),
  ])
  const startedAt = meta.rows[0]?.started_at
  const firstDay = startedAt ? visitorDay(startedAt) : today
  const byDay = new Map(counts.rows.map((r) => [r.day, Number(r.visitors)]))
  const daily = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(
      new Date(today + "T12:00:00Z").getTime() - (29 - i) * dayLength,
    )
      .toISOString()
      .slice(0, 10)
    return { date, visitors: date < firstDay ? null : byDay.get(date) || 0 }
  })
  return {
    analytics: {
      available: true,
      today: daily.at(-1).visitors,
      yesterday: daily.at(-2).visitors,
      daily,
      startedAt,
      timeZone: "Africa/Kampala",
    },
    subscriberCount: Number(subscribers.rows[0].count),
  }
}

export async function audienceRoute({
  route,
  method,
  body,
  db,
  user,
  ip,
  userAgent = "",
}) {
  if (route === "analytics/visit" && method === "POST") {
    const { visitorId } = z.object({ visitorId: z.string().uuid() }).parse(body)
    if (user?.role === "admin" || bot.test(userAgent))
      return { body: { available: true, recorded: false } }
    await rateLimit(db, "audience-visit:" + ip, 200, 60)
    return {
      body: { available: true, recorded: await recordVisit(db, visitorId) },
    }
  }
  if (route === "newsletter/subscribe" && method === "POST") {
    const input = z
      .object({
        email,
        consent: z.literal(true, {
          error: "Please agree to receive store updates.",
        }),
      })
      .parse(body)
    await rateLimit(db, "newsletter-subscribe:" + ip, 10, 60)
    await rateLimit(db, "newsletter-email:" + input.email, 5, 60)
    const token = randomBytes(32).toString("hex")
    const changed = await db.query(
      `INSERT INTO newsletter_subscribers(id,email,token_hash,status,consent_version)
       VALUES($1,$2,$3,'active','newsletter-v1')
       ON CONFLICT(email) DO UPDATE SET status='active',token_hash=EXCLUDED.token_hash,
       consented_at=NOW(),unsubscribed_at=NULL,updated_at=NOW(),consent_version=EXCLUDED.consent_version
       WHERE newsletter_subscribers.status='unsubscribed' RETURNING id`,
      [randomUUID(), input.email, hash(token)],
    )
    // Only a newly created/re-activated subscription gets its management token.
    // Repeating a subscription never exposes an existing subscriber's token.
    return {
      body: {
        subscribed: true,
        message: "You’re subscribed to London Tech updates.",
        ...(changed.rows.length
          ? { unsubscribeUrl: "/unsubscribe/?token=" + token }
          : {}),
      },
    }
  }
  if (route === "newsletter/unsubscribe" && method === "POST") {
    const token = tokenSchema.parse(body.token)
    await rateLimit(db, "newsletter-unsubscribe:" + ip, 30, 60)
    const changed = await db.query(
      "UPDATE newsletter_subscribers SET status='unsubscribed',unsubscribed_at=COALESCE(unsubscribed_at,NOW()),updated_at=NOW() WHERE token_hash=$1 RETURNING id",
      [hash(token)],
    )
    if (!changed.rows.length)
      fail(404, "This subscription link is invalid or has been replaced.")
    return { body: { unsubscribed: true } }
  }
  if (route === "admin/subscribers" && method === "GET") {
    requireAdmin(user)
    const subscribers = await db.query(
      "SELECT id,email,status,consented_at AS subscribed_at,unsubscribed_at,consent_version FROM newsletter_subscribers ORDER BY consented_at DESC LIMIT 5000",
    )
    const total = await db.query(
      "SELECT COUNT(*)::int AS count FROM newsletter_subscribers",
    )
    return {
      body: {
        subscribers: subscribers.rows.map((r) => ({
          id: r.id,
          email: r.email,
          status: r.status,
          subscribedAt: r.subscribed_at,
          unsubscribedAt: r.unsubscribed_at,
          consentVersion: r.consent_version,
        })),
        total: Number(total.rows[0].count),
      },
    }
  }
  return null
}
