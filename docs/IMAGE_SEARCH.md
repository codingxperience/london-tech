# Catalogue image search

The scan icon beside the text search opens a photo picker with drag/drop and clipboard paste. Only JPEG, PNG and WebP are accepted, up to 10 MiB and 36 megapixels. A centred photo of one item works best.

Matching is local. The browser decodes the photo, composites transparency onto white, centre-crops it to 224 pixels, normalises RGB values and sends the tensor to a dedicated worker. The worker uses TinyCLIP image embeddings and cosine similarity against the precomputed catalogue views. Each product appears once, ranked by its best matching view. Suggestions are visual similarities, not authentication of a product or an exact model identification. There are no fabricated confidence percentages.

Photos and embeddings are never uploaded. Requests download static matching files from the site's own origin. Image matching runs only after choosing a photo; ordinary storefront browsing does not load the model or runtime. The worker is terminated on close, replacement or completion, and local preview object URLs are revoked. Modern browsers with WebAssembly SIMD and workers are required; failures offer retry guidance without blocking text search.

## Assets and maintenance

`src/data/vision-manifest.json` pins the current encoder, catalogue index and ONNX Runtime files. This version indexes 89 products across 187 corrected views. Image encoder size is 8.9 MB, the CPU WASM runtime is 14.8 MB and the index is about 1.1 MB before HTTP compression. Static asset caching makes subsequent downloads cheaper. These are served under `/assets/vision/`, outside the application's HTML rewrite.

After changing catalogue photos, adding products or changing model names, run:

```sh
pnpm catalog:index-images
pnpm test
pnpm run build
```

The indexer reads the source catalogue and researched gallery views, verifies the pinned upstream model checksum, extracts the image-only encoder, generates normalised vectors and writes fingerprinted files plus the manifest. Existing vectors are reused only when the encoder and source image checksum match. The original combined model is cached in the ignored `.cache/visual-search` directory. Do not commit the original combined model or local shopper photos. Remove only obsolete generated model/index files after checking the new manifest.

Runtime catalogue products must match the indexed name, gallery and a known main image. Removed, inactive or replaced products are excluded. New or edited products need a regenerated index to become searchable by image; text search and product pages continue to work. Merchant-only catalogue changes therefore need exporting into the source catalogue and reindexing as part of a deployment.

`pnpm-workspace.yaml` intentionally disables protobufjs's optional installation hook; runtime and protobuf decoding use the shipped JavaScript. No native ONNX runtime is installed. Indexing and the inference regression test use the same CPU WASM files as the browser.

## Model and runtime provenance

- [TinyCLIP ONNX model](https://huggingface.co/onnx-community/TinyCLIP-ViT-8M-16-Text-3M-YFCC15M-ONNX), revision `9463a9c508a344c837ffefe9d724f3827bf2dc79`, published under MIT. The combined quantized file SHA-256 is recorded in the manifest.
- [Microsoft TinyCLIP](https://github.com/microsoft/Cream/tree/main/TinyCLIP), original project and MIT licence.
- [ONNX Runtime Web](https://onnxruntime.ai/docs/get-started/with-javascript/web.html), version 1.31.1, CPU WASM with a single thread and no proxy worker. Its JS and WASM builds must have matching versions; see [runtime configuration](https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html).

Model/runtime licences and runtime third-party notices are distributed in `public/assets/vision/`. The deployment CSP permits WebAssembly compilation with `'wasm-unsafe-eval'` while JavaScript string evaluation remains disabled. Workers and all runtime downloads stay on the same origin. No CDN, external inference API or payment credentials are involved.

Regression coverage includes genuine WASM inference against catalogue photos and resized/darkened variants in four categories, index integrity, exclusion of replaced products, input validation, and dialog cancellation, stale responses, clipboard/drop input and failure handling. DOM tests do not establish pixel-level browser layout or device performance.
