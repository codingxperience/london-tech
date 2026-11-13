import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import proto from "onnx-proto"
import * as ort from "onnxruntime-web/wasm"
import { products } from "../src/data/catalog.js"
import { galleryImages } from "../src/lib/product-experience.js"
import { normalizeEmbedding } from "../src/lib/visual-search.js"
import { photoTensor } from "./vision-preprocess.mjs"

const source = {
  repo: "onnx-community/TinyCLIP-ViT-8M-16-Text-3M-YFCC15M-ONNX",
  revision: "9463a9c508a344c837ffefe9d724f3827bf2dc79",
  license: "MIT",
}
const cache = resolve(".cache/visual-search")
const destination = resolve("public/assets/vision")
await mkdir(cache, { recursive: true })
await mkdir(destination, { recursive: true })
const fullPath = resolve(cache, "tinyclip-full-q8.onnx")
let full
try {
  full = await readFile(fullPath)
} catch {
  const response = await fetch(
    `https://huggingface.co/${source.repo}/resolve/${source.revision}/onnx/model_quantized.onnx`,
  )
  if (!response.ok)
    throw new Error("Could not download the pinned TinyCLIP model")
  full = Buffer.from(await response.arrayBuffer())
  await writeFile(fullPath, full)
}
if (full.length !== 24281512) throw new Error("Unexpected source model size")
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex")
const localImage = (image) => resolve("public", "." + decodeURIComponent(image))
if (
  hash(full) !==
  "10921310ddef06557ec1598d1260470a0a4db53f70ffe0deb60b946dcad6d27a"
)
  throw new Error("Source model checksum does not match the pinned revision")
const decoded = proto.onnx.ModelProto.decode(full)
const graph = decoded.graph
const producers = new Map(
  graph.node.flatMap((node) => node.output.map((output) => [output, node])),
)
const values = new Set(),
  keep = new Set()
function visit(value) {
  if (!value || values.has(value)) return
  values.add(value)
  const node = producers.get(value)
  if (node) {
    keep.add(node)
    node.input.forEach(visit)
  }
}
visit("image_embeds")
graph.node = graph.node.filter((node) => keep.has(node))
graph.input = graph.input.filter((input) => values.has(input.name))
graph.output = graph.output.filter((output) => output.name === "image_embeds")
graph.initializer = graph.initializer.filter((tensor) =>
  values.has(tensor.name),
)
graph.valueInfo = graph.valueInfo.filter((value) => values.has(value.name))
if (graph.input.length !== 1 || graph.input[0].name !== "pixel_values")
  throw new Error("Image encoder extraction has unexpected inputs")
const model = proto.onnx.ModelProto.encode(decoded).finish()
const modelName = `tinyclip-image-q8-${hash(model).slice(0, 12)}.onnx`
await writeFile(resolve(destination, modelName), model)

ort.env.wasm.numThreads = 1
ort.env.wasm.proxy = false
const runtimeDir = dirname(
  fileURLToPath(import.meta.resolve("onnxruntime-web/wasm")),
)
ort.env.wasm.wasmPaths = {
  mjs: pathToFileURL(resolve(runtimeDir, "ort-wasm-simd-threaded.mjs")).href,
  wasm: pathToFileURL(resolve(runtimeDir, "ort-wasm-simd-threaded.wasm")).href,
}
const session = await ort.InferenceSession.create(model, {
  executionProviders: ["wasm"],
  graphOptimizationLevel: "all",
})
const entries = []
const cacheVectors = new Map()
try {
  const previous = JSON.parse(
    await readFile("src/data/vision-manifest.json", "utf8"),
  )
  if (previous.modelSha256 === hash(model)) {
    const previousIndex = JSON.parse(
      await readFile(resolve("public", "." + previous.index), "utf8"),
    )
    for (const entry of previousIndex.entries) {
      const imageHash = hash(await readFile(localImage(entry.image)))
      if (entry.imageSha256 === imageHash)
        cacheVectors.set(entry.image, entry.vector)
    }
  }
} catch {
  /* A first run has no previous index. */
}
for (const product of products.filter((product) => product.active !== false)) {
  const views = [
    ...new Set([
      product.image,
      ...galleryImages(product)
        .filter(({ type }) => type !== "video")
        .slice(0, 3)
        .map((image) => image.src),
    ]),
  ]
  for (const image of views) {
    if (!image.startsWith("/assets/")) continue
    let vector = cacheVectors.get(image)
    if (!vector) {
      const pixels = await photoTensor(localImage(image))
      const output = await session.run({
        pixel_values: new ort.Tensor("float32", pixels, [1, 3, 224, 224]),
      })
      vector = Array.from(
        normalizeEmbedding(output.image_embeds.data),
        (value) => Number(value.toFixed(7)),
      )
      cacheVectors.set(image, vector)
    }
    entries.push({
      id: product.id,
      name: product.name,
      catalogueImages: views,
      gallery: product.gallery || [],
      image,
      imageSha256: hash(await readFile(localImage(image))),
      vector,
    })
  }
  console.log(`Indexed ${product.name}`)
}
await session.release()
const index = JSON.stringify({ version: 1, dimensions: 512, entries })
const indexName = `catalogue-${hash(index).slice(0, 12)}.json`
await writeFile(resolve(destination, indexName), index)
const runtimeVersion = "1.31.1"
for (const suffix of ["mjs", "wasm"])
  await copyFile(
    resolve(runtimeDir, `ort-wasm-simd-threaded.${suffix}`),
    resolve(destination, `ort-${runtimeVersion}.${suffix}`),
  )
const manifest = {
  version: 1,
  model: `/assets/vision/${modelName}`,
  index: `/assets/vision/${indexName}`,
  runtime: {
    mjs: `/assets/vision/ort-${runtimeVersion}.mjs`,
    wasm: `/assets/vision/ort-${runtimeVersion}.wasm`,
  },
  source: { ...source, sha256: hash(full) },
  modelSha256: hash(model),
  indexedProducts: new Set(entries.map((entry) => entry.id)).size,
  indexedViews: entries.length,
}
await writeFile(
  resolve("src/data/vision-manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
)
console.log(
  JSON.stringify({
    modelBytes: model.length,
    indexBytes: index.length,
    products: manifest.indexedProducts,
    views: manifest.indexedViews,
  }),
)
