import sharp from "sharp"
import { writeFile } from "node:fs/promises"

// Derive browser and app icons from the complete supplied logo, including its
// lettering. Only the surrounding white margin is trimmed.
const source = await sharp("public/assets/london-tech-logo.png")
  .trim()
  .png()
  .toBuffer()
const images = new Map()
for (const size of [16, 32, 48, 180, 192, 512]) {
  const padding = Math.max(1, Math.round(size * 0.035))
  const image = await sharp(source)
    .resize(size - padding * 2, size - padding * 2, {
      fit: "contain",
      background: "#ffffff",
    })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: "#ffffff",
    })
    .png()
    .toBuffer()
  images.set(size, image)
  if (size >= 180 || size === 32)
    await writeFile(`public/assets/london-tech-icon-${size}.png`, image)
}
const icoSizes = [16, 32, 48],
  header = Buffer.alloc(6 + icoSizes.length * 16)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(icoSizes.length, 4)
let offset = header.length
for (const [index, size] of icoSizes.entries()) {
  const entry = 6 + index * 16,
    image = images.get(size)
  header[entry] = size
  header[entry + 1] = size
  header.writeUInt16LE(1, entry + 4)
  header.writeUInt16LE(32, entry + 6)
  header.writeUInt32LE(image.length, entry + 8)
  header.writeUInt32LE(offset, entry + 12)
  offset += image.length
}
await writeFile(
  "public/favicon.ico",
  Buffer.concat([header, ...icoSizes.map((size) => images.get(size))]),
)
console.log(
  "Full London Tech logo icons generated for browser tabs and app shortcuts.",
)
