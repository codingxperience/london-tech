import { after, afterEach, before, beforeEach, test } from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import React, { act } from "react"
import { Window } from "happy-dom"
import { createServer } from "vite"
import { products, storeDefaults } from "../src/data/catalog.js"
import {
  filterReviews,
  galleryImages,
  productInformation,
  zoomOrigin,
} from "../src/lib/product-experience.js"
import { localReturnPath } from "../src/lib/navigation.js"
import {
  readCollectionFilters,
  collectionQuery,
  selectCollection,
  scopeCollection,
} from "../src/lib/collection-filters.js"

let dom,
  server,
  createRoot,
  ProductGallery,
  ProductSections,
  TypewriterText,
  StoreProvider,
  App,
  CommerceApp,
  ProductCard,
  ImageSearchDialog,
  root,
  container,
  clock
let reducedMotion = false
const mediaListeners = new Set()
const originalGlobals = new Map()

before(async () => {
  dom = new Window({ url: "http://localhost/" })
  const globals = {
    window: dom,
    document: dom.document,
    navigator: dom.navigator,
    location: dom.location,
    history: dom.history,
    localStorage: dom.localStorage,
    HTMLElement: dom.HTMLElement,
    HTMLInputElement: dom.HTMLInputElement,
    FormData: dom.FormData,
    IntersectionObserver: dom.IntersectionObserver,
    Node: dom.Node,
    Event: dom.Event,
    PopStateEvent: dom.PopStateEvent,
    IS_REACT_ACT_ENVIRONMENT: true,
    fetch: async (url) => {
      const data = String(url).includes("/api/catalog")
        ? { products, settings: storeDefaults }
        : String(url).includes("/reviews")
          ? { reviews: [] }
          : String(url).includes("/wishlist")
            ? { ids: [] }
            : String(url).includes("/api/orders")
              ? { orders: [] }
              : String(url).includes("/api/auth/me")
                ? { user: null }
                : { accounts: false, payments: false, currency: "UGX" }
      return { ok: true, json: async () => data }
    },
  }
  for (const [key, value] of Object.entries(globals)) {
    originalGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, {
      value,
      writable: true,
      configurable: true,
    })
  }
  dom.matchMedia = (media) => ({
    media,
    get matches() {
      return media.includes("prefers-reduced-motion") && reducedMotion
    },
    addEventListener: (_event, callback) => mediaListeners.add(callback),
    removeEventListener: (_event, callback) => mediaListeners.delete(callback),
  })
  // Layout is outside a DOM implementation's scope; scrolling is still callable.
  dom.HTMLElement.prototype.scrollIntoView = function () {}
  ;({ createRoot } = await import("react-dom/client"))
  server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: "custom",
    optimizeDeps: { noDiscovery: true },
  })
  ;({ ProductGallery } = await server.ssrLoadModule(
    "/src/components/product-gallery.jsx",
  ))
  ;({ ProductSections } = await server.ssrLoadModule(
    "/src/components/product-sections.jsx",
  ))
  ;({ TypewriterText } = await server.ssrLoadModule(
    "/src/components/MotionText.tsx",
  ))
  ;({ StoreProvider } = await server.ssrLoadModule("/src/store.jsx"))
  ;({ default: App } = await server.ssrLoadModule("/src/App.tsx"))
  ;({ ProductCard } = await server.ssrLoadModule(
    "/src/components/storefront.jsx",
  ))
  ;({ ImageSearchDialog } = await server.ssrLoadModule(
    "/src/components/ImageSearchDialog.jsx",
  ))
  ;({
    default: CommerceApp,
  } = await server.ssrLoadModule("/src/CommerceApp.jsx"))
})

beforeEach(() => {
  reducedMotion = false
  container = dom.document.createElement("div")
  dom.document.body.append(container)
})

afterEach(async () => {
  if (root) await act(async () => root.unmount())
  root = null
  clock?.restore()
  clock = null
  container.remove()
  dom.document.body.style.overflow = ""
  dom.document.documentElement.scrollTop = 0
  dom.localStorage.clear()
  dom.history.replaceState({}, "", "http://localhost/")
})

after(async () => {
  await server?.close()
  await dom?.happyDOM.close()
  for (const [key, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
})

async function render(element) {
  root ||= createRoot(container)
  await act(async () => root.render(element))
}

async function dispatch(element, event) {
  await act(async () => element.dispatchEvent(event))
}

async function click(element) {
  assert.ok(element, "The requested interactive element exists")
  await act(async () => element.click())
}

async function fillInput(input, value) {
  assert.ok(input, "The expected input exists")
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      dom.HTMLInputElement.prototype,
      "value",
    ).set.call(input, value)
    input.dispatchEvent(new dom.Event("input", { bubbles: true }))
  })
}

async function openRoute(path) {
  reducedMotion = true
  dom.history.replaceState({}, "", path)
  await render(React.createElement(CommerceApp))
}

function key(name) {
  return new dom.KeyboardEvent("keydown", {
    key: name,
    bubbles: true,
    cancelable: true,
  })
}

function pointer(type, pointerType = "mouse", extra = {}) {
  return new dom.PointerEvent(type, { bubbles: true, pointerType, ...extra })
}

// Fake only the component's Window timeouts. Vite and Node keep their own timers.
// Each callback is flushed through React.act before another timeout may run.
function installClock() {
  let now = 0,
    nextId = 0
  const tasks = new Map()
  const nativeSet = dom.setTimeout,
    nativeClear = dom.clearTimeout
  dom.setTimeout = (callback, delay = 0, ...args) => {
    const id = ++nextId
    tasks.set(id, { at: now + Number(delay), callback, args })
    return id
  }
  dom.clearTimeout = (id) => tasks.delete(id)
  clock = {
    get pending() {
      return tasks.size
    },
    async tick(duration) {
      const target = now + duration
      let iterations = 0
      while (tasks.size) {
        const [id, task] = [...tasks].sort((a, b) => a[1].at - b[1].at)[0]
        if (task.at > target) break
        assert.ok(
          ++iterations < 1000,
          "The test clock must make bounded progress",
        )
        tasks.delete(id)
        now = task.at
        await act(async () => task.callback(...task.args))
      }
      now = target
    },
    restore() {
      tasks.clear()
      dom.setTimeout = nativeSet
      dom.clearTimeout = nativeClear
    },
  }
  return clock
}

const galleryProduct = {
  id: "interaction-gallery-fixture",
  name: "Gallery interaction fixture",
  image: "/front.jpg",
  gallery: ["/front.jpg", "/rear.jpg", "/side.jpg"],
}

