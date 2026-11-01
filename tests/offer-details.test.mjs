import { after, before, test } from "node:test"
import assert from "node:assert/strict"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { createServer } from "vite"
import { products } from "../src/data/catalog.js"
import {
  arabicMoney,
  demoOffer,
  offerMoney,
  productOffer,
  stockAvailability,
} from "../src/lib/offer-details.js"

let server,
  ProductOffer,
  StockAvailability,
  StoreProvider,
  Product,
  Compare,
  Cart
const originalGlobals = new Map()
before(async () => {
  server = await createServer({
    server: {
      middlewareMode: true,
      hmr: false,
      ws: false,
      watch: { ignored: ["**/.cache/**"] },
    },
    appType: "custom",
    optimizeDeps: { noDiscovery: true },
  })
  ;({ ProductOffer, StockAvailability } = await server.ssrLoadModule(
    "/src/components/ProductOffer.jsx",
  ))
  ;({ StoreProvider } = await server.ssrLoadModule("/src/store.jsx"))
  ;({ Product, Compare } = await server.ssrLoadModule("/src/pages/shop.jsx"))
  ;({ Cart } = await server.ssrLoadModule("/src/pages/checkout.jsx"))
  for (const name of ["location", "localStorage"])
    originalGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
})
after(async () => {
  await server?.close()
  for (const [name, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor)
    else delete globalThis[name]
  }
})

function renderStore(
  Component,
  { demo = false, stored = {}, props = {} } = {},
) {
  Object.defineProperty(globalThis, "location", {
    value: {
      pathname: "/",
      search: demo ? "?preview=offers" : "",
      href: "http://localhost/",
    },
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key) =>
        stored[key] === undefined ? null : JSON.stringify(stored[key]),
    },
    configurable: true,
    writable: true,
  })
  return renderToStaticMarkup(
    React.createElement(
      StoreProvider,
      null,
      React.createElement(Component, props),
    ),
  )
}

test("only confirmed real prices receive genuine discount claims", () => {
  const actual = productOffer({
    price: 85000,
    comparePrice: 100000,
    priceConfirmed: true,
  })
  assert.equal(actual.discountPercent, 15)
  assert.equal(actual.originalPrice, 100000)
  assert.equal(actual.guide, false)
  const guide = productOffer({
    price: 85000,
    comparePrice: 100000,
    priceConfirmed: false,
  })
  assert.equal(guide.discounted, false)
  assert.equal(guide.originalPrice, null)
  assert.equal(guide.guide, true)
  for (const comparePrice of [null, 0, -1, 80000, NaN, Infinity, "100000"])
    assert.equal(
      productOffer({ price: 85000, comparePrice, priceConfirmed: true })
        .originalPrice,
      null,
    )
  for (const price of [null, -1, NaN, Infinity, "85000"])
    assert.equal(
      productOffer({ price, comparePrice: 100000, priceConfirmed: true }).price,
      null,
    )
})

test("known remaining stock is precise, while missing or invalid inventory stays unconfirmed", () => {
  assert.equal(stockAvailability({ stock: 1 }).label, "1 item left")
  assert.equal(stockAvailability({ stock: 8 }).label, "8 items left")
  assert.equal(stockAvailability({ stock: 0 }).state, "out")
  for (const stock of [null, undefined, -2, 1.5, Infinity, "5"]) {
    const result = stockAvailability({ stock })
    assert.equal(result.quantity, null)
    assert.equal(result.note, "Stock unconfirmed")
  }
})

test("review figures are deterministic, explicitly separate and cannot change actual prices or stock", () => {
  const product = Object.freeze({
    id: "phone-a",
    name: "Phone A",
    price: 85000,
    comparePrice: null,
    stock: null,
    priceConfirmed: false,
  })
  const before = JSON.stringify(product)
  const first = demoOffer(product),
    second = demoOffer(product)
  assert.deepEqual(first, second)
  assert.equal(JSON.stringify(product), before)
  assert.equal(first.price, 85000)
  assert.ok(first.comparePrice > first.price)
  assert.ok(first.stock > 0)
  assert.equal(first.priceConfirmed, false)
  const offer = productOffer(product, { demo: true })
  assert.equal(offer.demo, true)
  assert.ok(offer.discountPercent > 0)
  assert.match(
    stockAvailability(product, { demo: true }).label,
    /^Demo stock · \d+ left$/,
  )
  assert.equal(productOffer(product).originalPrice, null)
  assert.equal(stockAvailability(product).quantity, null)
  assert.equal(demoOffer({ id: "no-price", price: null }).price, null)
  assert.equal(demoOffer({ id: "no-price", price: null }).comparePrice, null)
  assert.equal(stockAvailability({ stock: 0 }, { demo: true }).quantity, 0)
})

