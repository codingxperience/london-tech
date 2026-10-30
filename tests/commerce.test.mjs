import { after, before, test } from "node:test"

import assert from "node:assert/strict"

import { createServer } from "node:http"

import { randomUUID } from "node:crypto"

process.env.NODE_ENV = "test"

process.env.LOCAL_DATABASE_PATH = "memory://"

process.env.ADMIN_EMAIL = "admin@example.com"

process.env.ADMIN_PASSWORD = "Local-test-administrator-46!"

const { default: handler } = await import("../server/handler.js")

const { getDatabase } = await import("../server/db.js")

const { matchesPayment } = await import("../server/payments.js")

let server, origin, customerCookie, adminCookie, customerId, fixture, order, db

async function request(
  path,
  { method = "GET", body, cookie, originHeader = origin } = {},
) {
  const response = await fetch(origin + "/api/" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: originHeader,
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
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
  await db.close()
})

test("registration, authentication and server-side permissions", async () => {
  const registered = await request("auth/register", {
    method: "POST",
    body: {
      name: "Test Customer",
      email: "customer@example.com",
      password: "A-good-test-password-45!",
    },
  })

  assert.equal(registered.status, 201)
  assert.match(registered.cookie, /lt_session=/)
  customerCookie = registered.cookie
  customerId = registered.data.user.id

  const duplicate = await request("auth/register", {
    method: "POST",
    body: {
      name: "Test Customer",
      email: "CUSTOMER@example.com",
      password: "A-good-test-password-45!",
    },
  })
  assert.equal(duplicate.status, 409)

  const me = await request("auth/me", { cookie: customerCookie })
  assert.equal(me.data.user.email, "customer@example.com")
  assert.equal(me.data.user.password_hash, undefined)

  assert.equal(
    (await request("admin/overview", { cookie: customerCookie })).status,
    403,
  )

  assert.equal((await request("orders")).status, 401)

  assert.equal(
    (
      await request("auth/login", {
        method: "POST",
        body: { email: "customer@example.com", password: "wrong" },
      })
    ).status,
    401,
  )

  const admin = await request("auth/login", {
    method: "POST",
    body: {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    },
  })
  assert.equal(admin.status, 200)
  assert.equal(admin.data.user.role, "admin")
  adminCookie = admin.cookie

  const dashboard = await request("admin/overview", { cookie: adminCookie })
  assert.equal(dashboard.status, 200)
  assert.ok(dashboard.data.products.length >= 80)
  fixture = dashboard.data.products.find((p) => p.id === "jbl-tune-770nc")
})

test("cross-origin writes, unsafe images and customer promotion are rejected", async () => {
  assert.equal(
    (
      await request("account", {
        method: "PATCH",
        cookie: customerCookie,
        originHeader: "https://attacker.example",
        body: { name: "Changed", phone: "", addresses: [] },
      })
    ).status,
    403,
  )

  const promoted = await request("account", {
    method: "PATCH",
    cookie: customerCookie,
    body: {
      name: "Test Customer",
      phone: "0788000000",
      addresses: [],
      role: "admin",
    },
  })
  assert.equal(promoted.status, 200)
  assert.equal(promoted.data.user.role, "customer")

  const unsafe = { ...fixture, gallery: ["javascript:alert(1)"] }
  assert.equal(
    (
      await request("admin/products/" + fixture.id, {
        method: "PUT",
        cookie: adminCookie,
        body: unsafe,
      })
    ).status,
    400,
  )

  const unpublished = await request("admin/products/" + fixture.id, {
    method: "PUT",
    cookie: customerCookie,
    body: fixture,
  })
  assert.equal(unpublished.status, 403)
})

const payload = (overrides = {}) => ({
  items: [{ id: fixture.id, quantity: 1, option: "", color: "" }],
  customer: {
    name: "Test Customer",
    email: "customer@example.com",
    phone: "0788000000",
    district: "Kampala",
    address: "Test address for automated validation",
  },
  fulfillment: "collection",
  paymentMethod: "mtn",
  notes: "Test order",
  key: randomUUID(),
  enquiry: false,
  ...overrides,
})