test("galleries contain distinct files, descriptive alternatives and traceable matching model sources", () => {
  const media = JSON.parse(
    readFileSync(new URL("../src/data/product-media.json", import.meta.url)),
  )
  assert.ok(
    Object.keys(media).length >= 5,
    "Multiple real product families have researched photos",
  )
  const matchingSources = {
    "galaxy-s25-ultra": /galaxy-s25-ultra/,
    "canon-r6ii": /eos-r6-mark-ii/,
    "switch-2": /switch-2/,
    "iphone-17-pro": /iphone-17-pro/,
  }
  for (const [id, images] of Object.entries(media)) {
    assert.ok(
      products.some((p) => p.id === id),
      `${id} belongs to the real catalogue`,
    )
    assert.equal(
      new Set(images.map((image) => image.src)).size,
      images.length,
      `${id} has no repeated paths`,
    )
    for (const image of images) {
      assert.ok(image.alt.length > 12, `${id} has descriptive image text`)
      assert.equal(
        new URL(image.source).protocol,
        "https:",
        `${id} records a public source`,
      )
      if (matchingSources[id])
        assert.match(
          image.source,
          matchingSources[id],
          `${id} uses its own model page`,
        )
    }
  }
  for (const product of products) {
    const files = galleryImages(product).filter((image) =>
      image.src.startsWith("/"),
    )
    const hashes = files.map(({ src }) => {
      // Decode the URL once. Some original filenames literally contain "%20".
      const file = resolve(
        fileURLToPath(new URL("../public/", import.meta.url)),
        "." + decodeURIComponent(src),
      )
      assert.ok(existsSync(file), `${product.id}: local gallery image exists`)
      return createHash("sha256").update(readFileSync(file)).digest("hex")
    })
    assert.equal(
      new Set(hashes).size,
      hashes.length,
      `${product.id} has no duplicated image content`,
    )
  }
  assert.deepEqual(
    galleryImages(galleryProduct).map((image) => image.src),
    ["/front.jpg", "/rear.jpg", "/side.jpg"],
  )
  const researched = galleryImages(
    products.find((p) => p.id === "galaxy-s25-ultra"),
  )
  assert.ok(researched.length >= 2)
  assert.ok(
    researched.every((image) => !image.src.includes("unsplash.com")),
    "Generic photos are not presented as extra product views",
  )
})

test("zoom follows the pointer and clamps the origin to the image boundaries", () => {
  const rect = { left: 10, top: 20, width: 100, height: 200 }
  assert.equal(zoomOrigin(60, 120, rect), "50% 50%")
  assert.equal(zoomOrigin(-20, 300, rect), "0% 100%")
  assert.equal(zoomOrigin(300, -30, rect), "100% 0%")
  assert.equal(zoomOrigin(10, 20, { ...rect, width: 0, height: 0 }), "50% 50%")
})

const reviews = Object.freeze(
  [
    {
      id: 1,
      rating: 2,
      title: "Review one",
      body: "Useful details.",
      name: "Alex",
      created_at: "2026-10-01T12:00:00Z",
    },
    {
      id: 2,
      rating: 5,
      title: "Review two",
      body: "A good fit.",
      name: "Sam",
      created_at: "2026-10-03T12:00:00Z",
    },
    {
      id: 3,
      rating: 4,
      title: "Review three",
      body: "Works for me.",
      name: "Jo",
      created_at: "2026-10-02T12:00:00Z",
    },
    {
      id: 4,
      rating: 5,
      title: "Review four",
      body: "Helpful service.",
      name: "Kim",
      created_at: "2026-10-04T12:00:00Z",
    },
    {
      id: 5,
      rating: 3,
      title: "Review five",
      body: "My experience.",
      name: "Lee",
      created_at: "2026-10-05T12:00:00Z",
    },
    {
      id: 6,
      rating: 5,
      title: "Review six",
      body: "Clear information.",
      name: "Jay",
      created_at: "2026-10-06T12:00:00Z",
    },
    {
      id: 7,
      rating: 4,
      title: "Review seven",
      body: "Easy to choose.",
      name: "Dee",
      created_at: "2026-10-07T12:00:00Z",
    },
  ].map(Object.freeze),
)

test("review filtering and sorting use customer values without mutating the original list", () => {
  assert.deepEqual(
    filterReviews(reviews).map((r) => r.id),
    [7, 6, 5, 4, 2, 3, 1],
  )
  assert.deepEqual(
    filterReviews(reviews, "5").map((r) => r.id),
    [6, 4, 2],
  )
  assert.deepEqual(
    filterReviews(reviews, "all", "lowest").map((r) => r.rating),
    [2, 3, 4, 4, 5, 5, 5],
  )
  assert.deepEqual(
    filterReviews(reviews, "all", "highest").map((r) => r.rating),
    [5, 5, 5, 4, 4, 3, 2],
  )
  assert.deepEqual(
    reviews.map((r) => r.id),
    [1, 2, 3, 4, 5, 6, 7],
  )
  assert.deepEqual(filterReviews(reviews, "1"), [])
})

test("known models gain sourced details while unknown models keep their own information", () => {
  const real = products.find((p) => p.id === "iphone-13-pro-max")
  const information = productInformation(real)
  assert.ok(information.highlights.length >= 3)
  assert.ok(
    information.specifications.some(
      ([label, value]) => label === "Processor" && value === "A15 Bionic",
    ),
  )
  assert.equal(
    information.specifications.filter(([label]) =>
      /^(?:chip|chipset|processor)$/i.test(label),
    ).length,
    1,
    "Only one authoritative processor value is shown",
  )
  assert.ok(
    information.sources.some(
      ({ url }) => new URL(url).hostname === "support.apple.com",
    ),
  )
  assert.ok(
    information.guides.some(({ url }) =>
      url.includes("support.apple.com/guide/iphone"),
    ),
  )
  const unknown = productInformation({
    id: "not-a-real-model",
    specifications: [["Connector", "USB-C"]],
  })
  assert.deepEqual(unknown.specifications, [["Connector", "USB-C"]])
  assert.deepEqual(unknown.sources, [])
  assert.deepEqual(unknown.highlights, [])
})

