import { after, afterEach, before, beforeEach, test } from "node:test"
import assert from "node:assert/strict"
import React, { act } from "react"
import { Window } from "happy-dom"
import { createServer } from "vite"

let dom, server, createRoot, ProductSectionNav, root, fixture, mount
let tops, frames, nextFrame, scrolls
const savedGlobals = new Map()
const ids = [
  "overview",
  "specifications",
  "reviews",
  "description",
  "guides",
  "delivery",
  "questions",
  "store",
]

before(async () => {
  dom = new Window({ url: "http://localhost/products/test/" })
  for (const [key, value] of Object.entries({
    window: dom,
    document: dom.document,
    navigator: dom.navigator,
    HTMLElement: dom.HTMLElement,
    Node: dom.Node,
    Event: dom.Event,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    savedGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, {
      value,
      writable: true,
      configurable: true,
    })
  }
  dom.requestAnimationFrame = (callback) => {
    const id = ++nextFrame
    frames.set(id, callback)
    return id
  }
  dom.cancelAnimationFrame = (id) => frames.delete(id)
  dom.HTMLElement.prototype.scrollIntoView = function (options) {
    scrolls.push({ element: this.id, ...options })
  }
  dom.document.addEventListener("click", (event) => event.preventDefault())
  ;({ createRoot } = await import("react-dom/client"))
  server = await createServer({
    cacheDir: ".cache/vite-tests/product-section-nav",
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: "custom",
    optimizeDeps: { noDiscovery: true },
  })
  ;({ ProductSectionNav } = await server.ssrLoadModule(
    "/src/components/ProductSectionNav.jsx",
  ))
})

beforeEach(() => {
  dom.history.replaceState({}, "", "/products/test/")
  frames = new Map()
  nextFrame = 0
  scrolls = []
  tops = Object.fromEntries(ids.map((id, index) => [id, 600 + index * 500]))
  fixture = dom.document.createElement("main")
  fixture.className = "product-page"
  mount = dom.document.createElement("div")
  fixture.append(mount)
  for (const id of ids) {
    const section = dom.document.createElement("section")
    section.id = "product-" + id
    section.getBoundingClientRect = () => ({
      top: tops[id],
      bottom: tops[id] + 500,
      height: 500,
      left: 0,
      right: 700,
      width: 700,
    })
    fixture.append(section)
  }
  dom.document.body.append(fixture)
})

afterEach(async () => {
  if (root) await act(async () => root.unmount())
  root = null
  fixture.remove()
})

after(async () => {
  await server?.close()
  await dom?.happyDOM.close()
  for (const [key, descriptor] of savedGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
})

async function render(productId = "first", reviewCount = 3) {
  root ||= createRoot(mount)
  await act(async () =>
    root.render(
      React.createElement(ProductSectionNav, { productId, reviewCount }),
    ),
  )
  fixture.querySelector("nav").getBoundingClientRect = () => ({
    top: 0,
    bottom: 56,
    height: 56,
    left: 0,
    right: 320,
    width: 320,
  })
}

async function flushFrame() {
  const callbacks = [...frames.values()]
  frames.clear()
  await act(async () => callbacks.forEach((callback) => callback(0)))
}

async function scrollToSection(id) {
  const current = ids.indexOf(id)
  ids.forEach((section, index) => {
    tops[section] = 80 + (index - current) * 500
  })
  await act(async () => dom.dispatchEvent(new dom.Event("scroll")))
  await flushFrame()
}

const active = () =>
  fixture.querySelector('a[aria-current="location"]')?.getAttribute("href")

test("product information navigation marks one current section and follows reading position", async () => {
  await render()
  await flushFrame()
  assert.equal(active(), "#product-overview")
  assert.equal(fixture.querySelectorAll('a[aria-current="location"]').length, 1)
  assert.match(
    fixture.querySelector('[href="#product-reviews"]').textContent,
    /Reviews \(3\)/,
  )
  await scrollToSection("reviews")
  assert.equal(active(), "#product-reviews")
  await scrollToSection("delivery")
  assert.equal(active(), "#product-delivery")
  await scrollToSection("overview")
  assert.equal(active(), "#product-overview")
  assert.equal(scrolls.length, 0, "Reading updates never move the page")
  const height = Object.getOwnPropertyDescriptor(
    dom.document.documentElement,
    "scrollHeight",
  )
  const position = Object.getOwnPropertyDescriptor(dom, "scrollY")
  Object.defineProperty(dom.document.documentElement, "scrollHeight", {
    value: 3000,
    configurable: true,
  })
  Object.defineProperty(dom, "scrollY", {
    value: 3000 - dom.innerHeight,
    configurable: true,
  })
  try {
    await act(async () => dom.dispatchEvent(new dom.Event("scroll")))
    await flushFrame()
    assert.equal(
      active(),
      "#product-store",
      "At the page bottom the final section stays current even if it is too short to align at the top",
    )
  } finally {
    if (height)
      Object.defineProperty(
        dom.document.documentElement,
        "scrollHeight",
        height,
      )
    else delete dom.document.documentElement.scrollHeight
    if (position) Object.defineProperty(dom, "scrollY", position)
    else delete dom.scrollY
  }
})

test("clicking selects immediately while keeping the current link visible within its own narrow rail", async (t) => {
  // A slow concurrent build must not consume the simulated smooth-scroll
  // grace period. Frames are controlled above; keep this timer controlled too.
  const timers = new Map()
  let timerId = 0
  t.mock.method(dom, "setTimeout", (callback, delay) => {
    timers.set(++timerId, { callback, delay })
    return timerId
  })
  t.mock.method(dom, "clearTimeout", (id) => timers.delete(id))
  await render()
  await flushFrame()
  const rail = fixture.querySelector(".detail-section-rail")
  rail.getBoundingClientRect = () => ({
    left: 10,
    right: 230,
    width: 220,
    top: 0,
    bottom: 56,
    height: 56,
  })
  const moves = []
  rail.scrollBy = (options) => moves.push(options)
  const target = fixture.querySelector('[href="#product-reviews"]')
  target.getBoundingClientRect = () => ({
    left: 270,
    right: 360,
    width: 90,
    top: 0,
    bottom: 56,
    height: 56,
  })
  await act(async () => target.click())
  assert.equal(active(), "#product-reviews")
  assert.ok(
    moves.some(
      (options) => options.left === 142 && options.behavior === "auto",
    ),
  )
  await act(async () => dom.dispatchEvent(new dom.Event("scroll")))
  await flushFrame()
  assert.equal(
    active(),
    "#product-reviews",
    "A smooth anchor jump does not flash intermediate tabs",
  )
  await scrollToSection("reviews")
  await scrollToSection("description")
  assert.equal(active(), "#product-description")
  fixture.querySelector('[href="#product-description"]').getBoundingClientRect =
    () => ({
      left: 500,
      right: 600,
      width: 100,
      top: 0,
      bottom: 56,
      height: 56,
    })
  await act(async () => dom.dispatchEvent(new dom.Event("resize")))
  await flushFrame()
  assert.ok(
    moves.some((options) => options.left === 382),
    "Resizing reveals the current link even when the selected section has not changed",
  )
  assert.equal(
    scrolls.length,
    0,
    "Selection reveals only the link; native anchor navigation owns the page jump",
  )
})

test("keyboard navigation reveals links without changing which section is currently being read", async () => {
  await render()
  await flushFrame()
  const overview = fixture.querySelector('[href="#product-overview"]')
  await act(async () => {
    overview.focus()
    overview.dispatchEvent(
      new dom.KeyboardEvent("keydown", {
        key: "ArrowRight",
        bubbles: true,
        cancelable: true,
      }),
    )
  })
  assert.equal(
    dom.document.activeElement.getAttribute("href"),
    "#product-specifications",
  )
  assert.equal(active(), "#product-overview")
  await act(async () =>
    dom.document.activeElement.dispatchEvent(
      new dom.KeyboardEvent("keydown", {
        key: "End",
        bubbles: true,
        cancelable: true,
      }),
    ),
  )
  assert.equal(
    dom.document.activeElement.getAttribute("href"),
    "#product-store",
  )
  await act(async () =>
    dom.document.activeElement.dispatchEvent(
      new dom.KeyboardEvent("keydown", {
        key: "Home",
        bubbles: true,
        cancelable: true,
      }),
    ),
  )
  assert.equal(dom.document.activeElement, overview)
})

test("deep links, product changes and cleanup keep navigation state consistent", async () => {
  dom.history.replaceState({}, "", "/products/test/#product-guides")
  ids.forEach((id, index) => {
    tops[id] = 80 + (index - ids.indexOf("guides")) * 500
  })
  await render()
  await flushFrame()
  assert.equal(active(), "#product-guides")
  assert.deepEqual(scrolls, [
    { element: "product-guides", block: "start", behavior: "instant" },
  ])
  dom.history.replaceState({}, "", "/products/another/")
  ids.forEach((id, index) => {
    tops[id] = 600 + index * 500
  })
  await render("second", 0)
  await flushFrame()
  assert.equal(active(), "#product-overview")
  assert.match(
    fixture.querySelector('[href="#product-reviews"]').textContent,
    /Reviews \(0\)/,
  )
  await act(async () => root.unmount())
  root = null
  await act(async () => dom.dispatchEvent(new dom.Event("scroll")))
  assert.equal(frames.size, 0)
})

test("the compact picker reaches every section and stays in sync while reading", async () => {
  await render()
  await flushFrame()
  const select = fixture.querySelector(".detail-mobile-nav select")
  assert.equal(select.options.length, 8)
  assert.equal(select.value, "overview")
  assert.ok(fixture.querySelector(`label[for="${select.id}"]`))
  await act(async () => {
    select.value = "delivery"
    select.dispatchEvent(new dom.Event("change", { bubbles: true }))
  })
  assert.equal(active(), "#product-delivery")
  assert.equal(dom.location.hash, "#product-delivery")
  assert.deepEqual(scrolls.at(-1), {
    element: "product-delivery",
    block: "start",
    behavior: "instant",
  })
  await scrollToSection("delivery")
  await scrollToSection("questions")
  assert.equal(select.value, "questions")
  assert.equal(active(), "#product-questions")
})
