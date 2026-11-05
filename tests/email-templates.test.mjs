import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import { Window } from "happy-dom"
import { emailProvider, emailReady, sendEmail } from "../server/email.js"
import {
  orderEmail,
  passwordResetEmail,
  verificationEmail,
} from "../server/email-templates.js"
import { queueOrderEmail, deliverOrderEmail } from "../server/order-emails.js"

const originalEnv = Object.fromEntries(
  [
    "PUBLIC_SITE_URL",
    "EMAIL_PROVIDER",
    "RESEND_API_KEY",
    "EMAIL_FROM",
    "GMAIL_USER",
    "GMAIL_APP_PASSWORD",
  ].map((name) => [name, process.env[name]]),
)
before(() => {
  process.env.PUBLIC_SITE_URL = "https://london-tech.vercel.app"
  process.env.EMAIL_PROVIDER = "resend"
  delete process.env.RESEND_API_KEY
  delete process.env.EMAIL_FROM
})
after(() => {
  for (const [name, value] of Object.entries(originalEnv)) {
    if (value == null) delete process.env[name]
    else process.env[name] = value
  }
})

function documentFor(html) {
  const win = new Window()
  return new win.DOMParser().parseFromString(html, "text/html")
}

test("verification emails contain a readable code, expiry and original logo without simulated Gmail controls", () => {
  const message = verificationEmail({ code: "004281", expiresMinutes: 10 })
  assert.match(message.subject, /London Tech Stores verification code/)
  assert.match(message.text, /Your verification code: 004281/)
  assert.match(message.text, /10 minutes/)
  assert.match(message.text, /If you didn’t request it/)
  const doc = documentFor(message.html)
  assert.equal(doc.querySelector(".email-code").textContent, "004281")
  assert.equal(
    doc.querySelector("img").getAttribute("src"),
    "https://london-tech.vercel.app/assets/london-tech-logo.png",
  )
  assert.equal(doc.querySelector("button"), null)
  assert.match(doc.body.textContent, /Keep this code private/)
  assert.equal(doc.querySelector("table").getAttribute("role"), "presentation")
  assert.match(message.html, /max-width:600px/)
  assert.match(message.html, /max-width:620px/)
  assert.throws(
    () => verificationEmail({ code: "1234" }),
    /Invalid verification code/,
  )
  assert.throws(
    () => verificationEmail({ code: '<img onerror="bad">' }),
    /Invalid verification code/,
  )
})

test("password reset messages escape link attributes and reject unsafe or unrelated destinations", () => {
  const url =
    'https://london-tech.vercel.app/reset-password/?token=abc&next="bad"'
  const message = passwordResetEmail({ url })
  const doc = documentFor(message.html)
  const link = [...doc.querySelectorAll("a")].find(
    (a) => a.textContent === "Reset password",
  )
  assert.equal(link.getAttribute("href"), new URL(url).href)
  assert.match(message.text, /30 minutes/)
  assert.match(message.text, /Your password will stay the same/)
  assert.match(message.text, /Reset password: https:/)
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,bad",
    "http://london-tech.vercel.app/reset/",
    "https://unrelated.example/reset/",
    "https://user:password@london-tech.vercel.app/reset/",
  ])
    assert.throws(
      () => passwordResetEmail({ url: value }),
      /Invalid password reset link/,
    )
})

const samplePayload = {
  title: "Order confirmed",
  status: "confirmed",
  name: "Samson",
  payment: "cash_due",
  fulfillment: "delivery",
  district: "Kampala",
  address: { district: "Kampala", address: "Private street address" },
  amount: 30000,
  subtotal: 20000,
  deliveryFee: 10000,
  items: [
    {
      name: "USB-C Cable",
      quantity: 2,
      unitPrice: 10000,
      option: "2 metres",
      color: "Black",
      image: "/assets/cable.png",
    },
  ],
}

test("order messages show the true item and total breakdown, cash terms and authenticated tracking link", () => {
  const message = orderEmail({ orderId: "LT-42", payload: samplePayload })
  assert.equal(message.subject, "Order confirmed · LT-42")
  for (const content of [
    "USB-C Cable",
    "2 metres · Black",
    "× 2",
    "Subtotal UGX 20,000",
    "Delivery UGX 10,000",
    "Total UGX 30,000",
    "Pay in cash on delivery.",
    "Delivery to Kampala.",
    "/account/orders/LT-42/",
  ])
    assert.ok(message.text.includes(content), content)
  assert.doesNotMatch(message.text, /Payment received|Private street address/)
  assert.doesNotMatch(message.html, /Private street address/)
  const doc = documentFor(message.html)
  assert.ok(
    doc.querySelector(
      'img[src="https://london-tech.vercel.app/assets/cable.png"]',
    ),
  )
  const progress = [...doc.querySelectorAll(".email-progress")]
  assert.equal(progress[0].textContent, "Confirmed")
  assert.equal(progress.at(-1).textContent, "Delivered")
})