test("guide prices and unknown stock cannot be paid", async () => {
  process.env.FLW_SECRET_KEY = "FLWSECK_TEST_VALIDATION"

  const draft = await request("orders", {
    method: "POST",
    cookie: customerCookie,
    body: payload(),
  })
  assert.equal(draft.status, 409)

  const priced = {
    ...fixture,
    price: 370000,
    priceConfirmed: true,
    stock: null,
  }
  assert.equal(
    (
      await request("admin/products/" + fixture.id, {
        method: "PUT",
        cookie: adminCookie,
        body: priced,
      })
    ).status,
    200,
  )

  const unknownStock = await request("orders", {
    method: "POST",
    cookie: customerCookie,
    body: payload(),
  })
  assert.equal(unknownStock.status, 409)

  fixture = { ...priced, stock: 2 }
  await request("admin/products/" + fixture.id, {
    method: "PUT",
    cookie: adminCookie,
    body: fixture,
  })
})

test("server totals, idempotency, reservations and stock checks", async () => {
  const body = payload({
    items: [{ id: fixture.id, quantity: 1, option: "", color: "", price: 1 }],
    amount: 1,
  })

  const created = await request("orders", {
    method: "POST",
    cookie: customerCookie,
    body,
  })
  assert.equal(created.status, 201)
  assert.equal(created.data.order.amount, 370000)
  order = created.data.order

  const duplicate = await request("orders", {
    method: "POST",
    cookie: customerCookie,
    body,
  })
  assert.equal(duplicate.data.order.id, order.id)

  const reserved = await db.query(
    "SELECT SUM(quantity)::int AS quantity FROM stock_reservations WHERE order_id=$1",
    [order.id],
  )
  assert.equal(reserved.rows[0].quantity, 1)

  const excessive = await request("orders", {
    method: "POST",
    cookie: customerCookie,
    body: payload({
      items: [{ id: fixture.id, quantity: 2, option: "", color: "" }],
    }),
  })
  assert.equal(excessive.status, 409)

  const delivery = await request("orders", {
    method: "POST",
    cookie: customerCookie,
    body: payload({ fulfillment: "delivery" }),
  })
  assert.equal(delivery.status, 409)

  const overMaximum = await request("orders", {
    method: "POST",
    cookie: customerCookie,
    body: payload({
      items: [
        { id: fixture.id, quantity: 10, option: "", color: "" },
        { id: fixture.id, quantity: 10, option: "", color: "" },
      ],
    }),
  })
  assert.equal(overMaximum.status, 400)
})

test("customers can request quotes without making a payment", async () => {
  const quote = await request("orders", {
    method: "POST",
    cookie: customerCookie,
    body: payload({
      enquiry: true,
      items: [{ id: "iphone-17-pro-max", quantity: 1, option: "", color: "" }],
    }),
  })
  assert.equal(quote.status, 201)
  assert.equal(quote.data.order.status, "quote_requested")
  assert.equal(quote.data.order.amount, null)
  assert.equal(quote.data.order.paymentStatus, "unpaid")
})

test("another account cannot read or verify an order", async () => {
  const stranger = await request("auth/register", {
    method: "POST",
    body: {
      name: "Another Customer",
      email: "another@example.com",
      password: "Another-safe-password-46!",
    },
  })

  assert.equal(
    (await request("orders/" + order.id, { cookie: stranger.cookie })).status,
    404,
  )

  assert.equal(
    (
      await request("orders/" + order.id + "/verify", {
        method: "POST",
        cookie: stranger.cookie,
        body: { transactionId: "123" },
      })
    ).status,
    404,
  )
})

test("payment verification checks reference, amount, currency and status", () => {
  const record = { id: order.id, currency: "UGX", amount: 370000 }
  const correct = {
    status: "successful",
    tx_ref: order.id,
    currency: "UGX",
    amount: 370000,
  }

  assert.equal(matchesPayment(record, correct), true)

  for (const patch of [
    { amount: 1 },
    { currency: "USD" },
    { tx_ref: "attacker" },
    { status: "pending" },
  ])
    assert.equal(matchesPayment(record, { ...correct, ...patch }), false)
})

test("unsigned webhooks and manual paid fulfillment are rejected", async () => {
  assert.equal(
    (
      await request("payments/webhook", {
        method: "POST",
        body: {
          event: "charge.completed",
          data: { status: "successful", id: 123 },
        },
      })
    ).status,
    401,
  )

  assert.equal(
    (
      await request("admin/orders/" + order.id, {
        method: "PATCH",
        cookie: adminCookie,
        body: { status: "completed", note: "" },
      })
    ).status,
    409,
  )
})

