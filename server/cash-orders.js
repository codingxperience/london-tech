import { randomBytes } from "node:crypto"
import { fail, audit } from "./security.js"

export async function restoreCashInventory(tx, row) {
  if (
    row.details.paymentMethod !== "cod" ||
    !row.details.inventoryCommitted ||
    row.status === "cancelled"
  )
    return row.details
  const quantities = new Map()
  for (const item of row.details.items)
    quantities.set(item.id, (quantities.get(item.id) || 0) + item.quantity)
  for (const [id, quantity] of [...quantities].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const p = (
      await tx.query("SELECT data FROM products WHERE id=$1 FOR UPDATE", [id])
    ).rows[0]?.data
    if (!p || p.stock == null)
      fail(409, "Inventory must be reviewed before cancelling this order.")
    await tx.query(
      "UPDATE products SET data=$2::jsonb,updated_at=NOW() WHERE id=$1",
      [id, JSON.stringify({ ...p, stock: p.stock + quantity })],
    )
  }
  return { ...row.details, inventoryCommitted: false }
}
export async function collectCash(db, id, user) {
  return db.transaction(async (tx) => {
    const row = (
      await tx.query("SELECT * FROM orders WHERE id=$1 FOR UPDATE", [id])
    ).rows[0]
    if (!row) fail(404, "Order was not found.")
    if (row.details.paymentMethod !== "cod")
      fail(409, "Online payments must be verified by the payment provider.")
    if (row.payment_status === "paid") return row
    if (!["confirmed", "processing", "ready", "shipped"].includes(row.status))
      fail(409, "Cash cannot be recorded for this order status.")
    const at = new Date().toISOString(),
      receipt = "CASH-" + randomBytes(5).toString("hex").toUpperCase()
    const details = {
      ...row.details,
      cashReceipt: { receipt, amount: Number(row.amount), receivedAt: at },
      timeline: [
        ...(row.details.timeline || []),
        {
          status: row.status,
          at,
          note: "Cash payment received. Receipt " + receipt + ".",
        },
      ],
    }
    await tx.query(
      "UPDATE orders SET payment_status='paid',details=$2::jsonb,updated_at=NOW() WHERE id=$1",
      [id, JSON.stringify(details)],
    )
    await tx.query(
      "UPDATE checkout_attempts SET state='completed',updated_at=NOW() WHERE order_id=$1",
      [id],
    )
    await audit(tx, user.id, "payment.cash_received", {
      orderId: id,
      amount: Number(row.amount),
      receipt,
    })
    return (await tx.query("SELECT * FROM orders WHERE id=$1", [id])).rows[0]
  })
}
