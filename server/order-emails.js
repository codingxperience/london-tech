import { money } from "../src/data/catalog.js"

export const orderEmailReady = () =>
  Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)

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
    title: details.paymentMode === "test" ? "Test order · " + title : title,
    test: details.paymentMode === "test",
    amount: order.amount == null ? null : Number(order.amount),
    payment: order.payment_status,
    fulfillment: details.fulfillment,
    receipt: details.cashReceipt?.receipt,
  }
  await tx.query(
    `INSERT INTO order_emails(id,order_id,payload) VALUES($1,$2,$3::jsonb) ON CONFLICT(id) DO NOTHING`,
    [id, order.id, JSON.stringify(payload)],
  )
  return id
}

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  )

export async function deliverOrderEmail(db, id, orderId) {
  if (!id || !orderEmailReady()) return
  try {
    // Claim outside the order transaction so a mail provider outage cannot undo an order.
    const {
      rows: [job],
    } = await db.query(
      `UPDATE order_emails SET state='sending',attempts=attempts+1,updated_at=NOW() WHERE id=$1 AND order_id=$2 AND (state IN ('pending','failed') OR (state='sending' AND updated_at<NOW()-INTERVAL '2 minutes')) RETURNING *`,
      [id, orderId],
    )
    if (!job) return
    const p = job.payload
    const origin = new URL(
      process.env.PUBLIC_SITE_URL || "https://london-tech.vercel.app",
    ).origin
    const url = `${origin}/account/orders/${encodeURIComponent(job.order_id)}/`
    const lines = [
      `Order ${job.order_id}`,
      p.test
        ? "This order uses a simulated payment. No money was collected."
        : "",
      p.amount == null ? "" : `Total ${money(p.amount)}`,
      p.payment === "cash_due" && !/cancelled/i.test(p.title)
        ? `Pay in cash ${
            p.fulfillment === "delivery" ? "on delivery" : "at pickup"
          }.`
        : "",
      p.receipt ? `Cash receipt ${p.receipt}` : "",
    ].filter(Boolean)
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(4000),
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `london-tech/${job.id}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [p.to],
        subject: `${p.title} · ${job.order_id}`,
        text: `${p.title}\n\n${lines.join("\n")}\n\nView your order: ${url}\n\nLondon Tech`,
        html: `<div style="background:#f1f4f8;padding:28px 14px;font-family:Arial,sans-serif;color:#102943"><div style="max-width:520px;margin:auto;background:#fff;border:1px solid #dfe7f1;border-radius:14px;padding:28px"><p style="font-weight:bold;letter-spacing:.1em;color:#b71d35">LONDON TECH</p><h1 style="font-size:26px">${escapeHtml(p.title)}</h1>${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}<p style="margin-top:28px"><a style="display:inline-block;background:#102943;color:#fff;padding:12px 20px;border-radius:7px;text-decoration:none" href="${escapeHtml(url)}">View order</a></p></div></div>`,
      }),
    })
    const result = await response.json().catch(() => ({}))
    await db.query(
      `UPDATE order_emails SET state=$2,provider_id=$3,updated_at=NOW() WHERE id=$1 AND attempts=$4`,
      [
        id,
        response.ok && result.id ? "sent" : "failed",
        response.ok ? result.id || null : null,
        job.attempts,
      ],
    )
  } catch (error) {
    // Release a claimed job only through its lease if the delivery result is uncertain.
    console.error(
      "Order email could not be confirmed",
      error.code || error.name,
    )
  }
}

export async function listOrderEmails(db, orderId) {
  const { rows } = await db.query(
    `SELECT id,payload->>'title' AS title,CASE WHEN state='sending' AND updated_at<NOW()-INTERVAL '2 minutes' THEN 'failed' ELSE state END AS state,attempts,created_at AS "createdAt" FROM order_emails WHERE order_id=$1 ORDER BY created_at DESC LIMIT 30`,
    [orderId],
  )
  return rows
}
