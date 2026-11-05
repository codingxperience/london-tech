import { deliverOrderEmail, orderEmailReady } from "./order-emails.js"
import { emailProvider } from "./email.js"

// Bound each invocation to six messages, two concurrent provider requests and
// enough headroom for their eight-second timeout in a 30-second function.
export async function retryOrderEmails(db, { limit = 6 } = {}) {
  const counts = {
    selected: 0,
    attempted: 0,
    accepted: 0,
    failed: 0,
    uncertain: 0,
    deferred: 0,
  }
  if (!orderEmailReady()) return counts
  const requested = Number(limit)
  const batchLimit = Number.isFinite(requested)
    ? Math.max(1, Math.min(6, Math.trunc(requested)))
    : 6
  const deadline = Date.now() + 21000
  const provider = emailProvider()
  const { rows } = await db.query(
    `SELECT id,order_id FROM order_emails
     WHERE attempts<8
       AND (state IN ('pending','failed') OR (state='sending' AND $2='resend' AND payload->>'deliveryProvider'='resend'))
       AND (attempts=0 OR updated_at<=NOW()-LEAST(60.0,POWER(2.0,GREATEST(attempts-1,0)))*INTERVAL '1 minute')
       AND (state<>'sending' OR (updated_at<NOW()-INTERVAL '2 minutes' AND created_at>NOW()-INTERVAL '23 hours'))
       AND (COALESCE(payload->>'deliveryUncertain','false')<>'true' OR ($2='resend' AND payload->>'deliveryProvider'='resend' AND created_at>NOW()-INTERVAL '23 hours'))
     ORDER BY updated_at,created_at,id LIMIT $1`,
    [batchLimit, provider],
  )
  counts.selected = rows.length
  for (let start = 0; start < rows.length; start += 2) {
    if (Date.now() + 9000 > deadline) break
    await Promise.all(rows.slice(start, start + 2).map(async (job) => {
        const result = await deliverOrderEmail(db, job.id, job.order_id, {
          automatic: true,
        })
        if (!result?.claimed) return
        counts.attempted++
        if (result.state === "sent") counts.accepted++
        else if (result.state === "failed") counts.failed++
        else counts.uncertain++
      }))
  }
  counts.deferred = counts.selected - counts.attempted
  return counts
}
