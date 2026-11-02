import { z } from "zod"
import {
  requireUser,
  requireAdmin,
  rateLimit,
  fail,
  audit,
} from "./security.js"
import { calculateDelivery } from "../src/lib/delivery.js"

const snapshotSchema = z.object({
  id: z.string().uuid(),
  items: z
    .array(
      z.object({
        id: z.string().max(100),
        quantity: z.number().int().min(1).max(10),
      }),
    )
    .min(1)
    .max(30),
  paymentMethod: z.enum(["mtn", "airtel", "visa", "cod"]),
  fulfillment: z.enum(["collection", "delivery"]),
  phone: z.string().trim().max(25).default(""),
  district: z.string().trim().max(100).default(""),
})
export function publicAttempt(row, now = Date.now()) {
  const stale =
    ["started", "awaiting_payment"].includes(row.state) &&
    now - new Date(row.updated_at).getTime() > 30 * 60 * 1000
  return {
    id: row.id,
    state: stale ? "abandoned" : row.state,
    ...row.details,
    orderId: row.order_id,
    followUpStatus: row.follow_up_status,
    note: row.follow_up_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
export async function updateAttempt(
  db,
  userId,
  id,
  state,
  details = {},
  orderId = null,
) {
  if (!z.string().uuid().safeParse(id).success) return
  try {
    await db.query(
      `UPDATE checkout_attempts SET state=$3,details=details||$4::jsonb,order_id=COALESCE($5,order_id),updated_at=NOW() WHERE id=$1 AND user_id=$2`,
      [id, userId, state, JSON.stringify(details), orderId],
    )
  } catch (error) {
    console.error("Checkout tracking unavailable", error.code || error.name)
  }
}
export async function checkoutRoute({
  route,
  method,
  body,
  db,
  user,
  settings,
}) {
  if (route === "checkout/attempts" && method === "POST") {
    requireUser(user)
    await rateLimit(db, "checkout-track:" + user.id, 120, 15)
    const input = snapshotSchema.parse(body)
    const rows = await db.query(
      `SELECT data FROM products WHERE id=ANY($1::text[])`,
      [input.items.map((i) => i.id)],
    )
    const catalog = new Map(rows.rows.map((r) => [r.data.id, r.data]))
    const items = input.items.map((i) => {
      const p = catalog.get(i.id)
      return {
        id: i.id,
        name: p?.name || "Unavailable product",
        quantity: i.quantity,
        unitPrice: p?.price ?? null,
        image: p?.image || "",
      }
    })
    const subtotal = items.every((i) => i.unitPrice != null)
      ? items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
      : null
    const delivery =
      input.fulfillment === "collection"
        ? { fee: 0 }
        : calculateDelivery(settings, input.district)
    const details = {
      customer: {
        name: user.name,
        email: user.email,
        phone: input.phone || user.phone || "",
      },
      items,
      paymentMethod: input.paymentMethod,
      fulfillment: input.fulfillment,
      district: input.district,
      subtotal,
      deliveryFee: delivery.fee,
      amount:
        subtotal != null && delivery.fee != null
          ? subtotal + delivery.fee
          : null,
    }
    const existing = (
      await db.query("SELECT user_id FROM checkout_attempts WHERE id=$1", [
        input.id,
      ])
    ).rows[0]
    if (existing && existing.user_id !== user.id)
      fail(404, "Checkout was not found.")
    await db.query(
      `INSERT INTO checkout_attempts(id,user_id,state,details) VALUES($1,$2,'started',$3::jsonb) ON CONFLICT(id) DO UPDATE SET details=CASE WHEN checkout_attempts.order_id IS NULL THEN checkout_attempts.details||EXCLUDED.details ELSE checkout_attempts.details END,updated_at=CASE WHEN checkout_attempts.order_id IS NULL THEN NOW() ELSE checkout_attempts.updated_at END WHERE checkout_attempts.user_id=$2`,
      [input.id, user.id, JSON.stringify(details)],
    )
    return { body: { saved: true } }
  }
  const followUp = route.match(/^admin\/checkouts\/([a-f0-9-]+)$/)
  if (followUp && method === "PATCH") {
    requireAdmin(user)
    const input = z
      .object({
        status: z.enum(["open", "contacted", "closed"]),
        note: z.string().trim().max(2000).default(""),
      })
      .parse(body)
    const result = await db.query(
      `UPDATE checkout_attempts SET follow_up_status=$2,follow_up_note=$3 WHERE id=$1 RETURNING id`,
      [followUp[1], input.status, input.note],
    )
    if (!result.rows.length) fail(404, "Checkout was not found.")
    await audit(db, user.id, "checkout.follow_up", {
      id: followUp[1],
      status: input.status,
    })
    return { body: { saved: true } }
  }
  return null
}
export async function checkoutSummary(db) {
  return (
    await db.query(
      "SELECT * FROM checkout_attempts ORDER BY updated_at DESC LIMIT 500",
    )
  ).rows.map((r) => publicAttempt(r))
}
