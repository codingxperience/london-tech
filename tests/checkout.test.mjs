import { before, after, test } from "node:test"
import assert from "node:assert/strict"
import { createServer } from "node:http"
import { randomUUID } from "node:crypto"
import {
  calculateDelivery,
  deliveryDefaults,
  deliveryDistricts,
} from "../src/lib/delivery.js"

process.env.NODE_ENV = "test"
process.env.LOCAL_DATABASE_PATH = "memory://"
process.env.ADMIN_EMAIL = "checkout-admin@example.com"
process.env.ADMIN_PASSWORD = "Checkout-test-administrator-46!"
delete process.env.DATABASE_URL
delete process.env.POSTGRES_URL
delete process.env.FLW_SECRET_KEY
const { default: handler } = await import("../server/handler.js")
const { getDatabase } = await import("../server/db.js")
let db, server, origin, admin, customer, other, product
async function request(
  path,
  { method = "GET", body, cookie = customer, headers = {} } = {},
) {
  const response = await fetch(origin + "/api/" + path, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  }
}
async function fixture(id, stock = 10) {
  const seed = (await db.query("SELECT data FROM products LIMIT 1")).rows[0]
    .data
  const p = {
    ...seed,
    id,
    name: "Checkout test product",
    sku: id,
    price: 100000,
    priceConfirmed: true,
    stock,
    options: [],
    colors: [],
    active: true,
  }
  await db.query("INSERT INTO products(id,data) VALUES($1,$2::jsonb)", [
    id,
    JSON.stringify(p),
  ])
  return p
}
const orderBody = (p, extra = {}) => ({
  items: [{ id: p.id, quantity: 1 }],
  customer: {
    name: "Checkout Customer",
    email: "checkout-customer@example.com",
    phone: "0700000000",
  },
  fulfillment: "collection",
  paymentMethod: "cod",
  key: randomUUID(),
  ...extra,
})
before(async () => {
  db = await getDatabase()
  server = createServer(handler)
  await new Promise((r) => server.listen(0, "127.0.0.1", r))
  origin = "http://127.0.0.1:" + server.address().port
  admin = (
    await request("auth/login", {
      method: "POST",
      cookie: null,
      body: {
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      },
    })
  ).cookie
  customer = (
    await request("auth/register", {
      method: "POST",
      cookie: null,
      body: {
        name: "Checkout Customer",
        email: "checkout-customer@example.com",
        password: "Checkout-customer-password-46!",
      },
    })
  ).cookie
  other = (
    await request("auth/register", {
      method: "POST",
      cookie: null,
      body: {
        name: "Other Customer",
        email: "other-checkout@example.com",
        password: "Other-customer-password-46!",
      },
    })
  ).cookie
  product = await fixture("checkout-test-product")
})
after(async () => {
  await new Promise((r) => server.close(r))
  await db.close()
})

