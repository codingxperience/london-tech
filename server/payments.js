import { randomUUID } from "node:crypto"

import { fail } from "./security.js"

export async function flutterwave(path, options = {}) {
  if (!process.env.FLW_SECRET_KEY)
    fail(503, "Online payments are being connected. Your cart has been saved.")

  const response = await fetch("https://api.flutterwave.com/v3" + path, {
    ...options,
    signal: AbortSignal.timeout(15000),

    headers: {
      Authorization: "Bearer " + process.env.FLW_SECRET_KEY,
      "Content-Type": "application/json",
    },
  })

  const body = await response.json()

  if (!response.ok || body.status !== "success")
    fail(
      502,
      "The payment provider could not complete this request. Please try again.",
    )

  return body.data
}

export function matchesPayment(order, payment) {
  return (
    payment.status === "successful" &&
    payment.tx_ref === order.id &&
    payment.currency === order.currency &&
    Number(payment.amount) >= Number(order.amount) &&
    Number(order.amount) > 0
  )
}

export async function createPaymentLink(order, origin) {
  const data = await flutterwave("/payments", {
    method: "POST",
    body: JSON.stringify({
      tx_ref: order.id,
      amount: Number(order.amount),
      currency: "UGX",

      redirect_url:
        origin + "/checkout/result/?order=" + encodeURIComponent(order.id),

      payment_options:
        order.details.paymentMethod === "visa" ? "card" : "mobilemoneyuganda",

      customer: {
        email: order.details.customer.email,
        name: order.details.customer.name,
        phonenumber: order.details.customer.phone,
      },

      customizations: {
        title: "London Tech",
        description: "Order " + order.id,
        logo: origin + "/assets/london-tech-logo.png",
      },

      meta: {
        order_id: order.id,
        requested_method: order.details.paymentMethod,
      },
    }),
  })

  let paymentUrl

  try {
    paymentUrl = new URL(data.link)
  } catch {
    fail(502, "The payment provider returned an invalid checkout link.")
  }

  if (
    paymentUrl.protocol !== "https:" ||
    !/(^|\.)flutterwave\.com$/.test(paymentUrl.hostname)
  )
    fail(502, "The payment provider returned an unexpected checkout link.")

  return paymentUrl.href
}

export async function verifyPayment(db, transactionId, expectedOrderId) {
  if (!/^\d+$/.test(String(transactionId)))
    fail(400, "A valid transaction reference is required.")

  const payment = await flutterwave(
    "/transactions/" + transactionId + "/verify",
  )

  if (expectedOrderId && payment.tx_ref !== expectedOrderId)
    fail(409, "The payment reference does not match this order.")

  return db.transaction(async (tx) => {
    const order = (
      await tx.query("SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
        payment.tx_ref,
      ])
    ).rows[0]

    if (!order) fail(404, "Order was not found.")

    if (order.payment_status === "paid") return order

    if (!matchesPayment(order, payment))
      fail(409, "Payment is not confirmed. You have not been marked as paid.")

    let needsReview = ["cancelled", "expired"].includes(order.status)

    for (const line of [...order.details.items].sort((a, b) =>
      a.id.localeCompare(b.id),
    )) {
      const row = (
        await tx.query("SELECT data FROM products WHERE id=$1 FOR UPDATE", [
          line.id,
        ])
      ).rows[0]

      if (!row || row.data.stock == null || row.data.stock < line.quantity) {
        needsReview = true
        continue
      }

      const updated = { ...row.data, stock: row.data.stock - line.quantity }

      await tx.query(
        "UPDATE products SET data=$2::jsonb,updated_at=NOW() WHERE id=$1",
        [line.id, JSON.stringify(updated)],
      )
    }

    const status = needsReview ? "review" : "confirmed"

    const details = {
      ...order.details,
      timeline: [
        ...(order.details.timeline || []),
        {
          status,
          at: new Date().toISOString(),
          note: "Payment verified with Flutterwave.",
        },
      ],
    }

    await tx.query(
      `UPDATE orders SET payment_status='paid',status=$2,transaction_id=$3,details=$4::jsonb,updated_at=NOW() WHERE id=$1`,
      [order.id, status, String(payment.id), JSON.stringify(details)],
    )

    await tx.query("DELETE FROM stock_reservations WHERE order_id=$1", [
      order.id,
    ])

    await tx.query(
      "INSERT INTO audit_events(id,action,details) VALUES($1,$2,$3::jsonb)",
      [
        randomUUID(),
        "payment.verified",
        JSON.stringify({ orderId: order.id, transactionId: payment.id }),
      ],
    )

    return (await tx.query("SELECT * FROM orders WHERE id=$1", [order.id]))
      .rows[0]
  })
}