test("order HTML escapes customer and product text and drops unsafe image and courier URLs", () => {
  const message = orderEmail({
    orderId: 'LT-"<42>',
    payload: {
      ...samplePayload,
      name: "<script>bad()</script>",
      title: 'Order <img src=x onerror="bad()"> updated',
      items: [
        {
          name: '<img src=x onerror="bad()">',
          quantity: 1,
          unitPrice: 100,
          image: "javascript:alert(1)",
          color: 'Blue " onmouseover="bad()',
        },
      ],
      tracking: {
        carrier: "<script>bad()</script>",
        reference: 'ABC" onmouseover="bad()',
        url: "javascript:alert(1)",
      },
    },
  })
  const doc = documentFor(message.html)
  assert.equal(doc.querySelectorAll("script").length, 0)
  assert.equal(doc.querySelectorAll("img").length, 1)
  for (const el of doc.querySelectorAll("*"))
    for (const attribute of el.attributes)
      assert.ok(!/^on/i.test(attribute.name), attribute.name)
  assert.match(message.html, /&lt;img src=x onerror=&quot;bad\(\)&quot;&gt;/)
  assert.ok(
    ![...doc.querySelectorAll("a")].some((a) =>
      /javascript:/.test(a.getAttribute("href")),
    ),
  )
  assert.ok(
    [...doc.querySelectorAll("a")].some((a) =>
      a.getAttribute("href").includes("LT-%22%3C42%3E"),
    ),
  )
})

test("test, cancellation and collection notifications do not misrepresent payment or fulfillment", () => {
  const simulated = orderEmail({
    orderId: "LT-TEST",
    payload: {
      ...samplePayload,
      test: true,
      payment: "paid",
      title: "Test order · Payment confirmed",
    },
  })
  assert.match(simulated.text, /simulated payment. No money was collected/)
  assert.doesNotMatch(simulated.text, /Payment received\./)
  const cancelled = orderEmail({
    orderId: "LT-CANCEL",
    payload: {
      ...samplePayload,
      status: "cancelled",
      title: "Order cancelled",
    },
  })
  assert.match(cancelled.text, /has been cancelled/)
  assert.doesNotMatch(cancelled.text, /Pay in cash/)
  assert.equal(
    documentFor(cancelled.html).querySelector(".email-progress"),
    null,
  )
  const collected = orderEmail({
    orderId: "LT-COLLECT",
    payload: {
      ...samplePayload,
      status: "completed",
      title: "Order collected",
      fulfillment: "collection",
      payment: "paid",
      receipt: "CASH-421",
      deliveryFee: 0,
    },
  })
  assert.match(collected.text, /has been collected/)
  assert.match(collected.text, /Cash receipt CASH-421/)
  assert.match(collected.text, /Collection Free/)
  assert.doesNotMatch(collected.text, /has been delivered/)
  assert.equal(
    documentFor(collected.html).querySelectorAll(".email-progress").length,
    4,
  )
})

test("dispatch messages include real courier details without inventing delivery dates", () => {
  const message = orderEmail({
    orderId: "LT-SHIP",
    payload: {
      ...samplePayload,
      status: "shipped",
      title: "Order dispatched",
      tracking: {
        carrier: "Courier Co",
        reference: "UG-42",
        estimatedDate: "2026-11-09",
        url: "https://courier.example/track?reference=UG-42&from=store",
      },
    },
  })
  for (const content of [
    "has been dispatched",
    "Courier: Courier Co",
    "Tracking reference: UG-42",
    "Estimated arrival: 9 Nov 2026",
    "Track with the courier: https://courier.example/",
  ])
    assert.ok(message.text.includes(content), content)
  const withoutDate = orderEmail({
    orderId: "LT-SHIP",
    payload: {
      ...samplePayload,
      status: "shipped",
      tracking: { estimatedDate: "not-known" },
    },
  })
  assert.doesNotMatch(withoutDate.text, /Estimated arrival/)
  assert.ok(
    ![...documentFor(withoutDate.html).querySelectorAll("a")].some(
      (a) => a.textContent === "Track with the courier",
    ),
  )
})