test("Arabic prices use Arabic-Indic digits and the Ugandan shilling instead of a converted currency", () => {
  assert.equal(offerMoney(5650000), "UGX 5,650,000")
  assert.equal(arabicMoney(5650000), "٥٬٦٥٠٬٠٠٠ شلن أوغندي")
  assert.equal(offerMoney(null), "Price on request")
  assert.equal(arabicMoney(null), "السعر عند الطلب")
})

test("the shared offer renders struck price, a negative discount, Arabic sale price and stock on every card", () => {
  const markup = renderToStaticMarkup(
    React.createElement(ProductOffer, {
      product: {
        price: 85000,
        comparePrice: 100000,
        priceConfirmed: true,
        stock: 3,
      },
    }),
  )
  assert.match(markup, /−15%/)
  assert.match(markup, /<del[^>]*>UGX 100,000<\/del>/)
  assert.match(markup, /lang="ar" dir="rtl"/)
  assert.match(markup, /السعر بعد الخصم/)
  assert.match(markup, /٨٥٬٠٠٠ شلن أوغندي/)
  assert.match(markup, /3 items left/)
  assert.doesNotMatch(markup, /Demo offer|Guide price/)
  const pending = renderToStaticMarkup(
    React.createElement(ProductOffer, {
      product: { price: 85000, comparePrice: 100000, stock: null },
    }),
  )
  assert.match(pending, /Guide price/)
  assert.match(pending, /Stock unconfirmed/)
  assert.doesNotMatch(pending, /<del|offer-discount/)
})

test("demo markup labels both the offer and inventory and supports a single discount badge per card", () => {
  const product = { id: "test-item", price: 85000, stock: null }
  const markup = renderToStaticMarkup(
    React.createElement(ProductOffer, {
      product,
      demo: true,
      showStock: false,
      showDiscountBadge: false,
    }),
  )
  assert.match(markup, /Demo offer/)
  assert.match(markup, /سعر تجريبي بعد الخصم/)
  assert.match(markup, /<del/)
  assert.doesNotMatch(markup, /offer-discount|offer-stock/)
  const stock = renderToStaticMarkup(
    React.createElement(StockAvailability, { product, demo: true }),
  )
  assert.match(stock, /Demo stock · \d+ left/)
})

test("product details show matching review offers while retaining the real guide-price request workflow", () => {
  const product = products.find((item) => item.id === "iphone-13-pro-max")
  const demo = renderStore(Product, { demo: true, props: { id: product.id } })
  assert.match(demo, /Demo offer/)
  assert.match(demo, /Demo stock · \d+ left/)
  assert.match(demo, /سعر تجريبي بعد الخصم/)
  assert.match(
    demo,
    /The store confirms actual pricing and availability before payment/,
  )
  assert.match(demo, /Request this item/)
  assert.doesNotMatch(demo, />Continue to checkout</)
  const normal = renderStore(Product, { props: { id: product.id } })
  assert.match(normal, /Guide price/)
  assert.match(normal, /Stock unconfirmed/)
  assert.doesNotMatch(normal, /Demo offer|Demo stock/)
})

test("comparison includes the shared bilingual offer and review mode does not change cart totals", () => {
  const product = products.find((item) => item.id === "iphone-13-pro-max")
  const stored = {
    "lt.compare.v2": [product.id],
    "lt.cart.v2": [{ id: product.id, quantity: 2, option: "", color: "" }],
  }
  const comparison = renderStore(Compare, { demo: true, stored })
  assert.match(comparison, /comparison-table/)
  assert.match(comparison, /Demo offer/)
  assert.match(comparison, /سعر تجريبي بعد الخصم/)
  assert.match(comparison, /Demo stock · \d+ left/)
  const cart = renderStore(Cart, { demo: true, stored })
  const summary = cart.match(
    /<aside class="order-summary">[\s\S]*?<\/aside>/,
  )?.[0]
  assert.ok(
    summary,
    "The actual cart summary exists separately from recommendation cards",
  )
  assert.ok(
    summary.includes(offerMoney(product.price * 2)),
    "The cart still totals the original guide price",
  )
  assert.doesNotMatch(summary, /Demo offer|Demo stock|سعر تجريبي/)
})
