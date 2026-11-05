import { emailProvider, emailReady, sendEmail } from "./email.js"
import { orderEmail } from "./email-templates.js"

export const orderEmailReady = emailReady

export function orderUpdateTitle(status, fulfillment) {
  if (status === "ready")
    return fulfillment === "collection"
      ? "Ready for pickup"
      : "Ready for dispatch"
  if (status === "completed")
    return fulfillment === "collection" ? "Order collected" : "Order delivered"
  return (
    {
      confirmed: "Order confirmed",
      processing: "Order being prepared",
      shipped: "Order dispatched",
      cancelled: "Order cancelled",
      review: "Order under review",
      quoted: "Quote ready",
    }[status] || "Order updated"
  )
}

export async function queueOrderEmail(tx, order, event, title) {
  const id = `${order.id}-${event}`
  const details = order.details
  const payload = {
    to: details.customer.email,
    name: details.customer.name,
    title: details.paymentMode === "test" ? "Test order · " + title : title,
    test: details.paymentMode === "test",
    status: order.status,
    amount: order.amount == null ? null : Number(order.amount),
    subtotal: details.subtotal,
    deliveryFee: details.deliveryFee,
    payment: order.payment_status,
    fulfillment: details.fulfillment,
    items: details.items,
    district: details.customer.district,
    address: {
      district: details.customer.district,
      address: details.customer.address,
    },
    tracking: details.tracking,
    receipt: details.cashReceipt?.receipt,
  }
  // Store the rendered message with the event. Retries must use the same
  // contents even after a product, order, or email template changes.
  payload.message = orderEmail({ orderId: order.id, payload })
  await tx.query(
    `INSERT INTO order_emails(id,order_id,payload) VALUES($1,$2,$3::jsonb) ON CONFLICT(id) DO NOTHING`,
    [id, order.id, JSON.stringify(payload)],
  )
  return id
}

export async function deliverOrderEmail(
  db,
  id,
  orderId,
  { allowUncertainRetry = false, automatic = false } = {},
) {
  if (!id || !orderEmailReady()) return { claimed: false }
  const provider = emailProvider()
  let job
  try {
    // Claim outside the order transaction so a mail provider outage cannot undo an order.
    const { rows } = await db.query(
      `UPDATE order_emails SET state='sending',attempts=attempts+1,payload=jsonb_set(payload,'{deliveryProvider}',to_jsonb($3::text)),updated_at=NOW()
       WHERE id=$1 AND order_id=$2 AND attempts<8
         AND (NOT $5::boolean OR attempts=0 OR updated_at<=NOW()-LEAST(60.0,POWER(2.0,GREATEST(attempts-1,0)))*INTERVAL '1 minute')
         AND (state IN ('pending','failed') OR (state='uncertain' AND $4::boolean) OR (state='sending' AND updated_at<NOW()-INTERVAL '2 minutes' AND ($4::boolean OR ($3='resend' AND payload->>'deliveryProvider'='resend' AND created_at>NOW()-INTERVAL '23 hours'))))
         AND ($4::boolean OR COALESCE(payload->>'deliveryUncertain','false')<>'true' OR ($3='resend' AND payload->>'deliveryProvider'='resend' AND created_at>NOW()-INTERVAL '23 hours'))
       RETURNING *`,
      [id, orderId, provider, allowUncertainRetry === true, automatic === true],
    )
    job = rows[0]
    if (!job) return { claimed: false }
    const p = job.payload
    const result = await sendEmail({
      to: p.to,
      ...(p.message || orderEmail({ orderId: job.order_id, payload: p })),
      idempotencyKey: `london-tech/${job.id}`,
    })
    await db.query(
      `UPDATE order_emails SET state=$2,provider_id=$3,updated_at=NOW() WHERE id=$1 AND attempts=$4`,
      [id, "sent", result.id, job.attempts],
    )
    return { claimed: true, state: "sent" }
  } catch (error) {
    const uncertain =
      error.deliveryUncertain !== false ||
      job?.payload?.deliveryUncertain === true
    if (job)
      await db
        .query(
          `UPDATE order_emails SET state=$3,payload=CASE WHEN $4 THEN jsonb_set(payload,'{deliveryUncertain}','true'::jsonb) ELSE payload END,updated_at=NOW() WHERE id=$1 AND state='sending' AND attempts=$2`,
          [
            id,
            job.attempts,
            uncertain
              ? provider === "gmail"
                ? "uncertain"
                : "sending"
              : "failed",
            uncertain,
          ],
        )
        .catch(() => {})
    // Keep an uncertain claim until its lease expires; a retry reuses the key.
    console.error(
      "Order email could not be confirmed",
      error.code || error.name,
    )
    return job
      ? {
          claimed: true,
          state: uncertain ? "uncertain" : "failed",
        }
      : { claimed: false }
  }
}

export async function listOrderEmails(db, orderId) {
  const { rows } = await db.query(
    `SELECT id,payload->>'title' AS title,COALESCE(payload->>'deliveryProvider',$2) AS provider,CASE WHEN state='sending' AND updated_at<NOW()-INTERVAL '2 minutes' THEN 'uncertain' ELSE state END AS state,attempts,created_at AS "createdAt" FROM order_emails WHERE order_id=$1 ORDER BY created_at DESC LIMIT 30`,
    [orderId, emailProvider()],
  )
  return rows
}
