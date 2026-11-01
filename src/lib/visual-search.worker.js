import * as ort from "onnxruntime-web/wasm"
import manifest from "../data/vision-manifest.json"

self.onmessage = async ({ data }) => {
  let session
  try {
    ort.env.wasm.numThreads = 1
    ort.env.wasm.proxy = false
    ort.env.logLevel = "error"
    ort.env.wasm.wasmPaths = {
      mjs: new URL(manifest.runtime.mjs, self.location.origin).href,
      wasm: new URL(manifest.runtime.wasm, self.location.origin).href,
    }
    const [modelResponse, indexResponse] = await Promise.all([
      fetch(manifest.model),
      fetch(manifest.index),
    ])
    if (!modelResponse.ok || !indexResponse.ok)
      throw new Error(
        "The image catalogue could not be downloaded. Check your connection and try again.",
      )
    const [model, index] = await Promise.all([
      modelResponse.arrayBuffer(),
      indexResponse.json(),
    ])
    self.postMessage({
      type: "progress",
      message: "Comparing your photo with the London Tech catalogue…",
    })
    session = await ort.InferenceSession.create(model, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    })
    const output = await session.run({
      pixel_values: new ort.Tensor("float32", data.pixels, [1, 3, 224, 224]),
    })
    const embedding = Float32Array.from(output.image_embeds.data)
    self.postMessage({ type: "result", embedding, index }, [embedding.buffer])
  } catch {
    self.postMessage({
      type: "error",
      message:
        "Image search could not complete. Check your connection, try a smaller photo or search by name.",
    })
  } finally {
    await session?.release()
  }
}
