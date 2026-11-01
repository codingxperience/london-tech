import sharp from "sharp"
import { pixelsToTensor, VISION_SIZE } from "../src/lib/visual-search.js"

export async function photoTensor(source) {
  const rgba = await sharp(source)
    .rotate()
    .flatten({ background: "#fff" })
    .resize(VISION_SIZE, VISION_SIZE, {
      fit: "cover",
      position: "centre",
      kernel: "cubic",
    })
    .ensureAlpha()
    .raw()
    .toBuffer()
  return pixelsToTensor(rgba)
}
