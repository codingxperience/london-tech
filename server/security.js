import {
  randomBytes,
  createHash,
  scrypt,
  timingSafeEqual,
  randomUUID,
} from "node:crypto"

import { promisify } from "node:util"

import { z } from "zod"

const derive = promisify(scrypt)

export const email = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((v) => v.toLowerCase())

export const password = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128)

export const hash = (text) => createHash("sha256").update(text).digest("hex")

export const fail = (status, message) => {
  throw Object.assign(new Error(message), { status })
}

export const safeEqual = (a, b) =>
  typeof a === "string" &&
  typeof b === "string" &&
  Buffer.byteLength(a) === Buffer.byteLength(b) &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b))

export async function hashPassword(value) {
  const salt = randomBytes(16).toString("hex")
  return salt + ":" + Buffer.from(await derive(value, salt, 64)).toString("hex")
}

export async function checkPassword(value, encoded) {
  const [salt, saved] = encoded.split(":")

  return safeEqual(
    Buffer.from(await derive(value, salt, 64)).toString("hex"),
    saved,
  )
}

export async function rateLimit(db, key, limit = 10, minutes = 15) {
  const result = await db.query(
    `INSERT INTO rate_limits(key,hits,expires_at) VALUES($1,1,NOW()+($2||' minutes')::interval) ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN rate_limits.expires_at<NOW() THEN 1 ELSE rate_limits.hits+1 END,expires_at=CASE WHEN rate_limits.expires_at<NOW() THEN EXCLUDED.expires_at ELSE rate_limits.expires_at END RETURNING hits`,
    [hash(key), String(minutes)],
  )

  if (result.rows[0].hits > limit)
    fail(429, "Too many attempts. Please wait a few minutes and try again.")
}

export function currentOrigin(req) {
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL)
    return "https://" + process.env.VERCEL_URL

  if (process.env.NODE_ENV === "production")
    return (
      process.env.PUBLIC_SITE_URL || "https://london-tech.vercel.app"
    ).replace(/\/$/, "")

  return "http://" + (req.headers.host || "127.0.0.1:5173")
}

export function checkOrigin(req) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return

  if (!req.headers.origin || req.headers.origin !== currentOrigin(req))
    fail(
      403,
      "This request did not originate from the store. Refresh the page and try again.",
    )

  if (!String(req.headers["content-type"] || "").startsWith("application/json"))
    fail(415, "Send application/json.")
}

export async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body

  if (typeof req.body === "string") {
    if (Buffer.byteLength(req.body) > 500000) fail(413, "Request is too large.")
    try {
      return JSON.parse(req.body)
    } catch {
      fail(400, "Invalid JSON request.")
    }
  }

  let data = ""
  for await (const chunk of req) {
    data += chunk
    if (Buffer.byteLength(data) > 500000) fail(413, "Request is too large.")
  }

  try {
    return data ? JSON.parse(data) : {}
  } catch {
    fail(400, "Invalid JSON request.")
  }
}

export async function getUser(db, req) {
  const token = String(req.headers.cookie || "")
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith("lt_session="))
    ?.slice(11)

  if (!token) return null

  const result = await db.query(
    `SELECT u.id,u.name,u.email,u.role,u.phone,u.addresses,u.created_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW()`,
    [hash(token)],
  )

  return result.rows[0] || null
}

export async function createSession(db, res, userId) {
  const token = randomBytes(32).toString("hex")

  await db.query(
    `INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '14 days')`,
    [hash(token), userId],
  )

  res.setHeader(
    "Set-Cookie",
    `lt_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=1209600${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`,
  )
}

export function requireUser(user) {
  if (!user) fail(401, "Sign in to continue.")
  return user
}

export function requireAdmin(user) {
  requireUser(user)
  if (user.role !== "admin") fail(403, "Administrator access is required.")
}

export async function audit(db, actor, action, details) {
  await db.query(
    `INSERT INTO audit_events(id,actor_id,action,details) VALUES($1,$2,$3,$4::jsonb)`,
    [randomUUID(), actor, action, JSON.stringify(details)],
  )
}
