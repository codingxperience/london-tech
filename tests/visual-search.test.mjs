import { test } from "node:test"
import assert from "node:assert/strict"
import { readFile, stat } from "node:fs/promises"
import { createHash } from "node:crypto"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import sharp from "sharp"
import * as ort from "onnxruntime-web/wasm"
import manifest from "../src/data/vision-manifest.json" with { type: "json" }
import { products } from "../src/data/catalog.js"
import { galleryImages } from "../src/lib/product-experience.js"
import {
  validateSearchPhoto,
  pixelsToTensor,
  normalizeEmbedding,
  rankVisualMatches,
} from "../src/lib/visual-search.js"
import { photoTensor } from "../scripts/vision-preprocess.mjs"

const asset = (url) => resolve("public", "." + decodeURIComponent(url))
const index = JSON.parse(await readFile(asset(manifest.index), "utf8"))
const presented = products.map((product) => ({
  ...product,
  image: galleryImages(product)[0]?.src || product.image,
}))

test("photo validation accepts supported images and rejects empty, oversized and unsafe formats", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp"])
    assert.doesNotThrow(() => validateSearchPhoto({ type, size: 1000 }))
  assert.throws(
    () => validateSearchPhoto({ type: "image/svg+xml", size: 1000 }),
    /JPG, PNG or WebP/,
  )
  assert.throws(
    () => validateSearchPhoto({ type: "image/png", size: 0 }),
    /empty/,
  )
  assert.throws(
    () =>
      validateSearchPhoto({ type: "image/jpeg", size: 10 * 1024 * 1024 + 1 }),
    /10 MB/,
  )
  assert.throws(() => normalizeEmbedding([0, 0]), /could not be compared/)
  const rgba = new Uint8Array([0, 0, 0, 0])
  assert.ok(
    pixelsToTensor(rgba, 1).every((value) => value > 1),
    "Transparent photos are composited onto white",
  )
})

test("the shipped image index covers the actual catalogue and cannot match removed or replaced products", async () => {
  assert.equal(manifest.indexedProducts, products.length)
  assert.equal(
    new Set(index.entries.map((entry) => entry.id)).size,
    products.length,
  )
  assert.ok(index.entries.length > products.length)
  for (const entry of index.entries) {
    assert.equal(entry.vector.length, 512)
    assert.ok(Math.abs(Math.hypot(...entry.vector) - 1) < 0.00001)
    assert.ok((await stat(asset(entry.image))).isFile())
  }
  const entry = index.entries[0]
  const product = presented.find((product) => product.id === entry.id)
  assert.equal(
    rankVisualMatches(entry.vector, index, [product])[0].product.id,
    entry.id,
  )
  for (const modified of [
    { ...product, active: false },
    { ...product, name: "A replacement" },
    { ...product, image: "/new.jpg" },
    { ...product, gallery: ["/new.jpg"] },
  ])
    assert.equal(rankVisualMatches(entry.vector, index, [modified]).length, 0)
  const matches = rankVisualMatches(entry.vector, index, presented)
  assert.equal(
    new Set(matches.map((match) => match.product.id)).size,
    matches.length,
  )
})

test(
  "the real browser WASM model recognises catalogue photos and resized, darker variants",
  { timeout: 120000 },
  async () => {
    const model = await readFile(asset(manifest.model))
    assert.equal(
      createHash("sha256").update(model).digest("hex"),
      manifest.modelSha256,
    )
    ort.env.wasm.numThreads = 1
    ort.env.wasm.proxy = false
    ort.env.logLevel = "error"
    ort.env.wasm.wasmPaths = {
      mjs: pathToFileURL(asset(manifest.runtime.mjs)).href,
      wasm: pathToFileURL(asset(manifest.runtime.wasm)).href,
    }
    const session = await ort.InferenceSession.create(model, {
      executionProviders: ["wasm"],
    })
    try {
      for (const id of [
        "iphone-13-pro-max",
        "bose-qc-ultra",
        "switch-2",
        "thinkpad-pro-topload-gen2",
      ]) {
        const product = presented.find((product) => product.id === id)
        assert.ok(product, `Fixture ${id} exists`)
        const image = index.entries.find((entry) => entry.id === id).image
        const transformed = await sharp(asset(image))
          .resize(420, 420, { fit: "inside" })
          .modulate({ brightness: 0.84 })
          .jpeg({ quality: 72 })
          .toBuffer()
        for (const source of [asset(image), transformed]) {
          const pixels = await photoTensor(source)
          const output = await session.run({
            pixel_values: new ort.Tensor("float32", pixels, [1, 3, 224, 224]),
          })
          const matches = rankVisualMatches(
            output.image_embeds.data,
            index,
            presented,
          )
          assert.ok(
            matches.slice(0, 3).some((match) => match.product.id === id),
            `${product.name} appears in the first three visual matches; received ${matches
              .slice(0, 3)
              .map((match) => match.product.id)
              .join(", ")}`,
          )
        }
      }
    } finally {
      await session.release()
    }
  },
)