test("district-based delivery has editable, bounded rates and explicit overrides, including free delivery", () => {
  assert.equal(deliveryDistricts.length, 135)
  assert.equal(calculateDelivery({}, "Kampala").fee, 5000)
  const far = calculateDelivery({}, "Arua")
  assert.ok(far.distanceKm > 100)
  assert.ok(far.fee <= 60000)
  assert.equal(far.fee % 500, 0)
  assert.equal(
    calculateDelivery({ deliveryFee: 12345 }, "Any district").fee,
    12345,
  )
  const district = deliveryDistricts.find((d) => d.name === "Arua")
  assert.equal(
    calculateDelivery(
      {
        deliveryPricing: {
          ...deliveryDefaults,
          overrides: [{ districtId: district.id, fee: 0 }],
        },
      },
      "Arua",
    ).fee,
    0,
  )
  assert.equal(calculateDelivery({}, "Not a district").fee, null)
})
test("cash orders use authoritative prices without online keys, reserve inventory immediately and are idempotent", async () => {
  const config = await request("config")
  assert.equal(config.data.cashOnDelivery, true)
  assert.equal(config.data.payments, false)
  const id = randomUUID()
  assert.equal(
    (
      await request("checkout/attempts", {
        method: "POST",
        body: {
          id,
          items: [{ id: product.id, quantity: 1 }],
          paymentMethod: "cod",
          fulfillment: "collection",
          phone: "0700000000",
          state: "completed",
          cardNumber: "not-saved",
        },
      })
    ).status,
    200,
  )
  const body = orderBody(product, { attemptId: id, amount: 1, deliveryFee: 1 })
  const result = await request("orders", { method: "POST", body })
  assert.equal(result.status, 201, JSON.stringify(result.data))
  const order = result.data.order
  assert.equal(order.status, "confirmed")
  assert.equal(order.paymentStatus, "cash_due")
  assert.equal(order.amount, 100000)
  assert.equal(order.expiresAt, null)
  assert.equal(
    (await request("orders", { method: "POST", body })).data.order.id,
    order.id,
  )
  assert.equal(
    (await db.query("SELECT data FROM products WHERE id=$1", [product.id]))
      .rows[0].data.stock,
    9,
  )
  assert.equal(
    (
      await db.query(
        "SELECT COUNT(*) AS count FROM stock_reservations WHERE order_id=$1",
        [order.id],
      )
    ).rows[0].count,
    0,
  )
  const attempt = (
    await request("admin/overview", { cookie: admin })
  ).data.checkouts.find((a) => a.id === id)
  assert.equal(attempt.state, "order_placed")
  assert.equal(attempt.orderId, order.id)
  assert.ok(!JSON.stringify(attempt).includes("not-saved"))
  assert.equal(
    (await request("orders/" + order.id + "/pay", { method: "POST" })).status,
    409,
  )
})
test("only an administrator can record actual cash received; fulfillment waits for receipt before completion", async () => {
  const order = (
    await request("orders", { method: "POST", body: orderBody(product) })
  ).data.order
  const patch = (status) =>
    request("admin/orders/" + order.id, {
      method: "PATCH",
      cookie: admin,
      body: { status },
    })
  assert.equal((await patch("shipped")).status, 200)
  assert.equal((await patch("completed")).status, 409)
  assert.equal(
    (
      await request("admin/orders/" + order.id + "/cash-payment", {
        method: "POST",
        body: { confirmed: true },
      })
    ).status,
    403,
  )
  assert.equal(
    (
      await request("admin/orders/" + order.id + "/cash-payment", {
        method: "POST",
        cookie: admin,
        body: { confirmed: false },
      })
    ).status,
    400,
  )
  const first = await request("admin/orders/" + order.id + "/cash-payment", {
    method: "POST",
    cookie: admin,
    body: { confirmed: true },
  })
  assert.equal(first.status, 200, JSON.stringify(first.data))
  assert.equal(first.data.order.paymentStatus, "paid")
  assert.equal(first.data.order.cashReceipt.amount, 100000)
  const again = await request("admin/orders/" + order.id + "/cash-payment", {
    method: "POST",
    cookie: admin,
    body: { confirmed: true },
  })
  assert.equal(
    again.data.order.cashReceipt.receipt,
    first.data.order.cashReceipt.receipt,
  )
  assert.equal((await patch("completed")).status, 200)
  assert.equal(
    (await db.query("SELECT data FROM products WHERE id=$1", [product.id]))
      .rows[0].data.stock,
    8,
  )
})
test("cancelling an unpaid cash order restores stock exactly once and another customer cannot oversell", async () => {
  const order = (
    await request("orders", {
      method: "POST",
      body: orderBody(product, { items: [{ id: product.id, quantity: 2 }] }),
    })
  ).data.order
  assert.equal(
    (await request("orders/" + order.id + "/cancel", { method: "POST" }))
      .status,
    200,
  )
  assert.equal(
    (await request("orders/" + order.id + "/cancel", { method: "POST" }))
      .status,
    409,
  )
  assert.equal(
    (await db.query("SELECT data FROM products WHERE id=$1", [product.id]))
      .rows[0].data.stock,
    8,
  )
  const scarce = await fixture("checkout-scarce-product", 1)
  const outcomes = await Promise.all([
    request("orders", { method: "POST", body: orderBody(scarce) }),
    request("orders", {
      method: "POST",
      cookie: other,
      body: orderBody(scarce),
    }),
  ])
  assert.deepEqual(outcomes.map((r) => r.status).sort(), [201, 409])
})
test("delivery is calculated on the server and unknown destinations cannot silently become free", async () => {
  const details = {
    district: "Arua",
    address: "Test delivery address",
    name: "Checkout Customer",
    email: "checkout-customer@example.com",
    phone: "0700000000",
  }
  const result = await request("orders", {
    method: "POST",
    body: orderBody(product, {
      fulfillment: "delivery",
      customer: details,
      deliveryFee: 0,
    }),
  })
  assert.equal(result.status, 201, JSON.stringify(result.data))
  assert.equal(result.data.order.deliveryFee, calculateDelivery({}, "Arua").fee)
  assert.equal(result.data.order.amount, 100000 + result.data.order.deliveryFee)
  assert.equal(
    (
      await request("orders", {
        method: "POST",
        body: orderBody(product, {
          fulfillment: "delivery",
          customer: { ...details, district: "Unknown destination" },
        }),
      })
    ).status,
    409,
  )
})
test("recovery records genuine failures and inactivity, protects customer details and saves staff follow-up", async () => {
  const id = randomUUID(),
    body = {
      id,
      items: [{ id: product.id, quantity: 10 }],
      paymentMethod: "cod",
      fulfillment: "collection",
      phone: "0700000000",
    }
  assert.equal(
    (await request("checkout/attempts", { method: "POST", body })).status,
    200,
  )
  assert.equal(
    (
      await request("checkout/attempts", {
        method: "POST",
        body,
        cookie: other,
      })
    ).status,
    404,
  )
  assert.equal(
    (
      await request("orders", {
        method: "POST",
        body: orderBody(product, { attemptId: id, items: body.items }),
      })
    ).status,
    409,
  )
  let row = (
    await request("admin/overview", { cookie: admin })
  ).data.checkouts.find((a) => a.id === id)
  assert.equal(row.state, "failed")
  assert.match(row.failureMessage, /stock/)
  assert.equal(
    (
      await request("admin/checkouts/" + id, {
        method: "PATCH",
        body: { status: "contacted" },
      })
    ).status,
    403,
  )
  assert.equal(
    (
      await request("admin/checkouts/" + id, {
        method: "PATCH",
        cookie: admin,
        body: {
          status: "contacted",
          note: "Customer asked for another model.",
        },
      })
    ).status,
    200,
  )
  row = (
    await request("admin/overview", { cookie: admin })
  ).data.checkouts.find((a) => a.id === id)
  assert.equal(row.followUpStatus, "contacted")
  const stale = randomUUID()
  await request("checkout/attempts", {
    method: "POST",
    body: { ...body, id: stale },
  })
  await db.query(
    "UPDATE checkout_attempts SET updated_at=NOW()-INTERVAL '31 minutes' WHERE id=$1",
    [stale],
  )
  row = (
    await request("admin/overview", { cookie: admin })
  ).data.checkouts.find((a) => a.id === stale)
  assert.equal(row.state, "abandoned")
})

