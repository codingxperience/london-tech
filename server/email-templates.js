import { money, storeDefaults } from "../src/data/catalog.js"

const brand = "London Tech Stores"
const fallbackOrigin = "https://london-tech.vercel.app"
const navy = "#09294f"
const red = "#cf263c"
const muted = "#66758a"
const line = "#e4eaf1"

const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  )
const concise = (value, limit = 300) =>
  String(value ?? "")
    .replace(/[\x00-\x1f\x7f\s]+/g, " ")
    .trim()
    .slice(0, limit)

function siteOrigin() {
  try {
    const url = new URL(process.env.PUBLIC_SITE_URL || fallbackOrigin)
    if (url.protocol === "https:" && !url.username && !url.password)
      return url.origin
  } catch {}
  return fallbackOrigin
}

function safeUrl(value, origin = siteOrigin()) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    /[\x00-\x1f\x7f]/.test(value)
  )
    return ""
  try {
    const url = new URL(value, origin)
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : ""
  } catch {
    return ""
  }
}

const paragraph = (text, style = "") =>
  `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;${style}">${escape(text)}</p>`

function button(url, label) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:26px 0 8px"><tr><td bgcolor="${navy}" style="border-radius:6px"><a href="${escape(url)}" style="display:inline-block;padding:14px 25px;border:1px solid ${navy};border-radius:6px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:20px;color:#ffffff;text-decoration:none">${escape(label)}</a></td></tr></table>`
}

function emailFrame({ title, preview, content }) {
  const origin = siteOrigin()
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escape(title)}</title><style>@media only screen and (max-width:620px){.email-outer{padding:18px 12px!important}.email-content{padding:25px 22px!important}.email-heading{font-size:25px!important}.email-code{font-size:34px!important;letter-spacing:7px!important}.email-item-image{width:52px!important;height:52px!important}.email-progress{font-size:10px!important}}</style></head><body style="margin:0;padding:0;background:#f4f6f9;color:${navy};font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all">${escape(preview)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td class="email-outer" align="center" style="padding:32px 16px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px"><tr><td style="padding:0 0 22px"><a href="${origin}/" style="text-decoration:none"><img src="${origin}/assets/london-tech-logo.png" alt="${brand}" width="76" height="76" style="display:block;width:76px;height:76px;border:0;border-radius:8px"></a></td></tr><tr><td class="email-content" bgcolor="#ffffff" style="padding:34px 36px;border:1px solid ${line};border-top:3px solid ${red};border-radius:0 0 10px 10px"><h1 class="email-heading" style="margin:0 0 22px;font-size:29px;line-height:1.22;font-weight:700;letter-spacing:-.6px;color:${navy}">${escape(title)}</h1>${content}</td></tr><tr><td style="padding:22px 5px 0;color:${muted};font-size:12px;line-height:1.7"><p style="margin:0 0 9px">Need a hand? <a href="${origin}/help/" style="color:${navy};text-decoration:underline">Contact our team</a> or call <a href="tel:+256788341111" style="color:${navy};text-decoration:none">0788341111</a> / <a href="tel:+256709417273" style="color:${navy};text-decoration:none">0709417273</a>.</p><p style="margin:0 0 9px">${brand}<br>${escape(storeDefaults.address)}, Kampala.</p><p style="margin:0"><a href="${origin}/" style="color:${muted}">Shop</a> &nbsp;·&nbsp; <a href="${origin}/privacy/" style="color:${muted}">Privacy</a> &nbsp;·&nbsp; <a href="${origin}/terms/" style="color:${muted}">Terms</a></p></td></tr></table></td></tr></table></body></html>`
}

function footerText() {
  return `Need help? ${siteOrigin()}/help/\n0788341111 / 0709417273\n${brand}\n${storeDefaults.address}, Kampala.`
}

export function verificationEmail({ code, expiresMinutes = 10 }) {
  if (!/^\d{6}$/.test(String(code)))
    throw new TypeError("Invalid verification code")
  const minutes =
    Number.isInteger(expiresMinutes) &&
    expiresMinutes > 0 &&
    expiresMinutes <= 60
      ? expiresMinutes
      : 10
  const title = "Verify your email"
  const subject = `Your ${brand} verification code`
  const instructions = `Enter this code to continue. It expires in ${minutes} minutes.`
  const caution =
    "Keep this code private. If you didn’t request it, you can ignore this email."
  const text = `${title}\n\nYour verification code: ${code}\n\n${instructions}\n${caution}\n\n${footerText()}`
  const html = emailFrame({
    title,
    preview: `Your verification code is ${code}. Valid for ${minutes} minutes.`,
    content: `${paragraph(instructions)}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0"><tr><td align="center" bgcolor="#f4f6fa" style="padding:23px 10px;border:1px solid ${line};border-radius:7px"><span class="email-code" style="display:inline-block;padding-left:9px;font-family:'Courier New',monospace;font-size:40px;font-weight:700;letter-spacing:9px;line-height:1.3;color:${navy}">${escape(code)}</span></td></tr></table>${paragraph(caution, `color:${muted};font-size:13px;margin-bottom:0;`)}`,
  })
  return { subject, text, html }
}

