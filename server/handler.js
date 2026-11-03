import { randomUUID, randomBytes } from "node:crypto"

import { z } from "zod"

import { products, storeDefaults } from "../src/data/catalog.js"

import { databaseConfigured, getDatabase } from "./db.js"

import {
  audit,
  checkOrigin,
  checkPassword,
  createSession,
  currentOrigin,
  email,
  fail,
  getUser,
  hash,
  hashPassword,
  password,
  rateLimit,
  readBody,
  requireAdmin,
  requireUser,
  safeEqual,
} from "./security.js"

import {
  createPaymentLink,
  isSandboxReference,
  onlinePaymentsReady,
  paymentMode,
  verifyPayment,
} from "./payments.js"
import { calculateDelivery } from "../src/lib/delivery.js"
import {
  checkoutRoute,
  checkoutSummary,
  updateAttempt,
} from "./checkout-attempts.js"
import { restoreCashInventory, collectCash } from "./cash-orders.js"
import {
  deliverOrderEmail,
  listOrderEmails,
  orderEmailReady,
  orderUpdateTitle,
  queueOrderEmail,
} from "./order-emails.js"
import { audienceRoute, audienceSummary } from "./audience.js"
import {
  workspaceRoute,
  workspaceSummary,
  publishedPages,
} from "./workspace.js"

const text = (max = 200) => z.string().trim().max(max)

const trackingSchema = z.object({
  carrier: text(80).default(""),
  reference: text(100).default(""),
  estimatedDate: z.union([z.iso.date(), z.literal("")]).default(""),
  url: z
    .union([
      z.literal(""),
      z
        .url({ protocol: /^https$/ })
        .max(500)
        .refine((value) => {
          const url = new URL(value)
          return !url.username && !url.password
        }),
    ])
    .default(""),
})

const addressSchema = z.object({
  id: text(80).optional(),
  label: text(60).default("Home"),
  name: text(100).min(2),
  phone: text(25).min(9),
  district: text(100).min(2),
  address: text(400).min(5),
})

const itemsSchema = z
  .array(
    z.object({
      id: text(100).min(1),
      quantity: z.number().int().min(1).max(10),
      option: text(100).default(""),
      color: text(100).default(""),
    }),
  )
  .min(1)
  .max(30)

const customerSchema = z.object({
  name: text(100).min(2),
  email,
  phone: text(25).regex(/^\+?[0-9\s()-]{9,25}$/, "Enter a valid phone number."),
  district: text(100).default(""),
  address: text(400).default(""),
})

const orderSchema = z.object({
  items: itemsSchema,
  customer: customerSchema,
  fulfillment: z.enum(["delivery", "collection"]),
  paymentMethod: z.enum(["mtn", "airtel", "visa", "cod"]).default("mtn"),
  attemptId: z.string().uuid().optional(),
  expectedTotal: z.number().int().min(100).max(2000000000).optional(),
  notes: text(1000).default(""),
  key: z.string().uuid(),
  enquiry: z.boolean().default(false),
})

const productSchema = z
  .object({
    id: text(100).regex(/^[a-z0-9-]+$/),
    name: text(180).min(2),
    category: text(60).min(1),
    brand: text(80),
    vendorId: text(100).default(""),
    sku: text(80).min(1),

    description: text(5000).min(10),
    image: text(1000),
    gallery: z.array(text(1000)).min(1).max(10),
    mediaNote: text(500).default(""),

    specifications: z.array(z.tuple([text(100), text(500)])).max(40),

    price: z.number().int().min(100).max(2000000000).nullable(),
    priceConfirmed: z.boolean().default(false),
    comparePrice: z.number().int().min(100).max(2000000000).nullable(),

    stock: z.number().int().min(0).max(100000).nullable(),
    active: z.boolean(),
    featured: z.boolean(),
    condition: text(100),

    warranty: text(1000),
    inTheBox: text(2000),
    delivery: text(1000),
    options: z.array(text(100)).max(20),
    colors: z.array(text(100)).max(20),
    tags: z.array(text(50)).max(8),
    createdAt: text(100),
  })
  .refine((p) => !p.priceConfirmed || p.price !== null, {
    message: "Enter a selling price before confirming it.",
    path: ["price"],
  })

const socialUrl = (domains) =>
  z.string()
    .trim()
    .max(1000)
    .refine((value) => {
      if (!value) return true
      try {
        const url = new URL(value)
        return (
          url.protocol === "https:" &&
          !url.username &&
          !url.password &&
          (!url.port || url.port === "443") &&
          domains.some(
            (domain) =>
              url.hostname === domain || url.hostname.endsWith("." + domain),
          )
        )
      } catch {
        return false
      }
    }, "Enter an HTTPS profile link on the selected social platform.")
    .default("")