test("cancelled unpaid orders release stock without changing payment status", async () => {
  assert.equal(
    (
      await request("orders/" + order.id + "/cancel", {
        method: "POST",
        cookie: customerCookie,
        body: {},
      })
    ).status,
    200,
  )

  const after = await request("orders/" + order.id, { cookie: customerCookie })
  assert.equal(after.data.order.status, "cancelled")
  assert.equal(after.data.order.paymentStatus, "unpaid")

  assert.equal(
    (
      await db.query("SELECT * FROM stock_reservations WHERE order_id=$1", [
        order.id,
      ])
    ).rows.length,
    0,
  )
})

test("wishlist persists and reviews require verified purchases", async () => {
  assert.equal(
    (
      await request("wishlist", {
        method: "PUT",
        cookie: customerCookie,
        body: { ids: [fixture.id, fixture.id] },
      })
    ).status,
    200,
  )

  assert.deepEqual(
    (await request("wishlist", { cookie: customerCookie })).data.ids,
    [fixture.id],
  )

  assert.equal(
    (
      await request("products/" + fixture.id + "/reviews", {
        method: "POST",
        cookie: customerCookie,
        body: {
          rating: 5,
          title: "A review",
          body: "Not a verified purchase.",
        },
      })
    ).status,
    403,
  )
})

test("a confirmed quote can be paid and payment settlement is idempotent", async () => {
  const quote = await request("orders", {
    method: "POST",
    cookie: customerCookie,
    body: payload({ enquiry: true }),
  })
  assert.equal(quote.status, 201)

  const id = quote.data.order.id

  const confirmed = await request("admin/orders/" + id + "/quote", {
    method: "POST",
    cookie: adminCookie,
    body: {
      prices: [350000],
      deliveryFee: 0,
      note: "Confirmed test configuration",
    },
  })
  assert.equal(confirmed.status, 200)
  assert.equal(confirmed.data.order.status, "quoted")
  assert.equal(confirmed.data.order.amount, 350000)

  const realFetch = globalThis.fetch

  globalThis.fetch = async (url, options) => {
    const target = String(url)

    if (target === "https://api.flutterwave.com/v3/payments")
      return new Response(
        JSON.stringify({
          status: "success",
          data: { link: "https://checkout.flutterwave.com/test-session" },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )

    if (target === "https://api.flutterwave.com/v3/transactions/9001/verify")
      return new Response(
        JSON.stringify({
          status: "success",
          data: {
            id: 9001,
            status: "successful",
            tx_ref: id,
            currency: "UGX",
            amount: 350000,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )

    return realFetch(url, options)
  }

  try {
    const pay = await request("orders/" + id + "/pay", {
      method: "POST",
      cookie: customerCookie,
      body: {},
    })
    assert.equal(pay.status, 200)
    assert.match(pay.data.url, /^https:\/\/checkout.flutterwave.com\//)

    assert.equal(
      (
        await db.query(
          "SELECT quantity FROM stock_reservations WHERE order_id=$1",
          [id],
        )
      ).rows[0].quantity,
      1,
    )

    const beforeStock = (
      await db.query("SELECT data FROM products WHERE id=$1", [fixture.id])
    ).rows[0].data.stock

    const verified = await request("orders/" + id + "/verify", {
      method: "POST",
      cookie: customerCookie,
      body: { transactionId: "9001" },
    })
    assert.equal(verified.status, 200)
    assert.equal(verified.data.order.paymentStatus, "paid")
    assert.equal(verified.data.order.status, "confirmed")

    assert.equal(
      (await db.query("SELECT data FROM products WHERE id=$1", [fixture.id]))
        .rows[0].data.stock,
      beforeStock - 1,
    )

    const duplicate = await request("orders/" + id + "/verify", {
      method: "POST",
      cookie: customerCookie,
      body: { transactionId: "9001" },
    })
    assert.equal(duplicate.status, 200)

    assert.equal(
      (await db.query("SELECT data FROM products WHERE id=$1", [fixture.id]))
        .rows[0].data.stock,
      beforeStock - 1,
    )

    assert.equal(
      (
        await request("orders/" + id + "/cancel", {
          method: "POST",
          cookie: customerCookie,
          body: {},
        })
      ).status,
      409,
    )

    assert.equal(
      (
        await request("products/" + fixture.id + "/reviews", {
          method: "POST",
          cookie: customerCookie,
          body: {
            rating: 5,
            title: "Verified purchase",
            body: "A synthetic review for automated validation.",
          },
        })
      ).status,
      201,
    )
  } finally {
    globalThis.fetch = realFetch
  }
})