export function passwordResetEmail({ url, expiresMinutes = 30 }) {
  let link = safeUrl(url)
  // Local verification may use HTTP on loopback; customer reset links stay HTTPS.
  if (!link && process.env.NODE_ENV !== "production") {
    try {
      const local = new URL(url)
      if (
        local.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(local.hostname) &&
        !local.username &&
        !local.password
      )
        link = local.href
    } catch {}
  }
  const localOnly =
    link &&
    process.env.NODE_ENV !== "production" &&
    new URL(link).protocol === "http:"
  if (!link || (!localOnly && new URL(link).origin !== siteOrigin()))
    throw new TypeError("Invalid password reset link")
  const minutes =
    Number.isInteger(expiresMinutes) &&
    expiresMinutes > 0 &&
    expiresMinutes <= 60
      ? expiresMinutes
      : 30
  const title = "Reset your password"
  const intro = `Choose a new password using the link below. It expires in ${minutes} minutes.`
  const caution =
    "If you didn’t request a password reset, ignore this email. Your password will stay the same."
  return {
    subject: `Reset your ${brand} password`,
    text: `${title}\n\n${intro}\n\nReset password: ${link}\n\n${caution}\n\n${footerText()}`,
    html: emailFrame({
      title,
      preview: `Your password reset link is valid for ${minutes} minutes.`,
      content: `${paragraph(intro)}${button(link, "Reset password")}${paragraph(caution, `margin-top:24px;margin-bottom:0;color:${muted};font-size:13px;`)}`,
    }),
  }
}

const price = (value) => {
  if (value == null || value === "") return null
  const n = Number(value)
  return Number.isSafeInteger(n) && n >= 0 ? n : null
}

function statusIntro(status, collection) {
  return (
    {
      pending_payment:
        "We’ve received your order. Complete payment to confirm it.",
      quote_requested:
        "Your request is with our team. View your order for the latest details.",
      quoted:
        "Your quote is ready. Review the items, price and validity in your account.",
      confirmed:
        "Your order is confirmed. We’ll keep you informed as it moves.",
      processing: "Our team is preparing your order.",
      ready: collection
        ? "Your order is ready to collect from our Arua Park store."
        : "Your order is packed and ready for dispatch.",
      shipped:
        "Your order has been dispatched. View the delivery details below.",
      completed: collection
        ? "Your order has been collected. Thank you for shopping with us."
        : "Your order has been delivered. Thank you for shopping with us.",
      cancelled:
        "Your order has been cancelled. View your account or contact our team if you need help.",
      review:
        "Our team is reviewing your order. View its latest details in your account.",
    }[status] ||
    "There’s an update to your order. View the latest details in your account."
  )
}