test("invalid configured origins cannot inject logo or footer links", () => {
  const previous = process.env.PUBLIC_SITE_URL
  try {
    process.env.PUBLIC_SITE_URL = "javascript:alert(1)"
    const message = verificationEmail({ code: "123456" })
    assert.match(
      message.html,
      /https:\/\/london-tech.vercel.app\/assets\/london-tech-logo.png/,
    )
    assert.doesNotMatch(message.html, /javascript:/)
  } finally {
    process.env.PUBLIC_SITE_URL = previous
  }
})

test("shared sender reports acceptance and safe failures without leaking provider data", async () => {
  const realFetch = globalThis.fetch
  const message = verificationEmail({ code: "123456" })
  const input = {
    ...message,
    to: "shopper@example.com",
    idempotencyKey: "auth/challenge-fixture",
  }
  try {
    assert.equal(emailReady(), false)
    await assert.rejects(
      sendEmail(input),
      (e) => e.status === 503 && e.deliveryUncertain === false,
    )
    process.env.RESEND_API_KEY = "fixture-api-key"
    process.env.EMAIL_FROM = "London Tech <orders@example.com>"
    let sent
    globalThis.fetch = async (url, options) => {
      sent = { url, options, body: JSON.parse(options.body) }
      return Response.json({ id: "accepted-fixture" })
    }
    assert.equal(emailReady(), true)
    assert.deepEqual(await sendEmail(input), { id: "accepted-fixture" })
    assert.equal(sent.url, "https://api.resend.com/emails")
    assert.deepEqual(sent.body.to, ["shopper@example.com"])
    assert.equal(sent.options.headers["Idempotency-Key"], input.idempotencyKey)
    globalThis.fetch = async () =>
      Response.json(
        { message: "secret-provider-response shopper@example.com 123456" },
        { status: 403 },
      )
    await assert.rejects(sendEmail(input), (e) => {
      assert.equal(e.status, 503)
      assert.equal(e.deliveryUncertain, false)
      assert.doesNotMatch(
        e.message,
        /secret-provider-response|shopper@|123456|fixture-api-key/,
      )
      return true
    })
    globalThis.fetch = async () => {
      throw new Error("secret-provider-response")
    }
    await assert.rejects(
      sendEmail(input),
      (e) =>
        e.status === 503 &&
        e.deliveryUncertain === true &&
        !e.message.includes("secret-provider-response"),
    )
    globalThis.fetch = async () => Response.json({})
    await assert.rejects(
      sendEmail(input),
      (e) => e.status === 503 && e.deliveryUncertain === true,
    )
    await assert.rejects(
      sendEmail({ ...input, subject: "Heading\r\nBcc: injected@example.com" }),
      (e) => e.status === 503,
    )
  } finally {
    globalThis.fetch = realFetch
    delete process.env.RESEND_API_KEY
    delete process.env.EMAIL_FROM
  }
})

test("queued order snapshots preserve their exact rendered contents for idempotent retry", async () => {
  let saved
  const order = {
    id: "LT-IMMUTABLE",
    status: "shipped",
    amount: 30000,
    payment_status: "cash_due",
    details: {
      customer: {
        email: "shopper@example.com",
        name: "Samson",
        district: "Kampala",
        address: "Private street",
      },
      items: samplePayload.items,
      fulfillment: "delivery",
      subtotal: 20000,
      deliveryFee: 10000,
      tracking: { reference: "UG-42" },
    },
  }
  await queueOrderEmail(
    {
      query: async (sql, values) => {
        saved = JSON.parse(values[2])
        return { rows: [] }
      },
    },
    order,
    "dispatch",
    "Order dispatched",
  )
  assert.equal(saved.status, "shipped")
  assert.equal(saved.address.address, "Private street")
  assert.match(saved.message.text, /UG-42/)
  assert.doesNotMatch(saved.message.text, /Private street/)
  order.details.items[0].name = "Changed after enqueue"
  order.details.tracking.reference = "NEW-REFERENCE"
  assert.doesNotMatch(saved.message.text, /Changed after enqueue|NEW-REFERENCE/)
  const realFetch = globalThis.fetch
  try {
    process.env.RESEND_API_KEY = "fixture-api-key"
    process.env.EMAIL_FROM = "London Tech <orders@example.com>"
    let request
    globalThis.fetch = async (url, options) => {
      request = JSON.parse(options.body)
      return Response.json({ id: "immutable-fixture" })
    }
    await deliverOrderEmail(
      {
        query: async (sql) => ({
          rows: sql.includes("RETURNING *")
            ? [
                {
                  id: "LT-IMMUTABLE-dispatch",
                  order_id: order.id,
                  payload: saved,
                  attempts: 1,
                },
              ]
            : [],
        }),
      },
      "LT-IMMUTABLE-dispatch",
      order.id,
    )
    assert.equal(request.html, saved.message.html)
    assert.equal(request.text, saved.message.text)
    assert.equal(request.subject, saved.message.subject)
  } finally {
    globalThis.fetch = realFetch
    delete process.env.RESEND_API_KEY
    delete process.env.EMAIL_FROM
  }
})