test("merchant photos, specifications and descriptions are preserved instead of replaced by seed research", () => {
  const real = products.find((p) => p.id === "iphone-13-pro-max")
  const photos = ["/merchant/front.webp", "/merchant/ports.webp"]
  assert.deepEqual(
    galleryImages({ ...real, image: photos[0], gallery: photos }).map(
      (image) => image.src,
    ),
    photos,
    "Merchant-supplied photos take priority for an existing product ID",
  )
  const specifications = [
    ["Memory", "Merchant-confirmed 16GB"],
    ["Connector", "Merchant-confirmed USB-C"],
  ]
  assert.deepEqual(
    productInformation({ ...real, specifications }).specifications,
    specifications,
  )
  const description =
    "The merchant has inspected this exact configuration and written this specific product description."
  assert.equal(
    productInformation({ ...real, description }).description,
    description,
  )
  const renamed = {
    ...real,
    name: "Merchant custom device bundle",
    description,
    specifications,
    image: photos[0],
    gallery: photos,
  }
  const information = productInformation(renamed)
  assert.deepEqual(
    galleryImages(renamed).map((image) => image.src),
    photos,
  )
  assert.equal(information.description, description)
  assert.deepEqual(information.specifications, specifications)
  assert.deepEqual(
    information.highlights,
    [],
    "Renaming a product does not retain another model's promotional claims",
  )
  assert.deepEqual(
    information.sources,
    [],
    "A reused ID does not imply an official model match",
  )
  assert.deepEqual(information.guides, [])
})

test("default product research removes unsupported battery, console and durability claims", () => {
  const bose = productInformation(
    products.find((p) => p.id === "bose-qc-ultra"),
  )
  assert.ok(
    bose.specifications.some(([label, value]) =>
      /generation/i.test(label + " " + value),
    ),
    "Bose generation differences are explained",
  )
  const oldBattery = bose.specifications.find(([label]) =>
    /^battery$/i.test(label),
  )
  assert.ok(
    !oldBattery || !/^up to 24 (?:h|hours)$/i.test(oldBattery[1]),
    "A generation-ambiguous listing must not promise unqualified 24-hour endurance",
  )
  const ps5 = productInformation(products.find((p) => p.id === "ps5-pro"))
  assert.equal(typeof ps5.description, "string")
  assert.doesNotMatch(
    [ps5.description, ...ps5.specifications.flat()].join(" "),
    /\b8k\b|\btflops?\b/i,
  )
  const gopro = productInformation(
    products.find((p) => p.id === "gopro-hero13"),
  )
  assert.equal(typeof gopro.description, "string")
  assert.doesNotMatch(
    gopro.description,
    /indestructible/i,
    "A water-resistance specification does not make a camera indestructible",
  )
})

test("gallery thumbnails preview on pointer and focus and support keyboard selection", async () => {
  await render(React.createElement(ProductGallery, { product: galleryProduct }))
  const thumbnails = [...container.querySelectorAll("[data-image-index]")]
  const main = () =>
    container.querySelector(".product-main-image img").getAttribute("src")
  assert.equal(thumbnails.length, 3)
  assert.equal(main(), "/front.jpg")
  await dispatch(thumbnails[1], pointer("pointerover"))
  assert.equal(main(), "/rear.jpg")
  assert.equal(thumbnails[1].getAttribute("aria-pressed"), "true")
  await dispatch(thumbnails[2], pointer("pointerover", "touch"))
  assert.equal(
    main(),
    "/rear.jpg",
    "Touch hover does not accidentally switch the image",
  )
  await act(async () => thumbnails[2].focus())
  assert.equal(main(), "/side.jpg")
  await dispatch(thumbnails[2], key("Home"))
  assert.equal(main(), "/front.jpg")
  assert.equal(dom.document.activeElement, thumbnails[0])
  await dispatch(thumbnails[0], key("ArrowRight"))
  assert.equal(main(), "/rear.jpg")
  await dispatch(thumbnails[1], key("End"))
  assert.equal(main(), "/side.jpg")
  await click(thumbnails[0])
  assert.equal(main(), "/front.jpg", "Click remains available for touch users")
})

test("gallery mouse zoom tracks position, clears on exit and does not activate for touch", async () => {
  await render(React.createElement(ProductGallery, { product: galleryProduct }))
  const main = container.querySelector(".product-main-image")
  main.getBoundingClientRect = () => ({
    left: 10,
    top: 20,
    width: 400,
    height: 300,
  })
  await dispatch(main, pointer("pointerover", "touch"))
  assert.ok(!main.classList.contains("is-zoomed"))
  await dispatch(main, pointer("pointerover"))
  assert.ok(main.classList.contains("is-zoomed"))
  await dispatch(
    main,
    pointer("pointermove", "mouse", { clientX: 410, clientY: 20 }),
  )
  assert.equal(main.querySelector("img").style.transformOrigin, "100% 0%")
  await dispatch(
    main,
    pointer("pointerout", "mouse", { relatedTarget: dom.document.body }),
  )
  assert.ok(!main.classList.contains("is-zoomed"))
  await dispatch(main, pointer("pointerover"))
  await dispatch(
    container.querySelector('[data-image-index="1"]'),
    pointer("pointerover"),
  )
  assert.ok(
    !main.classList.contains("is-zoomed"),
    "Changing the image clears the previous hover zoom",
  )
})

test("thumbnail selection scrolls only its horizontal rail and lightbox navigation leaves the background alone", async () => {
  const scrollIntoView = dom.HTMLElement.prototype.scrollIntoView
  const scrollTo = dom.scrollTo,
    scrollBy = dom.scrollBy
  let pageScrollCalls = 0
  const railCalls = []
  dom.HTMLElement.prototype.scrollIntoView = () => {
    pageScrollCalls++
  }
  dom.scrollTo = () => {
    pageScrollCalls++
  }
  dom.scrollBy = () => {
    pageScrollCalls++
  }
  try {
    dom.document.documentElement.scrollTop = 600
    await render(
      React.createElement(ProductGallery, { product: galleryProduct }),
    )
    const rail = container.querySelector(".product-thumbnails")
    const thumbnails = [...rail.querySelectorAll("[data-image-index]")]
    rail.getBoundingClientRect = () => ({
      left: 100,
      right: 300,
      top: 100,
      bottom: 180,
      width: 200,
      height: 80,
    })
    rail.scrollBy = (options) => railCalls.push(options)
    thumbnails[0].getBoundingClientRect = () => ({
      left: 40,
      right: 100,
      top: 100,
      bottom: 180,
      width: 60,
      height: 80,
    })
    thumbnails[1].getBoundingClientRect = () => ({
      left: 400,
      right: 460,
      top: 100,
      bottom: 180,
      width: 60,
      height: 80,
    })
    thumbnails[2].getBoundingClientRect = () => ({
      left: 350,
      right: 410,
      top: 100,
      bottom: 180,
      width: 60,
      height: 80,
    })
    await dispatch(thumbnails[2], pointer("pointerover"))
    assert.ok(
      railCalls.some((options) => options.left > 0),
      "A thumbnail to the right scrolls its own rail",
    )
    await act(async () => thumbnails[0].focus())
    assert.ok(
      railCalls.some((options) => options.left < 0),
      "A thumbnail to the left scrolls its own rail",
    )
    let keyboardFocusOptions
    const nativeFocus = thumbnails[1].focus.bind(thumbnails[1])
    thumbnails[1].focus = (options) => {
      keyboardFocusOptions = options
      nativeFocus(options)
    }
    await dispatch(thumbnails[0], key("ArrowRight"))
    assert.equal(
      keyboardFocusOptions?.preventScroll,
      true,
      "Moving keyboard focus cannot scroll the page",
    )
    assert.ok(
      railCalls.every(
        (options) => options.top === undefined || options.top === 0,
      ),
      "The gallery changes only horizontal scroll",
    )
    await click(container.querySelector(".product-main-image"))
    railCalls.length = 0
    await click(container.querySelector('[aria-label="Next product image"]'))
    await dispatch(dom, key("ArrowLeft"))
    assert.equal(
      railCalls.length,
      0,
      "The thumbnail rail remains still behind an open lightbox",
    )
    assert.equal(
      pageScrollCalls,
      0,
      "No scrollIntoView or document scroll function was called",
    )
    assert.equal(dom.document.documentElement.scrollTop, 600)
  } finally {
    dom.HTMLElement.prototype.scrollIntoView = scrollIntoView
    dom.scrollTo = scrollTo
    dom.scrollBy = scrollBy
    dom.document.documentElement.scrollTop = 0
  }
})