function progress(status, collection) {
  const stages = [
    ["confirmed", "Confirmed"],
    ["processing", "Preparing"],
    ["ready", collection ? "Ready" : "Packed"],
    ...(!collection ? [["shipped", "Dispatched"]] : []),
    ["completed", collection ? "Collected" : "Delivered"],
  ]
  const active = stages.findIndex(([value]) => value === status)
  if (active < 0) return ""
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="table-layout:fixed;margin:24px 0 28px"><tr>${stages.map(([value, label], index) => `<td class="email-progress" align="center" style="padding:9px 2px 0;border-top:3px solid ${index <= active ? navy : line};font-size:11px;line-height:1.35;color:${index <= active ? navy : muted};font-weight:${value === status ? "700" : "400"}">${escape(label)}</td>`).join("")}</tr></table>`
}

function itemLines(items) {
  return (Array.isArray(items) ? items : []).slice(0, 30).map((item) => {
    const name = concise(item.name, 160) || "Item"
    const quantity =
      Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : 1
    const unitPrice = price(item.unitPrice)
    const total = unitPrice == null ? null : price(unitPrice * quantity)
    const detail = [concise(item.option, 100), concise(item.color, 80)]
      .filter(Boolean)
      .join(" · ")
    return { name, quantity, total, detail, image: safeUrl(item.image) }
  })
}

export function orderEmail({ orderId, payload = {} }) {
  const origin = siteOrigin()
  const id = concise(orderId, 120)
  const status = concise(payload.status, 40)
  const title = concise(payload.title, 160) || "Order updated"
  const collection = payload.fulfillment === "collection"
  const cancelled = status === "cancelled" || /cancelled/i.test(title)
  const test = payload.test === true
  const name = concise(payload.name, 100)
  const url = `${origin}/account/orders/${encodeURIComponent(id)}/`
  const intro = statusIntro(status, collection)
  const amount = price(payload.amount)
  const subtotal = price(payload.subtotal)
  const deliveryFee = price(payload.deliveryFee)
  const items = itemLines(payload.items)
  const district = concise(payload.district || payload.address?.district, 100)
  const tracking =
    payload.tracking && typeof payload.tracking === "object"
      ? payload.tracking
      : {}
  const carrier = concise(tracking.carrier, 100)
  const reference = concise(tracking.reference, 100)
  const trackingUrl = safeUrl(tracking.url)
  const date =
    /^\d{4}-\d{2}-\d{2}$/.test(tracking.estimatedDate || "") &&
    Number.isFinite(Date.parse(tracking.estimatedDate))
      ? new Intl.DateTimeFormat("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(tracking.estimatedDate))
      : ""
  const receipt = concise(payload.receipt, 100)
  const payment = test
    ? "Test payment · no money collected."
    : cancelled
      ? ""
      : payload.payment === "cash_due"
        ? `Pay in cash ${collection ? "at pickup" : "on delivery"}.`
        : payload.payment === "paid"
          ? "Payment received."
          : payload.payment === "unpaid"
            ? "Payment pending."
            : ""
  const delivery = collection
    ? `Store collection · ${storeDefaults.address}, Kampala.`
    : district
      ? `Delivery to ${district}.`
      : "Delivery."
  const totals = [
    ...(subtotal != null ? [["Subtotal", money(subtotal)]] : []),
    ...(deliveryFee != null
      ? [
          [
            collection ? "Collection" : "Delivery",
            deliveryFee === 0 ? "Free" : money(deliveryFee),
          ],
        ]
      : []),
    ...(amount != null ? [["Total", money(amount)]] : []),
  ]
  const trackingLines = [
    carrier ? `Courier: ${carrier}` : "",
    reference ? `Tracking reference: ${reference}` : "",
    date ? `Estimated arrival: ${date}` : "",
  ].filter(Boolean)
  const text = [
    title,
    `Order ${id}`,
    name ? `Hello, ${name}.` : "",
    intro,
    test ? "This order uses a simulated payment. No money was collected." : "",
    ...items.map(
      (item) =>
        `${item.name}${
          item.detail ? " · " + item.detail : ""
        } × ${item.quantity}${
          item.total == null ? "" : " — " + money(item.total)
        }`,
    ),
    ...totals.map(([label, value]) => `${label} ${value}`),
    payment,
    receipt ? `Cash receipt ${receipt}` : "",
    delivery,
    ...trackingLines,
    trackingUrl ? `Track with the courier: ${trackingUrl}` : "",
    `View your order: ${url}`,
    footerText(),
  ]
    .filter(Boolean)
    .join("\n\n")
  const showImages = items.some((item) => item.image)
  const itemHtml = items.length
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 20px">${items.map((item) => `<tr>${showImages ? `<td width="76" valign="top" style="padding:14px 12px 14px 0;border-bottom:1px solid ${line}">${item.image ? `<img class="email-item-image" src="${escape(item.image)}" alt="${escape(item.name)}" width="64" height="64" style="display:block;object-fit:contain;border:1px solid ${line};border-radius:6px;width:64px;height:64px">` : ""}</td>` : ""}<td valign="top" style="padding:14px 0;border-bottom:1px solid ${line};font-size:14px;line-height:1.5;color:${navy};overflow-wrap:anywhere"><strong>${escape(item.name)}</strong>${item.detail ? `<br><span style="font-size:12px;color:${muted}">${escape(item.detail)}</span>` : ""}<br><span style="font-size:12px;color:${muted}">Qty ${item.quantity}</span></td><td width="112" align="right" valign="top" style="padding:14px 0 14px 10px;border-bottom:1px solid ${line};font-size:13px;line-height:1.5;font-weight:700;color:${navy}">${item.total == null ? "" : escape(money(item.total))}</td></tr>`).join("")}</table>`
    : ""
  const totalsHtml = totals.length
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:21px">${totals.map(([label, value]) => `<tr><td style="padding:5px 0;font-size:${label === "Total" ? "17" : "13"}px;color:${label === "Total" ? navy : muted};font-weight:${label === "Total" ? "700" : "400"}">${label}</td><td align="right" style="padding:5px 0;font-size:${label === "Total" ? "18" : "13"}px;color:${navy};font-weight:${label === "Total" ? "700" : "400"}">${escape(value)}</td></tr>`).join("")}</table>`
    : ""
  const content = `${paragraph(`Order ${id}`, `margin-bottom:16px;font-size:12px;color:${muted};letter-spacing:.4px;`)}${
    name ? paragraph(`Hello, ${name}.`, "margin-bottom:9px;") : ""
  }${paragraph(intro)}${
    test
      ? paragraph(
          "This order uses a simulated payment. No money was collected.",
          `padding:12px 14px;background:#fff5e9;border-left:3px solid #ad6b1e;font-size:13px;`,
        )
      : ""
  }${progress(status, collection)}${itemHtml}${totalsHtml}${
    payment
      ? paragraph(payment, "font-size:13px;font-weight:700;margin-bottom:8px;")
      : ""
  }${
    receipt
      ? paragraph(`Cash receipt ${receipt}`, `font-size:12px;color:${muted};`)
      : ""
  }<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:18px;border-top:1px solid ${line}"><tr><td style="padding-top:18px">${paragraph(delivery, `font-size:13px;margin-bottom:${trackingLines.length ? "8" : "0"}px;`)}${trackingLines.map((value) => paragraph(value, `font-size:13px;color:${muted};margin-bottom:4px;`)).join("")}${
    trackingUrl
      ? `<p style="font-size:13px;margin:12px 0 0"><a href="${escape(trackingUrl)}" style="color:${navy};text-decoration:underline">Track with the courier</a></p>`
      : ""
  }</td></tr></table>${button(url, "View your order")}`
  return {
    subject: `${title} · ${id}`,
    text,
    html: emailFrame({
      title,
      preview: `${title}. Order ${id}${
        amount == null ? "" : " · " + money(amount)
      }`,
      content,
    }),
  }
}