test("changed checkout totals require renewed customer confirmation without consuming stock", async () => {
  const p = await fixture("checkout-price-change", 2)
  const changed = await request("orders", {
    method: "POST",
    body: orderBody(p, { expectedTotal: 99999 }),
  })
  assert.equal(changed.status, 409)
  assert.match(changed.data.error, /changed/)
  assert.equal(
    (await db.query("SELECT data FROM products WHERE id=$1", [p.id])).rows[0]
      .data.stock,
    2,
  )
  const accepted = await request("orders", {
    method: "POST",
    body: orderBody(p, { expectedTotal: 100000 }),
  })
  assert.equal(accepted.status, 201)
})
test("payment startup failures and signed failure webhooks appear for follow-up without marking an order paid", async () => {
  const p = await fixture("checkout-provider-failure", 5),
    id = randomUUID()
  await request("checkout/attempts", {
    method: "POST",
    body: {
      id,
      items: [{ id: p.id, quantity: 1 }],
      paymentMethod: "mtn",
      fulfillment: "collection",
    },
  })
  process.env.FLW_SECRET_KEY = "FLWSECK_TEST_fixture"
  process.env.FLW_SECRET_HASH = "checkout-fixture-webhook-secret"
  const originalFetch = globalThis.fetch
  try {
    const order = (
      await request("orders", {
        method: "POST",
        body: orderBody(p, { paymentMethod: "mtn", attemptId: id }),
      })
    ).data.order
    globalThis.fetch = async (input, options) =>
      String(input).startsWith("https://api.flutterwave.com/")
        ? new Response(JSON.stringify({ status: "error" }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
          })
        : originalFetch(input, options)
    assert.equal(
      (await request("orders/" + order.id + "/pay", { method: "POST" })).status,
      502,
    )
    let attempt = (
      await request("admin/overview", { cookie: admin })
    ).data.checkouts.find((a) => a.id === id)
    assert.equal(attempt.state, "failed")
    assert.equal(attempt.failureStage, "payment")
    const hook = {
      event: "charge.completed",
      data: { status: "failed", tx_ref: order.id },
    }
    assert.equal(
      (
        await request("payments/webhook", {
          method: "POST",
          cookie: null,
          body: hook,
          headers: { "verif-hash": "wrong" },
        })
      ).status,
      401,
    )
    assert.equal(
      (
        await request("payments/webhook", {
          method: "POST",
          cookie: null,
          body: hook,
          headers: { "verif-hash": process.env.FLW_SECRET_HASH },
        })
      ).status,
      200,
    )
    assert.equal(
      (await request("orders/" + order.id)).data.order.paymentStatus,
      "unpaid",
    )
    assert.equal(
      (await db.query("SELECT data FROM products WHERE id=$1", [p.id])).rows[0]
        .data.stock,
      5,
    )
  } finally {
    globalThis.fetch = originalFetch
    delete process.env.FLW_SECRET_KEY
    delete process.env.FLW_SECRET_HASH
  }
})
test("cash receipt and cancellation cannot both win a simultaneous request", async () => {
  const p = await fixture("checkout-cash-race", 1),
    order = (await request("orders", { method: "POST", body: orderBody(p) }))
      .data.order
  const outcomes = await Promise.all([
    request("orders/" + order.id + "/cancel", { method: "POST" }),
    request("admin/orders/" + order.id + "/cash-payment", {
      method: "POST",
      cookie: admin,
      body: { confirmed: true },
    }),
  ])
  assert.deepEqual(outcomes.map((r) => r.status).sort(), [200, 409])
  const current = (await request("orders/" + order.id)).data.order,
    stock = (await db.query("SELECT data FROM products WHERE id=$1", [p.id]))
      .rows[0].data.stock
  if (current.status === "cancelled") {
    assert.equal(current.paymentStatus, "cash_due")
    assert.equal(stock, 1)
  } else {
    assert.equal(current.paymentStatus, "paid")
    assert.equal(stock, 0)
  }
})