test("vertical thumbnails scroll within their rail and support up/down navigation", async () => {
  await render(
    React.createElement(ProductGallery, {
      product: {
        ...galleryProduct,
        gallery: [
          ...galleryProduct.gallery,
          "/four.jpg",
          "/five.jpg",
          "/six.jpg",
          "/seven.jpg",
        ],
      },
    }),
  )
  const rail = container.querySelector(".product-thumbnails")
  const thumbnails = [...rail.querySelectorAll("[data-image-index]")]
  rail.style.flexDirection = "column"
  rail.getBoundingClientRect = () => ({
    left: 0,
    right: 70,
    top: 100,
    bottom: 300,
    width: 70,
    height: 200,
  })
  thumbnails[2].getBoundingClientRect = () => ({
    left: 3,
    right: 67,
    top: 360,
    bottom: 424,
    width: 64,
    height: 64,
  })
  const calls = []
  rail.scrollBy = (options) => calls.push(options)
  await dispatch(thumbnails[2], pointer("pointerover"))
  assert.ok(
    calls.some((options) => options.top === 124),
    "A lower thumbnail scrolls its own vertical rail",
  )
  await click(container.querySelector('[aria-label="Next thumbnails"]'))
  assert.equal(calls.at(-1).top, 240)
  await click(container.querySelector('[aria-label="Previous thumbnails"]'))
  assert.equal(calls.at(-1).top, -240)
  await dispatch(thumbnails[2], key("ArrowUp"))
  assert.equal(
    container.querySelector(".product-main-image img").getAttribute("src"),
    "/rear.jpg",
  )
  await dispatch(thumbnails[1], key("ArrowDown"))
  assert.equal(
    container.querySelector(".product-main-image img").getAttribute("src"),
    "/side.jpg",
  )
  assert.equal(dom.document.activeElement, thumbnails[2])
  // The same controls adapt when the CSS switches to a horizontal mobile rail.
  rail.style.flexDirection = "row"
  await click(container.querySelector('[aria-label="Next thumbnails"]'))
  assert.equal(calls.at(-1).left, 240)
})

test("gallery lightbox navigates, closes with Escape, restores focus and resets for another product", async () => {
  await render(React.createElement(ProductGallery, { product: galleryProduct }))
  const main = container.querySelector(".product-main-image")
  await act(async () => main.focus())
  await click(main)
  assert.ok(container.querySelector('[role="dialog"][aria-modal="true"]'))
  assert.equal(dom.document.body.style.overflow, "hidden")
  await click(container.querySelector('[aria-label="Next product image"]'))
  assert.equal(
    container.querySelector('[role="dialog"] > img').getAttribute("src"),
    "/rear.jpg",
  )
  await dispatch(dom, key("ArrowRight"))
  assert.equal(
    container.querySelector('[role="dialog"] > img').getAttribute("src"),
    "/side.jpg",
  )
  await dispatch(dom, key("Escape"))
  assert.equal(container.querySelector('[role="dialog"]'), null)
  assert.equal(dom.document.body.style.overflow, "")
  assert.equal(dom.document.activeElement, main)
  await render(
    React.createElement(ProductGallery, {
      product: { ...galleryProduct, id: "another-gallery-model" },
    }),
  )
  assert.equal(
    container.querySelector(".product-main-image img").getAttribute("src"),
    "/front.jpg",
  )
})

test("typewriter adds and removes individual characters instead of swapping whole words", async () => {
  const timer = installClock()
  await render(React.createElement(TypewriterText, { words: ["cat", "dog"] }))
  const text = () => container.querySelector("strong").textContent
  assert.equal(text(), "")
  assert.ok(container.querySelector(".search-caret"))
  assert.equal(
    container.querySelector(".typewriter-text").getAttribute("aria-hidden"),
    "true",
  )
  await timer.tick(380)
  assert.equal(text(), "c")
  await timer.tick(85)
  assert.equal(text(), "ca")
  await timer.tick(85)
  assert.equal(text(), "cat")
  await timer.tick(1800 + 42)
  assert.equal(text(), "ca")
  await timer.tick(84)
  assert.equal(text(), "")
  await timer.tick(42 + 380)
  assert.equal(text(), "d")
})

test("the real header pauses its hint on input focus and never overwrites entered search text", async () => {
  const timer = installClock()
  await render(
    React.createElement(
      StoreProvider,
      null,
      React.createElement(
        App,
        null,
        React.createElement("p", null, "Page content"),
      ),
    ),
  )
  const input = container.querySelector('input[aria-label="Search products"]')
  const hint = () => container.querySelector(".search-suggestion strong")
  await timer.tick(380 + 85)
  assert.equal(hint().textContent, "sm")
  await act(async () => input.focus())
  await timer.tick(3000)
  assert.equal(
    hint().textContent,
    "sm",
    "Focusing the input pauses the decorative typing",
  )
  await act(async () => input.blur())
  await timer.tick(85)
  assert.equal(hint().textContent, "sma")
  await act(async () => {
    input.focus()
    const setter = Object.getOwnPropertyDescriptor(
      dom.HTMLInputElement.prototype,
      "value",
    ).set
    setter.call(input, "My phone")
    input.dispatchEvent(new dom.Event("input", { bubbles: true }))
  })
  await timer.tick(5000)
  assert.equal(input.value, "My phone")
  assert.equal(
    container.querySelector(".search-suggestion"),
    null,
    "A typed query replaces the visual hint",
  )
})

