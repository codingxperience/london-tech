import { after, before, test } from "node:test"
import assert from "node:assert/strict"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { createServer } from "vite"
import { products } from "../src/data/catalog.js"
import {
  arabicMoney,
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

function renderStore(Component, { search = "", stored = {}, props = {} } = {}) {
  Object.defineProperty(globalThis, "location", {
    value: {
      pathname: "/",
      search,
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

test("cards can omit redundant badges without hiding regular or Arabic prices", () => {
  const product = products[0]
  const markup = renderToStaticMarkup(
    React.createElement(ProductOffer, {
      product,
      showStock: false,
      showDiscountBadge: false,
    }),
  )
  assert.match(markup, /Regular price:/)
  assert.match(markup, /السعر بعد الخصم/)
  assert.doesNotMatch(markup, /offer-discount|offer-stock|data-demo|Demo offer/)
  assert.match(
    renderToStaticMarkup(React.createElement(StockAvailability, { product })),
    /\d+ items left/,
  )
})

test("normal product pages show launch offers without a preview URL", () => {
  const product = products.find((item) => item.id === "iphone-13-pro-max")
  const normal = renderStore(Product, { props: { id: product.id } })
  assert.match(normal, /السعر بعد الخصم/)
  assert.match(normal, /Regular price:/)
  assert.match(normal, new RegExp(`${product.stock} items left`))
  assert.doesNotMatch(
    normal,
    /Guide price|Stock unconfirmed|Demo offer|Demo stock/,
  )
  const legacyLink = renderStore(Product, {
    search: "?preview=offers",
    props: { id: product.id },
  })
  assert.equal(
    legacyLink,
    normal,
    "Old preview links display the same normal offers",
  )
})

test("comparison, product cards and cart use the same approved selling price", () => {
  const product = products.find((item) => item.id === "iphone-13-pro-max")
  const stored = {
    "lt.compare.v2": [product.id],
    "lt.cart.v2": [{ id: product.id, quantity: 2, option: "", color: "" }],
  }
  const comparison = renderStore(Compare, { stored })
  assert.match(comparison, /comparison-table/)
  assert.match(comparison, /Regular price:/)
  assert.match(comparison, /السعر بعد الخصم/)
  assert.match(comparison, new RegExp(`${product.stock} items left`))
  const cart = renderStore(Cart, { stored })
  const summary = cart.match(
    /<aside class="order-summary">[\s\S]*?<\/aside>/,
  )?.[0]
  assert.ok(
    summary,
    "The actual cart summary exists separately from recommendation cards",
  )
  assert.ok(
    summary.includes(offerMoney(product.price * 2)),
    "The cart totals the same approved selling price shown on cards",
  )
  assert.doesNotMatch(summary, /Demo offer|Demo stock|سعر تجريبي/)
})
