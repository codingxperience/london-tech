import { createHash } from "node:crypto"
import { fail } from "./security.js"

const photoPath = /^product-photos\/([a-f0-9]{64})$/
export const uploadedPhotoUrl = /^\/api\/product-photos\/[a-f0-9]{64}\/$/

export async function saveProductPhoto(db, body) {
  const image = body?.image
  if (typeof image !== "string" || image.length > 400000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image))
    fail(400, "Choose a photo that can be saved as a WebP image.")

  const bytes = Buffer.from(image, "base64")
  if (
    bytes.length < 20 || bytes.length > 300000 ||
    bytes.toString("ascii", 0, 4) !== "RIFF" ||
    bytes.readUInt32LE(4) !== bytes.length - 8 ||
    bytes.toString("ascii", 8, 12) !== "WEBP" ||
    !["VP8 ", "VP8L", "VP8X"].includes(bytes.toString("ascii", 12, 16))
  ) fail(400, "The photo must be a valid WebP image under 300 KB.")

  const id = createHash("sha256").update(bytes).digest("hex")
  await db.query(
    "INSERT INTO product_photos(id, contents) VALUES($1,$2) ON CONFLICT(id) DO NOTHING",
    [id, bytes],
  )
  return { url: "/api/product-photos/" + id + "/" }
}

export async function serveProductPhoto(db, route, method, res) {
  const id = route.match(photoPath)?.[1]
  if (!id || !["GET", "HEAD"].includes(method)) return false
  const { rows } = await db.query("SELECT contents FROM product_photos WHERE id=$1", [id])
  if (!rows.length) fail(404, "Photo not found.")
  const contents = Buffer.from(rows[0].contents)
  res.setHeader("Content-Type", "image/webp")
  res.setHeader("Content-Length", contents.length)
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable")
  res.end(method === "HEAD" ? undefined : contents)
  return true
}