test("reduced motion presents a complete static hint with no typing timer", async () => {
  const timer = installClock()
  reducedMotion = true
  await render(
    React.createElement(TypewriterText, { words: ["phones", "audio"] }),
  )
  assert.equal(container.querySelector("strong").textContent, "phones")
  assert.equal(timer.pending, 0)
  await timer.tick(10000)
  assert.equal(container.querySelector("strong").textContent, "phones")
})

test("long-form product sections expand real specifications and filter, sort and paginate reviews", async () => {
  const product = products.find((p) => p.id === "iphone-13-pro-max")
  let wroteReview = false
  await render(
    React.createElement(ProductSections, {
      product,
      products: [],
      settings: storeDefaults,
      reviews,
      onWriteReview: () => {
        wroteReview = true
      },
    }),
  )
  const specificationRows = () =>
    container.querySelectorAll("#product-specification-list > div").length
  const specButton = container.querySelector(
    'button[aria-controls="product-specification-list"]',
  )
  assert.equal(specificationRows(), 8)
  await click(specButton)
  assert.ok(specificationRows() > 8)
  assert.equal(specButton.getAttribute("aria-expanded"), "true")
  await click(specButton)
  assert.equal(specificationRows(), 8)
  const titles = () =>
    [...container.querySelectorAll(".detail-review-list article h3")].map(
      (item) => item.textContent,
    )
  assert.equal(titles().length, 5)
  await click(
    [...container.querySelectorAll("button")].find((button) =>
      button.textContent.includes("View more reviews"),
    ),
  )
  assert.equal(titles().length, 7)
  const [rating, sort] = container.querySelectorAll(
    ".detail-review-toolbar select",
  )
  rating.value = "5"
  await dispatch(rating, new dom.Event("change", { bubbles: true }))
  assert.deepEqual(titles(), ["Review six", "Review four", "Review two"])
  rating.value = "all"
  await dispatch(rating, new dom.Event("change", { bubbles: true }))
  sort.value = "lowest"
  await dispatch(sort, new dom.Event("change", { bubbles: true }))
  assert.equal(titles()[0], "Review one")
  await click(
    container.querySelector('[aria-label="Show 1-star reviews, 0 reviews"]'),
  )
  assert.equal(container.querySelector(".detail-review-list"), null)
  assert.match(container.textContent, /No reviews with this rating yet/)
  await click(
    [...container.querySelectorAll("button")].find((button) =>
      button.textContent.includes("Show all reviews"),
    ),
  )
  assert.equal(titles().length, 5)
  await click(
    [...container.querySelectorAll("button")].find((button) =>
      button.textContent.includes("Write a review"),
    ),
  )
  assert.ok(wroteReview)
  assert.ok(container.querySelector('#product-store a[href="tel:0788341111"]'))
  assert.ok(container.querySelector('#product-delivery a[href="/returns/"]'))
  assert.ok(container.querySelector('#product-delivery a[href="/delivery/"]'))
  assert.ok(
    container.querySelector(
      '#product-guides a[href^="https://support.apple.com/guide/iphone"]',
    ),
  )
})

test("review loading failures and empty review data do not invent customer ratings", async () => {
  const product = products.find((p) => p.id === "iphone-13-pro-max")
  await render(
    React.createElement(ProductSections, {
      product,
      products: [],
      settings: storeDefaults,
      reviews: [],
      reviewError: true,
      onWriteReview: () => {},
    }),
  )
  const section = container.querySelector("#product-reviews")
  assert.match(section.textContent, /Reviews could not be loaded/)
  assert.match(section.textContent, /Be the first to share your experience/)
  assert.ok(section.querySelector('[aria-label="No ratings yet"]'))
  assert.equal(section.querySelector(".detail-review-list"), null)
})

test("a fresh complete CommerceApp mount opens a product route with its own provider and rich detail sections", async () => {
  const previousUrl = dom.location.href
  const originalConsoleError = console.error
  const viewErrors = []
  console.error = (...args) => {
    if (String(args[0]).includes("London Tech view failed"))
      viewErrors.push(args)
    originalConsoleError(...args)
  }
  try {
    reducedMotion = true
    dom.history.replaceState({}, "", "/products/iphone-17-pro-max/")
    // CommerceApp owns StoreProvider and Router. Do not add an external provider.
    await render(React.createElement(CommerceApp))
    const product = products.find((item) => item.id === "iphone-17-pro-max")
    assert.equal(container.querySelector("h1")?.textContent, product.name)
    assert.equal(dom.document.title, product.name + " | London Tech")
    assert.ok(container.querySelector(".product-main-image img"))
    assert.ok(
      container.querySelectorAll(".product-thumbnails button").length >= 2,
    )
    for (const section of [
      "overview",
      "specifications",
      "reviews",
      "description",
      "guides",
      "delivery",
      "questions",
      "store",
    ]) {
      assert.ok(
        container.querySelector("#product-" + section),
        `${section} is present in the full routed application`,
      )
    }
    assert.match(
      container.querySelector("#product-reviews").textContent,
      /Be the first to share your experience/,
    )
    assert.doesNotMatch(
      container.textContent,
      /This view could not be opened|Let’s get you back to the store/,
    )
    assert.deepEqual(
      viewErrors,
      [],
      "The complete app did not enter its error boundary",
    )
  } finally {
    if (root) await act(async () => root.unmount())
    root = null
    dom.history.replaceState({}, "", previousUrl)
    console.error = originalConsoleError
  }
})

test("authentication return paths stay local and do not loop into authentication", () => {
  for (const path of [
    "https://outside.example/",
    "//outside.example/",
    "/\\outside.example/",
    "/login/?next=/account/",
    "/register/",
    "/forgot-password/",
  ])
    assert.equal(localReturnPath(path), "/account/")
  assert.equal(
    localReturnPath("/account/wishlist/?from=shop"),
    "/account/wishlist/?from=shop",
  )
  assert.equal(localReturnPath(null, "/"), "/")
})

