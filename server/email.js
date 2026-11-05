import { createHash } from "node:crypto"
import nodemailer from "nodemailer"

const gmailUser = () =>
  String(process.env.GMAIL_USER || "")
    .trim()
    .toLowerCase()
const gmailPassword = () =>
  String(process.env.GMAIL_APP_PASSWORD || "").replace(/\s/g, "")

export function emailProvider() {
  const selected = String(process.env.EMAIL_PROVIDER || "")
    .trim()
    .toLowerCase()
  if (selected === "gmail")
    return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@(gmail|googlemail)\.com$/.test(
      gmailUser(),
    ) && gmailPassword()
      ? "gmail"
      : null
  if (selected && selected !== "resend") return null
  return process.env.RESEND_API_KEY && process.env.EMAIL_FROM ? "resend" : null
}

export const emailReady = () => emailProvider() !== null

let gmailTransport
function transportFor(createTransport) {
  const user = gmailUser()
  const pass = gmailPassword()
  const signature = createHash("sha256")
    .update(user + "\0" + pass)
    .digest("hex")
  if (
    !gmailTransport ||
    gmailTransport.signature !== signature ||
    gmailTransport.factory !== createTransport
  ) {
    gmailTransport?.transport.close?.()
    gmailTransport = {
      signature,
      factory: createTransport,
      transport: createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user, pass },
        tls: {
          rejectUnauthorized: true,
          minVersion: "TLSv1.2",
          servername: "smtp.gmail.com",
        },
        connectionTimeout: 4000,
        greetingTimeout: 4000,
        dnsTimeout: 4000,
        socketTimeout: 8000,
        disableFileAccess: true,
        disableUrlAccess: true,
        logger: false,
        debug: false,
      }),
    }
  }
  return gmailTransport.transport
}

const unavailable = (deliveryUncertain = false) =>
  Object.assign(
    new Error("Email could not be sent. Please try again shortly."),
    { status: 503, code: "EMAIL_SEND_FAILED", deliveryUncertain },
  )

// A successful request means the provider accepted the email, not that it
// reached the inbox. Keep provider diagnostics and all message data private.
export async function sendEmail(
  { to, subject, text, html, idempotencyKey },
  { createGmailTransport = nodemailer.createTransport } = {},
) {
  const provider = emailProvider()
  if (!provider) throw unavailable()
  if (
    typeof to !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) ||
    /[\r\n]/.test(to) ||
    typeof subject !== "string" ||
    !subject.trim() ||
    /[\r\n]/.test(subject) ||
    typeof text !== "string" ||
    !text ||
    typeof html !== "string" ||
    !html ||
    (idempotencyKey != null &&
      (typeof idempotencyKey !== "string" ||
        !/^[\x21-\x7e]{1,256}$/.test(idempotencyKey)))
  )
    throw unavailable()

  if (provider === "gmail") {
    let timer
    try {
      const transport = transportFor(createGmailTransport)
      // A stable Message-ID is useful for tracing, but SMTP does not provide
      // idempotent delivery. An ambiguous result must be reviewed, not retried.
      const messageId = idempotencyKey
        ? `<${createHash("sha256").update(idempotencyKey).digest("hex")}@london-tech.vercel.app>`
        : undefined
      const result = await Promise.race([
        transport.sendMail({
          from: `London Tech Stores <${gmailUser()}>`,
          to: [to],
          subject,
          text,
          html,
          ...(messageId ? { messageId } : {}),
          disableFileAccess: true,
          disableUrlAccess: true,
        }),
        new Promise((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                Object.assign(new Error("SMTP deadline"), {
                  code: "ETIMEDOUT",
                }),
              ),
            8000,
          )
        }),
      ])
      if (
        !result?.accepted?.some(
          (address) => String(address).toLowerCase() === to.toLowerCase(),
        ) ||
        typeof result.messageId !== "string" ||
        !result.messageId
      )
        throw unavailable(true)
      return { id: result.messageId }
    } catch (error) {
      if (error?.code === "EMAIL_SEND_FAILED") throw error
      const rejected =
        ["EAUTH", "EENVELOPE", "EMESSAGE"].includes(error?.code) ||
        Number(error?.responseCode) >= 400
      throw unavailable(!rejected)
    } finally {
      clearTimeout(timer)
    }
  }

  let response
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(8000),
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [to],
        subject,
        text,
        html,
      }),
    })
  } catch {
    // A timeout can follow provider acceptance; callers must keep the same
    // idempotency key when retrying instead of starting a second message.
    throw unavailable(true)
  }
  if (!response.ok) throw unavailable()
  const result = await response.json().catch(() => null)
  if (typeof result?.id !== "string" || !result.id) throw unavailable(true)
  return { id: result.id }
}
