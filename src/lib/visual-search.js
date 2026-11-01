export const IMAGE_SEARCH_LIMIT = 10 * 1024 * 1024
export const VISION_SIZE = 224
export const VISION_MEAN = [0.48145466, 0.4578275, 0.40821073]
export const VISION_STD = [0.26862954, 0.26130258, 0.27577711]

export function validateSearchPhoto(file) {
  if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPG, PNG or WebP photo.")
  if (!file.size) throw new Error("This photo is empty. Choose another image.")
  if (file.size > IMAGE_SEARCH_LIMIT)
    throw new Error("Choose a photo smaller than 10 MB.")
}

export function normalizeEmbedding(values) {
  const norm = Math.hypot(...values)
  if (!Number.isFinite(norm) || norm === 0)
    throw new Error("This photo could not be compared. Try another image.")
  return Float32Array.from(values, (value) => value / norm)
}

export function pixelsToTensor(rgba, size = VISION_SIZE) {
  const area = size * size
  const tensor = new Float32Array(area * 3)
  for (let pixel = 0; pixel < area; pixel++) {
    for (let channel = 0; channel < 3; channel++) {
      // Composite transparent areas onto white, as in the catalogue index.
      const alpha = rgba[pixel * 4 + 3] / 255
      const value =
        (rgba[pixel * 4 + channel] * alpha + 255 * (1 - alpha)) / 255
      tensor[channel * area + pixel] =
        (value - VISION_MEAN[channel]) / VISION_STD[channel]
    }
  }
  return tensor
}

export function rankVisualMatches(query, index, products, limit = 8) {
  const embedding = normalizeEmbedding(query)
  const current = new Map(
    products
      .filter((product) => product.active !== false)
      .map((product) => [product.id, product]),
  )
  const matches = new Map()
  for (const entry of index.entries) {
    const product = current.get(entry.id)
    // An edited/replaced model must be re-indexed before matching its old photo.
    if (
      !product ||
      product.name !== entry.name ||
      !entry.catalogueImages.includes(product.image) ||
      JSON.stringify(product.gallery || []) !== JSON.stringify(entry.gallery)
    )
      continue
    if (entry.vector.length !== embedding.length) continue
    const score = entry.vector.reduce(
      (sum, value, channel) => sum + value * embedding[channel],
      0,
    )
    if (score > (matches.get(product.id)?.score ?? -Infinity))
      matches.set(product.id, { product, score })
  }
  return [...matches.values()]
    .filter(({ score }) => Number.isFinite(score) && score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export async function prepareSearchPhoto(file) {
  validateSearchPhoto(file)
  let bitmap
  let release = () => {}
  if (typeof createImageBitmap === "function") {
    try {
      bitmap = await createImageBitmap(file)
    } catch {
      throw new Error("This photo could not be opened. Try another image.")
    }
    release = () => bitmap.close()
  } else {
    const url = URL.createObjectURL(file)
    bitmap = new Image()
    release = () => URL.revokeObjectURL(url)
    bitmap.src = url
    try {
      await bitmap.decode()
    } catch {
      release()
      throw new Error("This photo could not be opened. Try another image.")
    }
  }
  try {
    const width = bitmap.width || bitmap.naturalWidth
    const height = bitmap.height || bitmap.naturalHeight
    if (!width || !height || width * height > 36_000_000)
      throw new Error("Choose a smaller photo, up to 36 megapixels.")
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = VISION_SIZE
    const context = canvas.getContext("2d", { willReadFrequently: true })
    if (!context)
      throw new Error(
        "Image search is unavailable in this browser. Please use text search.",
      )
    context.fillStyle = "white"
    context.fillRect(0, 0, VISION_SIZE, VISION_SIZE)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = "high"
    const side = Math.min(width, height)
    context.drawImage(
      bitmap,
      (width - side) / 2,
      (height - side) / 2,
      side,
      side,
      0,
      0,
      VISION_SIZE,
      VISION_SIZE,
    )
    return pixelsToTensor(
      context.getImageData(0, 0, VISION_SIZE, VISION_SIZE).data,
    )
  } finally {
    release()
  }
}

export function createVisualSearchClient() {
  let worker,
    pending,
    timeout,
    generation = 0
  const cancel = () => {
    generation++
    clearTimeout(timeout)
    worker?.terminate()
    worker = null
    pending?.(new DOMException("Search cancelled", "AbortError"))
    pending = null
  }
  return {
    cancel,
    async search(file, products, onProgress) {
      cancel()
      const attempt = generation
      if (typeof Worker !== "function")
        throw new Error(
          "Image search is unavailable in this browser. Please use text search.",
        )
      const tensor = await prepareSearchPhoto(file)
      if (attempt !== generation)
        throw new DOMException("Search cancelled", "AbortError")
      onProgress(
        "Loading image matching files. They are cached for future searches…",
      )
      worker = new Worker(
        new URL("./visual-search.worker.js", import.meta.url),
        { type: "module" },
      )
      const current = worker
      return new Promise((resolve, reject) => {
        pending = reject
        const finish = () => {
          current.terminate()
          if (worker === current) {
            worker = null
            pending = null
          }
        }
        const deadline = setTimeout(() => {
          finish()
          reject(
            new Error(
              "Image search took too long. Check your connection and try again.",
            ),
          )
        }, 120000)
        timeout = deadline
        current.onmessage = ({ data }) => {
          if (data.type === "progress") {
            onProgress(data.message)
            return
          }
          clearTimeout(deadline)
          finish()
          if (data.type === "error") reject(new Error(data.message))
          else resolve(rankVisualMatches(data.embedding, data.index, products))
        }
        current.onerror = () => {
          clearTimeout(deadline)
          finish()
          reject(
            new Error(
              "Image search could not start. Please try again or search by name.",
            ),
          )
        }
        current.postMessage({ pixels: tensor }, [tensor.buffer])
      })
    },
  }
}