test("collection filters round-trip and apply actual brand, price and stock values without changing catalogue order", () => {
  const initial = readCollectionFilters(
    "?q=phone&brand=Apple&brand=Apple&brand=Samsung&min=100&max=900&stock=1&sort=price-low&page=2",
  )
  assert.deepEqual(readCollectionFilters(collectionQuery(initial)), initial)
  assert.deepEqual(initial.brands, ["Apple", "Samsung"])
  const rows = [
    {
      id: "a",
      name: "Phone A",
      sku: "A",
      brand: "Apple",
      category: "mobiles",
      price: 800,
      stock: 2,
    },
    {
      id: "b",
      name: "Phone B",
      sku: "B",
      brand: "Samsung",
      category: "mobiles",
      price: 400,
      stock: 0,
    },
    {
      id: "c",
      name: "Phone C",
      sku: "C",
      brand: "Apple",
      category: "mobiles",
      price: null,
      stock: null,
    },
    {
      id: "d",
      name: "Notebook",
      sku: "D",
      brand: "Apple",
      category: "laptops",
      price: 300,
      stock: 1,
    },
  ]
  assert.deepEqual(
    selectCollection(scopeCollection(rows, "mobiles"), initial).map(
      (p) => p.id,
    ),
    ["a"],
  )
  const stockOff = { ...initial, inStock: false }
  assert.deepEqual(
    selectCollection(scopeCollection(rows, "mobiles"), stockOff).map(
      (p) => p.id,
    ),
    ["b", "a"],
  )
  assert.deepEqual(
    rows.map((p) => p.id),
    ["a", "b", "c", "d"],
  )
  assert.equal(
    readCollectionFilters("?min=-1&max=no&sort=unknown&page=-7").page,
    1,
  )
  assert.equal(readCollectionFilters("?min=-1&max=no").min, "")
})

test("direct registration and sign-in are focused routes without the store header or footer", async () => {
  await openRoute("/register/?next=%2Faccount%2Fwishlist%2F")
  assert.equal(container.querySelector(".site-footer"), null)
  assert.equal(container.querySelector(".header-search"), null)
  assert.match(
    container.querySelector(".auth-form-panel h1").textContent,
    /Create your account/,
  )
  assert.equal(container.querySelector('input[name="password"]').minLength, 12)
  assert.equal(container.querySelector('input[name="terms"]').required, true)
  await click(
    [...container.querySelectorAll(".auth-mode-switch button")].find(
      (button) => button.textContent === "Sign in",
    ),
  )
  assert.equal(dom.location.pathname, "/login/")
  assert.match(container.querySelector("h1").textContent, /Welcome back/)
  assert.equal(
    new URLSearchParams(dom.location.search).get("next"),
    "/account/wishlist/",
  )
  await click(container.querySelector(".auth-forgot"))
  assert.equal(dom.location.pathname, "/forgot-password/")
  assert.equal(container.querySelector('input[name="password"]'), null)
})

test("the account dropdown groups wishlist and opens a closable registration dialog over the current product", async () => {
  await openRoute("/products/iphone-17-pro-max/")
  const trigger = container.querySelector(".account-menu-trigger")
  await click(trigger)
  assert.equal(trigger.getAttribute("aria-expanded"), "true")
  assert.ok(
    [...container.querySelectorAll(".account-menu-panel nav button")].some(
      (button) => /Wishlist/.test(button.textContent),
    ),
  )
  await click(container.querySelector(".account-register"))
  const dialog = container.querySelector('[role="dialog"]')
  assert.ok(dialog.querySelector(".auth-card"))
  assert.equal(dialog.querySelector(".site-footer"), null)
  assert.equal(dialog.querySelector(".header-search"), null)
  assert.ok(
    container.querySelector(".product-main-image"),
    "The underlying product stays in place",
  )
  assert.equal(dom.location.pathname, "/products/iphone-17-pro-max/")
  assert.equal(dom.document.activeElement.name, "name")
  await click(dialog.querySelector('[aria-label="Show password"]'))
  assert.equal(dialog.querySelector('input[name="password"]').type, "text")
  await click(
    [...dialog.querySelectorAll(".auth-mode-switch button")].find(
      (button) => button.textContent === "Sign in",
    ),
  )
  assert.equal(container.querySelector('input[name="name"]'), null)
  await dispatch(dom, key("Escape"))
  assert.equal(container.querySelector('[role="dialog"]'), null)
  assert.equal(dom.document.activeElement, trigger)
})

test("account navigation removes About from the menu while retaining the footer link", async () => {
  await openRoute("/")
  assert.ok(
    ![...container.querySelectorAll(".nav-desktop a, .nav-drawer a")].some(
      (link) => /about/i.test(link.textContent),
    ),
  )
  assert.ok(container.querySelector('.site-footer a[href="/about/"]'))
  assert.equal(
    [...container.querySelectorAll(".header-actions>button")].some((button) =>
      /Wishlist/.test(button.textContent),
    ),
    false,
  )
  const trigger = container.querySelector(".account-menu-trigger")
  await dispatch(trigger, key("ArrowDown"))
  assert.equal(
    dom.document.activeElement,
    container.querySelector(".account-sign-in"),
  )
  await dispatch(dom.document, key("Escape"))
  assert.equal(trigger.getAttribute("aria-expanded"), "false")
})