const settingsSchema = z
  .object({
    name: text(100),
    tagline: text(150),
    phone: text(30),
    phoneAlt: text(30).default(""),
    email: z.union([email, z.literal("")]),
    address: text(500),
    hours: text(500),
    whatsapp: text(30),
    about: text(5000),
    returns: text(5000),
    delivery: text(5000),
    deliveryFee: z.number().int().min(0).max(10000000).nullable(),
    deliveryPricing: z
      .object({
        mode: z.enum(["distance", "flat"]),
        baseFee: z.number().int().min(0).max(10000000),
        perKm: z.number().int().min(0).max(100000),
        minimumFee: z.number().int().min(0).max(10000000),
        maximumFee: z.number().int().min(0).max(10000000),
        rounding: z.number().int().min(1).max(10000),
        distanceMultiplier: z.number().min(1).max(3),
        overrides: z
          .array(
            z.object({
              districtId: text(30),
              distanceKm: z.number().min(0).max(2000).nullable().optional(),
              fee: z.number().int().min(0).max(10000000).nullable().optional(),
            }),
          )
          .max(200),
      })
      .refine((p) => p.maximumFee >= p.minimumFee, {
        message: "Maximum delivery fee must be at least the minimum.",
      })
      .nullable()
      .optional(),
    socials: z
      .object({
        facebook: socialUrl(["facebook.com", "fb.com"]),
        x: socialUrl(["x.com", "twitter.com"]),
        tiktok: socialUrl(["tiktok.com"]),
        instagram: socialUrl(["instagram.com"]),
        snapchat: socialUrl(["snapchat.com"]),
      })
      .optional(),
  })
  .refine((s) => s.deliveryPricing?.mode !== "flat" || s.deliveryFee != null, {
    message: "Enter the flat delivery fee, or select distance-based pricing.",
    path: ["deliveryFee"],
  })

const publicUser = (user) =>
  user && {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || "",
    addresses: user.addresses || [],
  }

export const publicOrder = (row) => ({
  id: row.id,
  status: row.status,
  paymentStatus: row.payment_status,
  amount: row.amount == null ? null : Number(row.amount),
  currency: row.currency,
  ...row.details,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  expiresAt: row.expires_at,
})

const send = (res, data, status = 200) => {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  res.end(JSON.stringify(data))
}

async function storeSettings(db) {
  const stored =
    (await db.query(`SELECT data FROM settings WHERE id='store'`)).rows[0]
      ?.data || {}
  return {
    ...storeDefaults,
    ...stored,
    socials: { ...storeDefaults.socials, ...stored.socials },
  }
}

async function userOrder(db, id, user) {
  const row = (
    await db.query("SELECT * FROM orders WHERE id=$1 AND user_id=$2", [
      id,
      user.id,
    ])
  ).rows[0]
  if (!row) fail(404, "Order was not found.")
  return row
}

function validateImages(p) {
  for (const url of p.gallery)
    if (
      !/^\/assets\/[a-zA-Z0-9%_.\-/@]+$/.test(url) &&
      !/^https:\/\//.test(url)
    )
      fail(400, "Use a store asset or an HTTPS image URL.")
}

async function createOrder(db, user, payload) {
  const body = orderSchema.parse(payload)
  if (body.enquiry && body.paymentMethod === "cod")
    fail(400, "Cash orders use the listed prices.")

  return db.transaction(async (tx) => {
    await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [user.id])

    const existing = (
      await tx.query(
        "SELECT * FROM orders WHERE user_id=$1 AND idempotency_key=$2",
        [user.id, body.key],
      )
    ).rows[0]

    if (existing) return existing

    const settings = await storeSettings(tx)

    const aggregated = new Map()

    for (const line of body.items)
      aggregated.set(line.id, (aggregated.get(line.id) || 0) + line.quantity)

    if ([...aggregated.values()].some((n) => n > 10))
      fail(400, "A maximum of 10 units of each product can be ordered online.")

    const locked = new Map()

    for (const [id, quantity] of [...aggregated].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      const product = (
        await tx.query("SELECT data FROM products WHERE id=$1 FOR UPDATE", [id])
      ).rows[0]?.data

      if (!product?.active)
        fail(
          409,
          "An item in your cart is no longer available. Please review your cart.",
        )

      if (!body.enquiry) {
        if (
          product.price == null ||
          !product.priceConfirmed ||
          product.stock == null
        )
          fail(
            409,
            product.name +
              " needs a price or availability confirmation. Request a quote instead.",
          )

        const reserved = Number(
          (
            await tx.query(
              `SELECT COALESCE(SUM(quantity),0) AS quantity FROM stock_reservations WHERE product_id=$1 AND expires_at>NOW()`,
              [id],
            )
          ).rows[0].quantity,
        )

        if (product.stock - reserved < quantity)
          fail(409, product.name + " does not have enough available stock.")
      }

      locked.set(id, product)
    }

    const items = body.items.map((line) => {
      const p = locked.get(line.id)

      if (p.options.length && !p.options.includes(line.option))
        fail(400, "Select a valid configuration for " + p.name + ".")

      if (p.colors.length && !p.colors.includes(line.color))
        fail(400, "Select a valid colour for " + p.name + ".")

      return {
        ...line,
        name: p.name,
        image: p.image,
        sku: p.sku,
        unitPrice: p.price,
      }
    })

    const cash = body.paymentMethod === "cod" && !body.enquiry
    if (!body.enquiry && !cash && !onlinePaymentsReady())
      fail(
        503,
        "Online payment is unavailable. Choose cash on delivery or collection.",
      )

    if (
      body.fulfillment === "delivery" &&
      (!body.customer.address || !body.customer.district)
    )
      fail(400, "Enter your delivery address and district.")

    const delivery =
      body.fulfillment === "collection"
        ? { fee: 0 }
        : calculateDelivery(settings, body.customer.district)
    if (!body.enquiry && delivery.fee == null)
      fail(
        409,
        delivery.error ||
          "Delivery pricing is unavailable. Select store collection.",
      )

    if (!body.enquiry && body.fulfillment === "collection" && !settings.address)
      fail(409, "Collection details must be confirmed before payment.")

    const deliveryFee = delivery.fee

    const subtotal = items.every((p) => p.unitPrice != null)
      ? items.reduce((sum, p) => sum + p.unitPrice * p.quantity, 0)
      : null

    const amount = body.enquiry ? null : subtotal + deliveryFee
    if (
      !body.enquiry &&
      body.expectedTotal != null &&
      body.expectedTotal !== amount
    )
      fail(
        409,
        "Prices or delivery rates changed. Review the updated total before placing your order.",
      )

    if (
      !body.enquiry &&
      (!Number.isSafeInteger(amount) || amount < 100 || amount > 2000000000)
    )
      fail(400, "This order needs a quote from the store.")

    const id = "LT-" + randomBytes(6).toString("hex").toUpperCase()

    const details = {
      items,
      customer: body.customer,
      fulfillment: body.fulfillment,
      paymentMethod: body.paymentMethod,
      notes: body.notes,
      subtotal,
      deliveryFee,
      deliveryEstimate: delivery,
      ...(cash ? { inventoryCommitted: true } : {}),
      ...(!cash && !body.enquiry ? { paymentMode: paymentMode() } : {}),
      timeline: [
        {
          status: body.enquiry
            ? "quote_requested"
            : cash
              ? "confirmed"
              : "pending_payment",
          at: new Date().toISOString(),
        },
      ],
    }

    await tx.query(
      `INSERT INTO orders(id,user_id,idempotency_key,status,amount,details,expires_at,payment_status) VALUES($1,$2,$3,$4,$5,$6::jsonb,CASE WHEN $7 THEN NULL ELSE NOW()+INTERVAL '30 minutes' END,$8)`,
      [
        id,
        user.id,
        body.key,
        body.enquiry
          ? "quote_requested"
          : cash
            ? "confirmed"
            : "pending_payment",
        amount,
        JSON.stringify(details),
        body.enquiry || cash,
        cash ? "cash_due" : "unpaid",
      ],
    )

    if (cash)
      for (const [productId, quantity] of aggregated) {
        const p = locked.get(productId)
        await tx.query(
          "UPDATE products SET data=$2::jsonb,updated_at=NOW() WHERE id=$1",
          [productId, JSON.stringify({ ...p, stock: p.stock - quantity })],
        )
      }
    if (!body.enquiry && !cash)
      for (const [productId, quantity] of aggregated)
        await tx.query(
          `INSERT INTO stock_reservations(order_id,product_id,quantity,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '30 minutes')`,
          [id, productId, quantity],
        )

    const order = (await tx.query("SELECT * FROM orders WHERE id=$1", [id]))
      .rows[0]
    await queueOrderEmail(
      tx,
      order,
      "placed",
      body.enquiry
        ? "Order request received"
        : cash
          ? "Order confirmed"
          : "Order received · payment pending",
    )
    return order
  })
}

