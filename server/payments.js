import { createHmac, randomUUID } from "node:crypto"

import { fail, safeEqual } from "./security.js"
import { queueOrderEmail } from "./order-emails.js"

export const paymentMode = () =>
  process.env.FLW_SECRET_KEY?.includes("TEST") ? "test" : "live"

const sandboxBlocked = () =>
  paymentMode() === "test" &&
  (process.env.VERCEL_ENV === "production" ||
    (process.env.NODE_ENV === "production" &&
      process.env.VERCEL_ENV !== "preview"))

export const onlinePaymentsReady = () =>
  Boolean(
    process.env.FLW_SECRET_KEY &&
      !sandboxBlocked() &&
      (process.env.NODE_ENV !== "production" || process.env.FLW_SECRET_HASH),
  )

export async function flutterwave(path, options = {}) {
  if (!process.env.FLW_SECRET_KEY || sandboxBlocked())
    fail(503, "Online payments are being connected. Your cart has been saved.")
  return providerRequest(path, options)
}

async function providerRequest(path, options = {}) {
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
    order.details?.paymentMethod !== "cod" &&
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

  return hostedPaymentUrl(data?.link)
}

function hostedPaymentUrl(link) {
  let paymentUrl

  try {
    paymentUrl = new URL(link)
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

export const sandboxAmount = 10000
const sandboxPrefix = "LT-TEST-"
const sandboxReference = /^LT-TEST-[0-9a-f-]{36}$/
export const isSandboxReference = (value) =>
  typeof value === "string" && sandboxReference.test(value)

export function isPaymentTestOwner(user) {
  const ownerEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  return Boolean(
    ownerEmail && user?.role === "admin" && user.email === ownerEmail,
  )
}

export function paymentTestReady(user) {
  return (
    isPaymentTestOwner(user) &&
    Boolean(
      process.env.FLW_SECRET_HASH &&
        /^FLWSECK_TEST[-_]/.test(process.env.FLW_SECRET_KEY || ""),
    )
  )
}

function requirePaymentTest(user) {
  if (!isPaymentTestOwner(user))
    fail(403, "Only the store owner can run payment tests.")
  if (!paymentTestReady(user))
    fail(
      503,
      "A Flutterwave test secret and webhook hash are required for this demo.",
    )
}

const signTest = (user, reference, expires) =>
  createHmac("sha256", process.env.FLW_SECRET_HASH)
    .update(`${user.id}:${reference}:${expires}`)
    .digest("base64url")

export async function startPaymentTest(user, method, origin) {
  requirePaymentTest(user)
  const reference = sandboxPrefix + randomUUID()
  const expires = Date.now() + 45 * 60 * 1000
  const proof = `${reference}.${expires}.${signTest(user, reference, expires)}`
  const redirect = new URL("/admin/settings/", origin)
  redirect.searchParams.set("payment_test", proof)
  const data = await providerRequest("/payments", {
    method: "POST",
    body: JSON.stringify({
      tx_ref: reference,
      amount: sandboxAmount,
      currency: "UGX",
      redirect_url: redirect.href,
      payment_options: method === "visa" ? "card" : "mobilemoneyuganda",
      customer: {
        email: "checkout-demo@example.com",
        name: "London Tech Test Customer",
      },
      customizations: {
        title: "London Tech · Test Mode",
        description: "Sample checkout",
        logo: origin + "/assets/london-tech-logo.png",
      },
      meta: { sandbox: true, requested_method: method },
    }),
  })
  return { url: hostedPaymentUrl(data?.link) }
}

export async function verifyPaymentTest(user, proof, transactionId) {
  requirePaymentTest(user)
  const [reference, expires, signature, extra] = proof.split(".")
  if (
    extra !== undefined ||
    !isSandboxReference(reference) ||
    !/^\d{13}$/.test(expires || "") ||
    Number(expires) <= Date.now() ||
    !safeEqual(signature, signTest(user, reference, expires))
  )
    fail(400, "This test session is invalid or expired. Start another test.")
  const payment = await providerRequest(
    "/transactions/" + transactionId + "/verify",
  )
  if (
    payment?.tx_ref !== reference ||
    String(payment.id) !== transactionId ||
    payment.currency !== "UGX" ||
    (payment.status === "successful" &&
      Number(payment.amount) !== sandboxAmount)
  )
    fail(409, "Flutterwave returned details that do not match this test.")
  if (
    !["successful", "failed", "cancelled", "pending"].includes(payment.status)
  )
    fail(502, "Flutterwave returned an unknown test payment status.")
  return {
    status: payment.status,
    reference,
    amount: sandboxAmount,
    currency: "UGX",
  }
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
          kind: "payment",
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
      "UPDATE checkout_attempts SET state='completed',updated_at=NOW() WHERE order_id=$1",
      [order.id],
    )

    await tx.query(
      "INSERT INTO audit_events(id,action,details) VALUES($1,$2,$3::jsonb)",
      [
        randomUUID(),
        "payment.verified",
        JSON.stringify({ orderId: order.id, transactionId: payment.id }),
      ],
    )

    const updated = (
      await tx.query("SELECT * FROM orders WHERE id=$1", [order.id])
    ).rows[0]
    await queueOrderEmail(
      tx,
      updated,
      "payment",
      needsReview
        ? "Payment received · order under review"
        : "Payment confirmed",
    )
    return updated
  })
}