test("guest wishlist is available under account and sign-in merges it into the authenticated wishlist", async () => {
  const originalFetch = globalThis.fetch
  const saved = products.find((product) => product.id === "iphone-17-pro-max")
  const writes = []
  const customer = {
    id: "customer-ui-test",
    role: "customer",
    name: "Test Shopper",
    email: "shopper@example.test",
    phone: "",
    addresses: [],
  }
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).endsWith("/auth/login"))
      return { ok: true, json: async () => ({ user: customer }) }
    if (String(url).endsWith("/wishlist") && options.method === "PUT") {
      writes.push(JSON.parse(options.body).ids)
      return { ok: true, json: async () => ({ ok: true }) }
    }
    return originalFetch(url, options)
  }
  try {
    dom.localStorage.setItem("lt.wishlist.v2", JSON.stringify([saved.id]))
    await openRoute("/account/wishlist/")
    assert.match(
      container.querySelector(".account-wishlist-page").textContent,
      /Saved on this device/,
    )
    assert.match(
      container.querySelector(".product-grid").textContent,
      new RegExp(saved.name),
    )
    await click(container.querySelector(".wishlist-sign-in .button"))
    const historyLength = dom.history.length
    dom.document.documentElement.scrollTop = 600
    const dialog = container.querySelector('[role="dialog"]')
    await fillInput(dialog.querySelector('[name="email"]'), customer.email)
    await fillInput(
      dialog.querySelector('[name="password"]'),
      "a-test-only-password",
    )
    await dispatch(
      dialog.querySelector("form"),
      new dom.Event("submit", { bubbles: true, cancelable: true }),
    )
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    assert.equal(container.querySelector('[role="dialog"]'), null)
    assert.equal(dom.location.pathname, "/account/wishlist/")
    assert.equal(
      dom.history.length,
      historyLength,
      "Signing in over the current view adds no extra history entry",
    )
    assert.equal(
      dom.document.documentElement.scrollTop,
      600,
      "Signing in keeps the shopper's position",
    )
    assert.match(
      container.querySelector(".account-content").textContent,
      /Your saved favourites/,
    )
    assert.ok(
      writes.some((ids) => ids.includes(saved.id)),
      "Guest favourites sync to the signed-in account",
    )
    assert.ok(container.querySelector(".account-content .product-card"))
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("image-led discovery switches to actual brands and the clean filters preserve their URL", async () => {
  await openRoute("/collections/mobiles/")
  assert.ok(container.querySelectorAll(".discovery-rail img").length >= 8)
  const brandTab = [...container.querySelectorAll('[role="tab"]')].find(
    (button) => button.textContent === "Shop by brand",
  )
  await click(brandTab)
  assert.equal(brandTab.getAttribute("aria-selected"), "true")
  const apple = [...container.querySelectorAll(".discovery-rail button")].find(
    (button) => button.textContent.trim() === "Apple",
  )
  assert.ok(apple.querySelector("img"))
  await click(apple)
  assert.equal(new URLSearchParams(dom.location.search).get("brand"), "Apple")
  const names = () =>
    [
      ...container.querySelectorAll(".collection-results .product-card h3 a"),
    ].map((link) => decodeURIComponent(link.getAttribute("href").split("/")[2]))
  assert.ok(names().length)
  assert.ok(
    names().every((id) => products.find((p) => p.id === id).brand === "Apple"),
  )
  const priceForm = container.querySelector(
    ".refined-sidebar .refined-price-form",
  )
  await fillInput(priceForm.querySelector('[placeholder="Min"]'), "1000000")
  await fillInput(priceForm.querySelector('[placeholder="Max"]'), "6000000")
  await dispatch(
    priceForm,
    new dom.Event("submit", { bubbles: true, cancelable: true }),
  )
  assert.equal(new URLSearchParams(dom.location.search).get("min"), "1000000")
  assert.ok(
    names().every((id) => {
      const p = products.find((p) => p.id === id)
      return p.price >= 1000000 && p.price <= 6000000
    }),
  )
  await click(container.querySelector('[aria-label="Remove Apple filter"]'))
  assert.equal(new URLSearchParams(dom.location.search).has("brand"), false)
  assert.equal(new URLSearchParams(dom.location.search).get("min"), "1000000")
  await click(container.querySelector(".refined-filter-chips .reset-all"))
  assert.equal(dom.location.search, "")
})

test("header removes the phone numbers beside the cart and keeps the saved cart quantity", async () => {
  dom.localStorage.setItem(
    "lt.cart.v2",
    JSON.stringify([{ id: products[0].id, quantity: 3 }]),
  )
  await openRoute("/collections/mobiles/")
  const actions = container.querySelector(".header-actions")
  assert.doesNotMatch(actions.textContent, /0788|0709|Hotline|Call us/i)
  assert.equal(container.querySelector(".header-hotline"), null)
  const cart = actions.querySelector('[aria-label="Open shopping cart"]')
  assert.match(cart.textContent, /3/)
  assert.ok(
    container.querySelector('.site-footer a[href="tel:+256788341111"]'),
    "Contact details remain in the footer",
  )
  await click(container.querySelector('[aria-label="Search by image"]'))
  assert.ok(container.querySelector(".image-search-dialog"))
  await dispatch(dom, key("Escape"))
  assert.equal(container.querySelector(".image-search-dialog"), null)
})

test("discovery has one next arrow and scrolls only its contained rail, then disables at the end", async () => {
  await openRoute("/collections/mobiles/")
  const rail = container.querySelector(".discovery-rail")
  const next = container.querySelector(".discovery-next")
  assert.equal(container.querySelectorAll(".discovery-next").length, 1)
  assert.equal(container.querySelector(".discovery-scroll"), null)
  assert.equal(next.disabled, true, "No arrow when the row fits")
  Object.defineProperties(rail, {
    scrollWidth: { value: 1500, configurable: true },
    clientWidth: { value: 600, configurable: true },
  })
  const moves = []
  rail.scrollBy = (options) => moves.push(options)
  await dispatch(dom, new dom.Event("resize"))
  assert.equal(next.disabled, false)
  await click(next)
  assert.deepEqual(moves.at(-1), { left: 480, behavior: "auto" })
  await dispatch(rail, key("ArrowLeft"))
  assert.equal(moves.at(-1).left, -480)
  assert.equal(dom.document.documentElement.scrollTop, 0)
  rail.scrollLeft = 900
  await dispatch(rail, new dom.Event("scroll"))
  assert.equal(next.disabled, true)
  await click(
    [...container.querySelectorAll('[role="tab"]')].find(
      (tab) => tab.textContent === "Shop by brand",
    ),
  )
  assert.equal(
    rail.scrollLeft,
    0,
    "Switching tabs resets the row without scrolling the page",
  )
})

test("detailed collection cards show model facts, real reviews, stock and distinct preview photos", async () => {
  reducedMotion = true
  const product = {
    ...products.find((product) => product.id === "iphone-13-pro-max"),
    stock: 0,
    reviewCount: 2,
    rating: 4.5,
  }
  await render(
    React.createElement(
      StoreProvider,
      null,
      React.createElement(ProductCard, { product, detailed: true }),
    ),
  )
  assert.match(
    container.querySelector(".card-product-facts").textContent,
    /Display|Chip/,
  )
  assert.match(
    container.querySelector(".card-product-bottom, .product-card-bottom")
      .textContent,
    /UGX/,
  )
  assert.match(container.querySelector(".card-real-rating").textContent, /4.5/)
  assert.match(
    container.querySelector(".card-availability").textContent,
    /Out of stock/,
  )
  assert.equal(
    container.querySelector('[aria-label^="Add iPhone"]').disabled,
    true,
  )
  const photos = [...container.querySelectorAll(".card-photo-options button")]
  assert.ok(photos.length > 1)
  const image = container.querySelector(".product-card-media img")
  const first = image.getAttribute("src")
  await dispatch(photos[1], pointer("pointerover"))
  assert.notEqual(image.getAttribute("src"), first)
  assert.equal(photos[1].getAttribute("aria-pressed"), "true")
  await render(
    React.createElement(
      StoreProvider,
      null,
      React.createElement(ProductCard, {
        product: { ...product, stock: null, reviewCount: 0, rating: null },
        detailed: true,
      }),
    ),
  )
  assert.equal(container.querySelector(".card-real-rating"), null)
  assert.match(
    container.querySelector(".card-availability").textContent,
    /Check availability/,
  )
})

test("image search handles invalid files, dropped photos, stale results and matching links without uploading", async () => {
  const originalCreate = URL.createObjectURL,
    originalRevoke = URL.revokeObjectURL
  const revoked = [],
    searches = []
  URL.createObjectURL = (file) => "blob:test/" + file.name
  URL.revokeObjectURL = (url) => revoked.push(url)
  let cancellations = 0
  const createClient = () => ({
    cancel() {
      cancellations++
    },
    search(file, catalogue, progress) {
      progress("Comparing photos…")
      return new Promise((resolve, reject) =>
        searches.push({ file, catalogue, resolve, reject }),
      )
    },
  })
  try {
    await render(
      React.createElement(
        StoreProvider,
        null,
        React.createElement(ImageSearchDialog, { createClient }),
      ),
    )
    const drop = async (file) => {
      const event = new dom.Event("drop", { bubbles: true, cancelable: true })
      Object.defineProperty(event, "dataTransfer", { value: { files: [file] } })
      await dispatch(container.querySelector(".image-search-drop"), event)
    }
    await drop(
      new dom.File(["<svg/>"], "unsafe.svg", { type: "image/svg+xml" }),
    )
    assert.match(
      container.querySelector('[role="alert"]').textContent,
      /JPG, PNG or WebP/,
    )
    assert.equal(searches.length, 0)
    await drop(new dom.File(["image-one"], "first.jpg", { type: "image/jpeg" }))
    assert.match(
      container.querySelector('[role="status"]').textContent,
      /Finding similar items/,
    )
    assert.equal(searches[0].catalogue.length, products.length)
    await drop(new dom.File(["image-two"], "second.png", { type: "image/png" }))
    await act(async () =>
      searches[0].resolve([{ product: products[0], score: 0.99 }]),
    )
    assert.equal(
      container.querySelector(".visual-match"),
      null,
      "An older request cannot overwrite the current photo",
    )
    await act(async () =>
      searches[1].resolve([{ product: products[1], score: 0.86 }]),
    )
    assert.equal(
      container.querySelector(".visual-match").getAttribute("href"),
      "/products/" + products[1].id + "/",
    )
    assert.match(container.textContent, /Matched by appearance/)
    assert.ok(revoked.includes("blob:test/first.jpg"))
    const paste = new dom.Event("paste", { bubbles: true, cancelable: true })
    Object.defineProperty(paste, "clipboardData", {
      value: {
        files: [new dom.File(["third"], "third.webp", { type: "image/webp" })],
      },
    })
    await dispatch(dom, paste)
    await act(async () =>
      searches[2].reject(new Error("Please try another photo.")),
    )
    assert.match(
      container.querySelector('[role="alert"]').textContent,
      /Please try another photo/,
    )
    await act(async () => root.unmount())
    root = null
    assert.ok(revoked.includes("blob:test/third.webp"))
    assert.ok(cancellations >= 4)
  } finally {
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
  }
})

test("invalid price ranges stay unapplied and the mobile drawer keeps the same filter state", async () => {
  await openRoute("/collections/mobiles/")
  const form = container.querySelector(".refined-sidebar .refined-price-form")
  await fillInput(form.querySelector('[placeholder="Min"]'), "9000")
  await fillInput(form.querySelector('[placeholder="Max"]'), "1000")
  await dispatch(
    form,
    new dom.Event("submit", { bubbles: true, cancelable: true }),
  )
  assert.match(
    form.querySelector('[role="alert"]').textContent,
    /minimum below the maximum/,
  )
  assert.equal(new URLSearchParams(dom.location.search).has("min"), false)
  await click(container.querySelector(".refined-toolbar .mobile-filter"))
  const dialog = container.querySelector('[role="dialog"]')
  const apple = [
    ...dialog.querySelectorAll(".refined-brand-options label"),
  ].find((label) => label.querySelector("span").textContent === "Apple")
  await click(apple.querySelector("input"))
  await click(
    dialog.querySelector(".refined-mobile-filter-actions>.button:last-child"),
  )
  assert.equal(container.querySelector('[role="dialog"]'), null)
  assert.equal(new URLSearchParams(dom.location.search).get("brand"), "Apple")
  assert.ok(container.querySelector('[aria-label="Remove Apple filter"]'))
})

test("sign-in errors preserve the form and registration submits working credentials before returning to the chosen account page", async () => {
  const originalFetch = globalThis.fetch
  let registered
  const customer = {
    id: "registration-ui-test",
    role: "customer",
    name: "New Shopper",
    email: "new@example.test",
    phone: "",
    addresses: [],
  }
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).endsWith("/auth/login"))
      return {
        ok: false,
        status: 401,
        json: async () => ({ error: "Email or password is incorrect." }),
      }
    if (String(url).endsWith("/auth/register")) {
      registered = JSON.parse(options.body)
      return { ok: true, json: async () => ({ user: customer }) }
    }
    return originalFetch(url, options)
  }
  try {
    await openRoute("/login/?next=%2Faccount%2Fprofile%2F")
    await fillInput(container.querySelector('[name="email"]'), customer.email)
    await fillInput(
      container.querySelector('[name="password"]'),
      "incorrect-password",
    )
    await dispatch(
      container.querySelector("form"),
      new dom.Event("submit", { bubbles: true, cancelable: true }),
    )
    assert.match(
      container.querySelector('[role="alert"]').textContent,
      /Email or password is incorrect/,
    )
    assert.equal(
      container.querySelector('[name="email"]').value,
      customer.email,
    )
    await click(
      [...container.querySelectorAll(".auth-mode-switch button")].find(
        (button) => button.textContent === "Register",
      ),
    )
    assert.equal(container.querySelector('[role="alert"]'), null)
    await fillInput(container.querySelector('[name="name"]'), customer.name)
    await fillInput(container.querySelector('[name="email"]'), customer.email)
    await fillInput(
      container.querySelector('[name="password"]'),
      "a-test-only-password",
    )
    await click(container.querySelector('[name="terms"]'))
    await dispatch(
      container.querySelector("form"),
      new dom.Event("submit", { bubbles: true, cancelable: true }),
    )
    assert.equal(registered.name, customer.name)
    assert.equal(registered.email, customer.email)
    assert.equal(registered.password, "a-test-only-password")
    assert.equal(dom.location.pathname, "/account/profile/")
    assert.match(
      container.querySelector(".account-content").textContent,
      /Account details/,
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})