export default async function handler(req, res) {
  const requestId = randomUUID()

  res.setHeader("Cache-Control", "no-store")
  res.setHeader("X-Content-Type-Options", "nosniff")
  res.setHeader("X-Request-Id", requestId)

  try {
    const url = new URL(req.url, currentOrigin(req))

    const route = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "")

    const method = req.method || "GET"

    const paymentHook = route === "payments/webhook"

    if (!paymentHook) checkOrigin(req)

    if (route === "config" && method === "GET")
      return send(res, {
        accounts: databaseConfigured(),
        payments: databaseConfigured() && onlinePaymentsReady(),
        orderEmails: databaseConfigured() && orderEmailReady(),
        analytics: databaseConfigured(),
        newsletter: databaseConfigured(),
        cashOnDelivery: databaseConfigured(),
        currency: "UGX",
        country: "Uganda",
        paymentMode: paymentMode(),
      })

    if (route === "catalog" && method === "GET") {
      if (!databaseConfigured())
        return send(res, {
          products: products.filter((p) => p.active),
          settings: storeDefaults,
          pages: [],
        })

      const db = await getDatabase()

      const rows = await db.query(
        `SELECT p.data, COALESCE(r.review_count,0)::int AS review_count, r.average_rating
         FROM products p LEFT JOIN
         (SELECT product_id, COUNT(*) AS review_count, AVG(rating) AS average_rating FROM reviews GROUP BY product_id) r
         ON r.product_id=p.id WHERE p.data->>'active'='true' ORDER BY p.data->>'name'`,
      )

      return send(res, {
        products: rows.rows.map((r) => ({
          ...r.data,
          reviewCount: Number(r.review_count),
          rating: r.review_count > 0 ? Number(r.average_rating) : null,
        })),
        settings: await storeSettings(db),
        pages: await publishedPages(db),
      })
    }

    if (
      !databaseConfigured() &&
      route === "analytics/visit" &&
      method === "POST"
    )
      return send(res, { available: false, recorded: false }, 202)
    if (
      !databaseConfigured() &&
      route.startsWith("newsletter/") &&
      method === "POST"
    )
      fail(503, "Subscriptions are being connected. Please try again later.")

    const db = await getDatabase()

    const user = await getUser(db, req)

    const ip = String(
      req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown",
    ).split(",")[0]

    const body = ["POST", "PUT", "PATCH"].includes(method)
      ? await readBody(req)
      : {}

    const audience = await audienceRoute({
      route,
      method,
      body,
      db,
      user,
      ip,
      userAgent: String(req.headers["user-agent"] || ""),
    })
    if (audience) return send(res, audience.body, audience.status || 200)
    if (route === "checkout/attempts" || route.startsWith("admin/checkouts/")) {
      const result = await checkoutRoute({
        route,
        method,
        body,
        db,
        user,
        settings: await storeSettings(db),
      })
      if (result) return send(res, result.body, result.status || 200)
    }

    if (route === "auth/me" && method === "GET")
      return send(res, { user: publicUser(user) })

    if (route === "auth/register" && method === "POST") {
      const input = z
        .object({ name: text(100).min(2), email, password })
        .parse(body)

      await rateLimit(db, "register:" + ip, 5, 60)

      const id = randomUUID()
      const encoded = await hashPassword(input.password)

      try {
        await db.query(
          "INSERT INTO users(id,name,email,password_hash) VALUES($1,$2,$3,$4)",
          [id, input.name, input.email, encoded],
        )
      } catch (error) {
        if (error.code === "23505")
          fail(
            409,
            "An account with this email already exists. Sign in or reset your password.",
          )
        throw error
      }

      await createSession(db, res, id)
      return send(
        res,
        {
          user: {
            id,
            name: input.name,
            email: input.email,
            role: "customer",
            phone: "",
            addresses: [],
          },
        },
        201,
      )
    }

    if (route === "auth/login" && method === "POST") {
      const input = z
        .object({ email, password: z.string().max(128) })
        .parse(body)

      await rateLimit(db, "login-ip:" + ip, 40, 15)
      await rateLimit(db, "login-email:" + input.email, 10, 15)

      const record = (
        await db.query("SELECT * FROM users WHERE email=$1", [input.email])
      ).rows[0]

      const valid = await checkPassword(
        input.password,
        record?.password_hash ||
          "00000000000000000000000000000000:" + "0".repeat(128),
      )

      if (!record || !valid) fail(401, "The email or password is incorrect.")

      await createSession(db, res, record.id)
      return send(res, { user: publicUser(record) })
    }

    if (route === "auth/logout" && method === "POST") {
      const token = String(req.headers.cookie || "")
        .split(";")
        .map((s) => s.trim())
        .find((s) => s.startsWith("lt_session="))
        ?.slice(11)

      if (token)
        await db.query("DELETE FROM sessions WHERE token_hash=$1", [
          hash(token),
        ])

      res.setHeader(
        "Set-Cookie",
        `lt_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${
          process.env.NODE_ENV === "production" ? "; Secure" : ""
        }`,
      )
      return send(res, { ok: true })
    }

    if (route === "auth/forgot-password" && method === "POST") {
      if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)
        fail(
          503,
          "Password reset email is not available yet. Please contact the store for help.",
        )

      const input = z.object({ email }).parse(body)
      await rateLimit(db, "reset:" + ip, 5, 30)

      const record = (
        await db.query("SELECT id FROM users WHERE email=$1", [input.email])
      ).rows[0]

      if (record) {
        const token = randomBytes(32).toString("hex")

        await db.query(
          `INSERT INTO reset_tokens(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '30 minutes')`,
          [hash(token), record.id],
        )

        const link = currentOrigin(req) + "/reset-password/?token=" + token

        const mail = await fetch("https://api.resend.com/emails", {
          method: "POST",
          signal: AbortSignal.timeout(10000),
          headers: {
            Authorization: "Bearer " + process.env.RESEND_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM,
            to: input.email,
            subject: "Reset your London Tech password",
            text:
              "Reset your password: " +
              link +
              "\nThis link expires in 30 minutes. If you did not request it, ignore this email.",
          }),
        })

        if (!mail.ok)
          fail(
            503,
            "Password reset email could not be sent. Please try again later.",
          )
      }

      return send(res, {
        message: "If that email has an account, a reset link will be sent.",
      })
    }

    if (route === "auth/reset-password" && method === "POST") {
      const input = z
        .object({ token: z.string().regex(/^[a-f0-9]{64}$/), password })
        .parse(body)
      await rateLimit(db, "reset-use:" + ip, 10, 15)

      await db.transaction(async (tx) => {
        const record = (
          await tx.query(
            "DELETE FROM reset_tokens WHERE token_hash=$1 AND expires_at>NOW() RETURNING user_id",
            [hash(input.token)],
          )
        ).rows[0]

        if (!record)
          fail(
            400,
            "This reset link is invalid or expired. Request a new link.",
          )

        await tx.query("UPDATE users SET password_hash=$2 WHERE id=$1", [
          record.user_id,
          await hashPassword(input.password),
        ])

        await tx.query("DELETE FROM sessions WHERE user_id=$1", [
          record.user_id,
        ])

        await tx.query("DELETE FROM reset_tokens WHERE user_id=$1", [
          record.user_id,
        ])
      })
      return send(res, { ok: true })
    }

    if (route === "account" && method === "PATCH") {
      requireUser(user)
      const input = z
        .object({
          name: text(100).min(2),
          phone: text(25),
          addresses: z.array(addressSchema).max(5),
        })
        .parse(body)

      await db.query(
        "UPDATE users SET name=$2,phone=$3,addresses=$4::jsonb WHERE id=$1",
        [user.id, input.name, input.phone, JSON.stringify(input.addresses)],
      )

      return send(res, { user: { ...publicUser(user), ...input } })
    }

    if (route === "account/password" && method === "POST") {
      requireUser(user)
      const input = z
        .object({ currentPassword: z.string().max(128), password })
        .parse(body)
      await rateLimit(db, "password:" + user.id, 5, 15)

      const record = (
        await db.query("SELECT password_hash FROM users WHERE id=$1", [user.id])
      ).rows[0]

      if (!(await checkPassword(input.currentPassword, record.password_hash)))
        fail(400, "Your current password is incorrect.")

      await db.transaction(async (tx) => {
        await tx.query("UPDATE users SET password_hash=$2 WHERE id=$1", [
          user.id,
          await hashPassword(input.password),
        ])
        await tx.query("DELETE FROM sessions WHERE user_id=$1", [user.id])
      })

      await createSession(db, res, user.id)
      return send(res, { ok: true })
    }

    if (route === "wishlist") {
      requireUser(user)

      if (method === "GET")
        return send(res, {
          ids:
            (
              await db.query(
                "SELECT product_ids FROM wishlists WHERE user_id=$1",
                [user.id],
              )
            ).rows[0]?.product_ids || [],
        })

      if (method === "PUT") {
        const input = z.object({ ids: z.array(text(100)).max(200) }).parse(body)
        await db.query(
          "INSERT INTO wishlists(user_id,product_ids) VALUES($1,$2::jsonb) ON CONFLICT(user_id) DO UPDATE SET product_ids=EXCLUDED.product_ids",
          [user.id, JSON.stringify([...new Set(input.ids)])],
        )
        return send(res, { ok: true })
      }
    }

    const reviewRoute = route.match(/^products\/([^/]+)\/reviews$/)

    if (reviewRoute) {
      const productId = decodeURIComponent(reviewRoute[1])

      if (method === "GET") {
        const result = await db.query(
          "SELECT r.id,r.rating,r.title,r.body,r.created_at,u.name FROM reviews r JOIN users u ON u.id=r.user_id WHERE product_id=$1 ORDER BY r.created_at DESC LIMIT 100",
          [productId],
        )
        return send(res, {
          reviews: result.rows.map((r) => ({
            ...r,
            name: r.name.split(" ")[0],
            verified: true,
          })),
        })
      }

      if (method === "POST") {
        requireUser(user)
        const input = z
          .object({
            rating: z.number().int().min(1).max(5),
            title: text(100).min(3),
            body: text(2000).min(10),
          })
          .parse(body)

        const paid = (
          await db.query(
            `SELECT id FROM orders WHERE user_id=$1 AND payment_status='paid' AND details->>'paymentMode' IS DISTINCT FROM 'test' AND details->'items' @> $2::jsonb LIMIT 1`,
            [user.id, JSON.stringify([{ id: productId }])],
          )
        ).rows[0]

        if (!paid)
          fail(
            403,
            "Reviews are available to customers who purchased this product.",
          )

        await db.query(
          "INSERT INTO reviews(id,user_id,product_id,rating,title,body) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(user_id,product_id) DO UPDATE SET rating=EXCLUDED.rating,title=EXCLUDED.title,body=EXCLUDED.body",
          [
            randomUUID(),
            user.id,
            productId,
            input.rating,
            input.title,
            input.body,
          ],
        )
        return send(res, { ok: true }, 201)
      }
    }

    if (route === "orders" && method === "GET") {
      requireUser(user)
      return send(res, {
        orders: (
          await db.query(
            "SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",
            [user.id],
          )
        ).rows.map(publicOrder),
      })
    }

    if (route === "orders" && method === "POST") {
      requireUser(user)
      await rateLimit(db, "order:" + user.id, 20, 15)

      let order
      try {
        order = await createOrder(db, user, body)
      } catch (error) {
        await updateAttempt(db, user.id, body.attemptId, "failed", {
          failureMessage:
            error.status && error.status < 500
              ? String(error.message).slice(0, 240)
              : "Checkout could not be completed. Please try again.",
          failureStage: "order",
        })
        throw error
      }
      await updateAttempt(
        db,
        user.id,
        body.attemptId,
        order.status === "cancelled"
          ? "cancelled"
          : order.payment_status === "paid"
            ? "completed"
            : order.details.paymentMethod === "cod"
              ? "order_placed"
              : "awaiting_payment",
        { failureMessage: null },
        order.id,
      )
      if (
        ["quote_requested", "pending_payment"].includes(order.status) ||
        (order.status === "confirmed" && order.payment_status === "cash_due")
      )
        await deliverOrderEmail(db, `${order.id}-placed`, order.id)
      return send(res, { order: publicOrder(order) }, 201)
    }

    const orderRoute = route.match(
      /^orders\/([^/]+)(?:\/(pay|verify|cancel))?$/,
    )

    if (orderRoute) {
      requireUser(user)
      const row = await userOrder(db, orderRoute[1], user)
      const action = orderRoute[2]

      if (method === "GET" && !action)
        return send(res, { order: publicOrder(row) })

      if (method === "POST" && action === "pay") {
        if (row.details.paymentMethod === "cod")
          fail(409, "This order is payable in cash when you receive it.")
        if (row.payment_status === "paid")
          fail(409, "This order is already paid.")

        if (!onlinePaymentsReady())
          fail(
            503,
            "Online payments are being connected. Please contact the store.",
          )

        let payable = row

        if (row.status === "quoted")
          payable = await db.transaction(async (tx) => {
            const locked = (
              await tx.query("SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
                row.id,
              ])
            ).rows[0]

            if (
              locked.status === "pending_payment" &&
              new Date(locked.expires_at) > new Date()
            )
              return locked

            if (
              locked.status !== "quoted" ||
              new Date(locked.expires_at) <= new Date()
            )
              fail(
                409,
                "This quote has expired. Contact the store for an updated quote.",
              )

            const quantities = new Map()
            for (const line of locked.details.items)
              quantities.set(
                line.id,
                (quantities.get(line.id) || 0) + line.quantity,
              )

            for (const [productId, quantity] of [...quantities].sort(
              ([a], [b]) => a.localeCompare(b),
            )) {
              const product = (
                await tx.query(
                  "SELECT data FROM products WHERE id=$1 FOR UPDATE",
                  [productId],
                )
              ).rows[0]?.data

              const reserved = Number(
                (
                  await tx.query(
                    "SELECT COALESCE(SUM(quantity),0) AS quantity FROM stock_reservations WHERE product_id=$1 AND expires_at>NOW()",
                    [productId],
                  )
                ).rows[0].quantity,
              )

              if (
                !product?.active ||
                product.stock == null ||
                product.stock - reserved < quantity
              )
                fail(
                  409,
                  "Stock needs to be confirmed for " +
                    (product?.name || "an item") +
                    ". Please contact the store.",
                )

              await tx.query(
                `INSERT INTO stock_reservations(order_id,product_id,quantity,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '30 minutes') ON CONFLICT(order_id,product_id) DO UPDATE SET quantity=EXCLUDED.quantity,expires_at=EXCLUDED.expires_at`,
                [locked.id, productId, quantity],
              )
            }

            await tx.query(
              `UPDATE orders SET status='pending_payment',expires_at=NOW()+INTERVAL '30 minutes',details=details||$2::jsonb,updated_at=NOW() WHERE id=$1`,
              [locked.id, JSON.stringify({ paymentMode: paymentMode() })],
            )

            return (
              await tx.query("SELECT * FROM orders WHERE id=$1", [locked.id])
            ).rows[0]
          })

        if (
          payable.status !== "pending_payment" ||
          new Date(payable.expires_at) <= new Date()
        )
          fail(
            409,
            "This checkout has expired. Return to your cart and create a new order.",
          )

        try {
          const url = await createPaymentLink(payable, currentOrigin(req))
          await db.query(
            "UPDATE checkout_attempts SET state='awaiting_payment',updated_at=NOW() WHERE order_id=$1",
            [row.id],
          )
          return send(res, { url })
        } catch (error) {
          await db.query(
            "UPDATE checkout_attempts SET state='failed',details=details||$2::jsonb,updated_at=NOW() WHERE order_id=$1",
            [
              row.id,
              JSON.stringify({
                failureStage: "payment",
                failureMessage:
                  "The payment provider could not start this payment.",
              }),
            ],
          )
          throw error
        }
      }

      if (method === "POST" && action === "verify") {
        if (row.details.paymentMethod === "cod")
          fail(
            409,
            "Cash payment is recorded by the store after it is received.",
          )
        await rateLimit(db, "verify:" + user.id, 30, 15)
        const input = z
          .object({ transactionId: z.union([z.string(), z.number()]) })
          .parse(body)
        try {
          const verified = await verifyPayment(db, input.transactionId, row.id)
          await deliverOrderEmail(db, `${verified.id}-payment`, verified.id)
          return send(res, { order: publicOrder(verified) })
        } catch (error) {
          await db.query(
            "UPDATE checkout_attempts SET state='failed',details=details||$2::jsonb,updated_at=NOW() WHERE order_id=$1 AND state<>'completed'",
            [
              row.id,
              JSON.stringify({
                failureStage: "verification",
                failureMessage:
                  "Payment could not be confirmed. Check with the customer before retrying.",
              }),
            ],
          )
          throw error
        }
      }

      if (method === "POST" && action === "cancel") {
        await db.transaction(async (tx) => {
          const locked = (
            await tx.query("SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
              row.id,
            ])
          ).rows[0]
          if (
            locked.payment_status === "paid" ||
            !(
              ["quoted", "pending_payment", "quote_requested"].includes(
                locked.status,
              ) ||
              (locked.details.paymentMethod === "cod" &&
                locked.status === "confirmed")
            )
          )
            fail(
              409,
              "Please contact the store to discuss cancelling this order.",
            )
          const restored = await restoreCashInventory(tx, locked)
          const details = {
            ...restored,
            timeline: [
              ...(restored.timeline || []),
              { status: "cancelled", at: new Date().toISOString() },
            ],
          }
          await tx.query(
            `UPDATE orders SET status='cancelled',details=$2::jsonb,updated_at=NOW() WHERE id=$1`,
            [row.id, JSON.stringify(details)],
          )
          await tx.query(
            "UPDATE checkout_attempts SET state='cancelled',updated_at=NOW() WHERE order_id=$1",
            [row.id],
          )
          await tx.query("DELETE FROM stock_reservations WHERE order_id=$1", [
            row.id,
          ])
          await queueOrderEmail(
            tx,
            { ...locked, details },
            "cancelled",
            "Order cancelled",
          )
        })
        await deliverOrderEmail(db, `${row.id}-cancelled`, row.id)
        return send(res, { ok: true })
      }
    }

    if (paymentHook && method === "POST") {
      if (
        !process.env.FLW_SECRET_HASH ||
        !safeEqual(req.headers["verif-hash"], process.env.FLW_SECRET_HASH)
      )
        fail(401, "Invalid webhook signature.")

      if (isSandboxReference(body.data?.tx_ref))
        return send(res, { received: true })

      if (
        body.event === "charge.completed" &&
        body.data?.status === "successful"
      ) {
        const verified = await verifyPayment(db, body.data.id)
        await deliverOrderEmail(db, `${verified.id}-payment`, verified.id)
      } else if (
        body.event === "charge.completed" &&
        ["failed", "cancelled"].includes(body.data?.status) &&
        typeof body.data.tx_ref === "string"
      )
        await db.query(
          "UPDATE checkout_attempts SET state='failed',details=details||$2::jsonb,updated_at=NOW() WHERE order_id=$1 AND state NOT IN ('completed','order_placed')",
          [
            body.data.tx_ref,
            JSON.stringify({
              failureStage: "payment",
              failureMessage:
                "The payment provider reported an unsuccessful payment.",
            }),
          ],
        )

      return send(res, { received: true })
    }

    const workspace = await workspaceRoute({
      route,
      method,
      body,
      db,
      user,
      query: url.searchParams,
    })
    if (workspace) return send(res, workspace.body, workspace.status || 200)

    if (route.startsWith("admin/")) {
      requireAdmin(user)

      if (route === "admin/overview" && method === "GET") {
        const [orders, customers, catalog, events] = await Promise.all([
          db.query("SELECT * FROM orders ORDER BY created_at DESC LIMIT 500"),

          db.query(
            `SELECT u.id,u.name,u.email,u.phone,u.created_at,COUNT(o.id)::int AS orders FROM users u LEFT JOIN orders o ON o.user_id=u.id WHERE u.role='customer' GROUP BY u.id ORDER BY u.created_at DESC LIMIT 500`,
          ),

          db.query("SELECT data FROM products ORDER BY updated_at DESC"),
          db.query(
            "SELECT id,action,details,created_at FROM audit_events ORDER BY created_at DESC LIMIT 500",
          ),
        ])

        return send(res, {
          orders: orders.rows.map(publicOrder),
          customers: customers.rows,
          products: catalog.rows.map((r) => r.data),
          events: events.rows,
          settings: await storeSettings(db),
          ...(await workspaceSummary(db)),
          ...(await audienceSummary(db)),
          checkouts: await checkoutSummary(db),
          connection: {
            database: true,
            payments: onlinePaymentsReady(),
            email: orderEmailReady(),
            paymentMode: paymentMode(),
          },
        })
      }

      if (route === "admin/products" && method === "POST") {
        const p = productSchema.parse(body)
        validateImages(p)
        if (
          p.comparePrice != null &&
          p.price != null &&
          p.comparePrice <= p.price
        )
          fail(400, "The regular price must be higher than the selling price.")

        if (
          p.vendorId &&
          !(await db.query("SELECT id FROM vendors WHERE id=$1", [p.vendorId]))
            .rows.length
        )
          fail(400, "Choose an existing vendor.")
        const inserted = await db.query(
          "INSERT INTO products(id,data,vendor_id) VALUES($1,$2::jsonb,$3) ON CONFLICT(id) DO NOTHING RETURNING id",
          [p.id, JSON.stringify(p), p.vendorId || null],
        )
        if (!inserted.rows.length)
          fail(409, "A product already uses this URL identifier.")
        await audit(db, user.id, "product.created", { id: p.id })
        return send(res, { product: p }, 201)
      }

      const productRoute = route.match(/^admin\/products\/([^/]+)$/)

      if (productRoute && method === "PUT") {
        const p = productSchema.parse(body)
        if (p.id !== productRoute[1])
          fail(400, "Product identifiers cannot be changed.")
        validateImages(p)
        if (
          p.comparePrice != null &&
          p.price != null &&
          p.comparePrice <= p.price
        )
          fail(400, "The regular price must be higher than the selling price.")

        if (
          p.vendorId &&
          !(await db.query("SELECT id FROM vendors WHERE id=$1", [p.vendorId]))
            .rows.length
        )
          fail(400, "Choose an existing vendor.")
        const result = await db.query(
          "UPDATE products SET data=$2::jsonb,vendor_id=$3,updated_at=NOW() WHERE id=$1 RETURNING id",
          [p.id, JSON.stringify(p), p.vendorId || null],
        )
        if (!result.rows.length) fail(404, "Product was not found.")
        await audit(db, user.id, "product.updated", { id: p.id })
        return send(res, { product: p })
      }

      const cashPayment = route.match(/^admin\/orders\/([^/]+)\/cash-payment$/)
      if (cashPayment && method === "POST") {
        z.object({ confirmed: z.literal(true) }).parse(body)
        const order = await collectCash(db, cashPayment[1], user)
        await deliverOrderEmail(db, `${order.id}-payment`, order.id)
        return send(res, { order: publicOrder(order) })
      }
      const orderEmails = route.match(/^admin\/orders\/([^/]+)\/emails$/)
      if (orderEmails && ["GET", "POST"].includes(method)) {
        if (method === "POST") {
          if (!orderEmailReady())
            fail(503, "Connect the order email sender first.")
          await rateLimit(db, "order-email:" + user.id, 15, 15)
          const input = z.object({ id: text(120).min(1) }).parse(body)
          await deliverOrderEmail(db, input.id, orderEmails[1])
        }
        return send(res, {
          configured: orderEmailReady(),
          emails: await listOrderEmails(db, orderEmails[1]),
        })
      }
      const adminOrder = route.match(/^admin\/orders\/([^/]+)$/)

      if (adminOrder && method === "PATCH") {
        const input = z
          .object({
            status: z.enum([
              "confirmed",
              "processing",
              "ready",
              "shipped",
              "completed",
              "cancelled",
              "review",
            ]),
            note: text(1000).default(""),
            tracking: trackingSchema.optional(),
          })
          .parse(body)

        const notification = await db.transaction(async (tx) => {
          const row = (
            await tx.query("SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
              adminOrder[1],
            ])
          ).rows[0]
          if (!row) fail(404, "Order was not found.")

          if (
            [
              "confirmed",
              "processing",
              "ready",
              "shipped",
              "completed",
            ].includes(input.status) &&
            row.payment_status !== "paid" &&
            !(
              row.details.paymentMethod === "cod" &&
              row.payment_status === "cash_due" &&
              row.details.inventoryCommitted &&
              input.status !== "completed" &&
              row.status !== "cancelled"
            )
          )
            fail(409, "Payment must be verified before fulfillment.")

          if (input.status === "cancelled" && row.payment_status === "paid")
            fail(
              409,
              "Paid orders need a refund reviewed and recorded before cancellation. Mark the order for review instead.",
            )

          const tracking =
            row.details.fulfillment === "delivery" && input.tracking
              ? input.tracking
              : row.details.tracking
          const trackingChanged = [
            "carrier",
            "reference",
            "estimatedDate",
            "url",
          ].some(
            (key) =>
              (tracking?.[key] || "") !== (row.details.tracking?.[key] || ""),
          )
          const statusChanged = row.status !== input.status
          const noteChanged =
            input.note && input.note !== row.details.timeline?.at(-1)?.note
          if (!statusChanged && !trackingChanged && !noteChanged) return null

          const restored =
            input.status === "cancelled"
              ? await restoreCashInventory(tx, row)
              : row.details
          const details = {
            ...restored,
            ...(tracking ? { tracking } : {}),
            timeline: [
              ...(row.details.timeline || []),
              {
                status: input.status,
                kind: statusChanged
                  ? "status"
                  : trackingChanged
                    ? "tracking"
                    : "note",
                note: input.note,
                at: new Date().toISOString(),
              },
            ],
          }

          await tx.query(
            "UPDATE orders SET status=$2,details=$3::jsonb,updated_at=NOW() WHERE id=$1",
            [row.id, input.status, JSON.stringify(details)],
          )

          if (input.status === "cancelled")
            await tx.query("DELETE FROM stock_reservations WHERE order_id=$1", [
              row.id,
            ])
          if (input.status === "cancelled")
            await tx.query(
              "UPDATE checkout_attempts SET state='cancelled',updated_at=NOW() WHERE order_id=$1",
              [row.id],
            )
          return queueOrderEmail(
            tx,
            { ...row, details },
            randomUUID(),
            statusChanged
              ? orderUpdateTitle(input.status, details.fulfillment)
              : trackingChanged
                ? "Delivery details updated"
                : "New order update",
          )
        })
        await deliverOrderEmail(db, notification, adminOrder[1])
        await audit(db, user.id, "order.updated", {
          id: adminOrder[1],
          status: input.status,
        })
        return send(res, { ok: true })
      }

      const quoteRoute = route.match(/^admin\/orders\/([^/]+)\/quote$/)

      if (quoteRoute && method === "POST") {
        const input = z
          .object({
            prices: z
              .array(z.number().int().min(100).max(2000000000))
              .min(1)
              .max(30),
            deliveryFee: z.number().int().min(0).max(10000000),
            note: text(1000).default(""),
          })
          .parse(body)

        const result = await db.transaction(async (tx) => {
          const row = (
            await tx.query("SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
              quoteRoute[1],
            ])
          ).rows[0]

          if (!row) fail(404, "Order was not found.")

          if (
            row.payment_status === "paid" ||
            !["quote_requested", "review", "quoted"].includes(row.status)
          )
            fail(409, "Only unpaid confirmation requests can be quoted.")

          if (input.prices.length !== row.details.items.length)
            fail(400, "Enter a confirmed price for every item.")

          const items = row.details.items.map((line, i) => ({
            ...line,
            unitPrice: input.prices[i],
          }))

          const subtotal = items.reduce(
              (sum, p) => sum + p.unitPrice * p.quantity,
              0,
            ),
            deliveryFee =
              row.details.fulfillment === "collection" ? 0 : input.deliveryFee,
            amount = subtotal + deliveryFee

          if (!Number.isSafeInteger(amount) || amount > 2000000000)
            fail(400, "The order total exceeds the online payment limit.")

          const details = {
            ...row.details,
            items,
            subtotal,
            deliveryFee,
            timeline: [
              ...(row.details.timeline || []),
              {
                status: "quoted",
                at: new Date().toISOString(),
                note:
                  input.note ||
                  "Price and order details confirmed by the store. Quote valid for 24 hours, subject to stock.",
              },
            ],
          }

          await tx.query(
            `UPDATE orders SET status='quoted',amount=$2,details=$3::jsonb,expires_at=NOW()+INTERVAL '24 hours',updated_at=NOW() WHERE id=$1`,
            [row.id, amount, JSON.stringify(details)],
          )

          return (await tx.query("SELECT * FROM orders WHERE id=$1", [row.id]))
            .rows[0]
        })
        await audit(db, user.id, "order.quoted", { id: quoteRoute[1] })
        return send(res, { order: publicOrder(result) })
      }

      if (route === "admin/settings" && method === "PUT") {
        const input = settingsSchema.parse(body)
        const settings = {
          ...storeDefaults,
          ...input,
          socials: { ...(await storeSettings(db)).socials, ...input.socials },
          country: "Uganda",
          currency: "UGX",
        }

        await db.query(`UPDATE settings SET data=$1::jsonb WHERE id='store'`, [
          JSON.stringify(settings),
        ])
        await audit(db, user.id, "settings.updated", {})
        return send(res, { settings })
      }
    }

    fail(404, "This endpoint was not found.")
  } catch (error) {
    if (error instanceof z.ZodError)
      return send(
        res,
        {
          error: error.issues[0]?.message || "Please check the form.",
          fields: error.flatten().fieldErrors,
        },
        400,
      )

    const status = error.status || 500

    if (status === 500)
      console.error(
        "London Tech request failed",
        requestId,
        error.code || error.name,
      )

    send(
      res,
      {
        error:
          status === 500
            ? "This request could not be completed. Please try again."
            : error.message,
        requestId,
      },
      status,
    )
  }
}