test("Gmail uses verified transport settings, a fixed sender and stable trace IDs without claiming deduplication", async () => {
  process.env.EMAIL_PROVIDER = "gmail"
  process.env.GMAIL_USER = "LONDONTECHSTORE1@gmail.com"
  process.env.GMAIL_APP_PASSWORD = "abcd efgh ijkl mnop"
  process.env.EMAIL_FROM = "Spoofed <unrelated@example.com>"
  const input = {
    ...verificationEmail({ code: "123456" }),
    to: "shopper@example.com",
    idempotencyKey: "verify/gmail-fixture",
  }
  let options
  let sent
  let creations = 0
  let closes = 0
  const transport = {
    close: () => {
      closes++
    },
    sendMail: async (message) => {
      sent = message
      return { accepted: message.to, messageId: message.messageId }
    },
  }
  const createGmailTransport = (value) => {
    options = value
    creations++
    return transport
  }
  try {
    assert.equal(emailProvider(), "gmail")
    assert.equal(emailReady(), true)
    const first = await sendEmail(input, { createGmailTransport })
    const second = await sendEmail(input, { createGmailTransport })
    assert.equal(first.id, second.id)
    assert.match(first.id, /^<[a-f0-9]{64}@london-tech\.vercel\.app>$/)
    assert.equal(creations, 1)
    assert.equal(sent.from, "London Tech Stores <londontechstore1@gmail.com>")
    assert.equal(options.host, "smtp.gmail.com")
    assert.equal(options.port, 465)
    assert.equal(options.secure, true)
    assert.equal(options.tls.rejectUnauthorized, true)
    assert.equal(options.tls.minVersion, "TLSv1.2")
    assert.equal(options.auth.pass, "abcdefghijklmnop")
    assert.equal(options.disableFileAccess, true)
    assert.equal(options.disableUrlAccess, true)
    assert.equal(sent.disableFileAccess, true)
    assert.equal(sent.disableUrlAccess, true)
    assert.ok(options.connectionTimeout <= 8000)
    assert.ok(options.socketTimeout <= 8000)
    process.env.GMAIL_APP_PASSWORD = "new-app-password-fixture"
    await sendEmail(input, { createGmailTransport })
    assert.equal(creations, 2)
    assert.equal(closes, 1)
    transport.sendMail = async () => {
      throw Object.assign(new Error("private-google-diagnostic"), {
        code: "EAUTH",
        responseCode: 535,
      })
    }
    await assert.rejects(
      sendEmail(input, { createGmailTransport }),
      (e) =>
        e.status === 503 &&
        e.deliveryUncertain === false &&
        !e.message.includes("private-google-diagnostic"),
    )
    transport.sendMail = async () => {
      throw Object.assign(new Error("private-google-diagnostic"), {
        code: "ETIMEDOUT",
      })
    }
    await assert.rejects(
      sendEmail(input, { createGmailTransport }),
      (e) =>
        e.status === 503 &&
        e.deliveryUncertain === true &&
        !e.message.includes("private-google-diagnostic"),
    )
    process.env.GMAIL_USER = "not-a-gmail@example.com"
    assert.equal(emailProvider(), null)
    assert.equal(emailReady(), false)
    process.env.GMAIL_USER = "londontechstore1@gmail.com"
    process.env.GMAIL_APP_PASSWORD = "    "
    assert.equal(emailReady(), false)
  } finally {
    process.env.EMAIL_PROVIDER = "resend"
    delete process.env.GMAIL_USER
    delete process.env.GMAIL_APP_PASSWORD
    delete process.env.EMAIL_FROM
  }
})
