import { after, before, test } from "node:test"

import assert from "node:assert/strict"

import React from "react"

import { renderToString } from "react-dom/server"

import { createServer } from "vite"
import { products } from "../src/data/catalog.js"

let server,
  StoreProvider,
  shop,
  checkout,
  account,
  info,
  Admin,
  Reference,
  ProductEditor,
  AdminOrderModal

before(async () => {
  server = await createServer({
    cacheDir: ".cache/vite-tests/render",
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: "custom",
    optimizeDeps: { noDiscovery: true },
  })
  ;({ StoreProvider } = await server.ssrLoadModule("/src/store.jsx"))

  shop = await server.ssrLoadModule("/src/pages/shop.jsx")
  checkout = await server.ssrLoadModule("/src/pages/checkout.jsx")
  account = await server.ssrLoadModule("/src/pages/account.jsx")
  info = await server.ssrLoadModule("/src/pages/info.jsx")
  ;({
    default: Admin,
    ProductEditor,
    AdminOrderModal,
  } = await server.ssrLoadModule("/src/pages/admin.jsx"))
  ;({ default: Reference } = await server.ssrLoadModule("/src/App.tsx"))

  globalThis.location = { pathname: "/", search: "", href: "http://localhost/" }
})

after(async () => {
  await server?.close()
  delete globalThis.location
})

test("storefront and product screens render without runtime exceptions", () => {
  const cases = [
    [Reference, {}, "New week."],
    [shop.Collection, { category: "mobiles" }, "Phones."],

    [shop.Product, { id: "iphone-17-pro-max" }, "Specifications"],
    [shop.Wishlist, {}, "favourites"],

    [shop.Compare, {}, "Choose with clarity"],
    [checkout.Cart, {}, "Your cart"],
    [checkout.Checkout, {}, "Getting your checkout ready"],

    [account.Auth, { mode: "register" }, "Register / Sign in"],
    [info.Info, { page: "contact" }, "0788341111"],
    [info.Info, { page: "about" }, "NYUMBA KUBUA"],

    [Admin, { preview: true, section: "dashboard" }, "Total sales"],
    [Admin, { preview: true, section: "products" }, "Add product"],
    [Admin, { preview: true, section: "settings" }, "Store connections"],
    [
      ProductEditor,
      {
        product: products[0],
        preview: true,
        existing: true,
        onClose: () => {},
        onSave: () => {},
      },
      "Product information",
    ],
    [
      AdminOrderModal,
      {
        order: {
          id: "DEMO-TEST",
          status: "quote_requested",
          paymentStatus: "unpaid",
          amount: null,
          items: [
            { ...products[0], quantity: 1, unitPrice: products[0].price },
          ],
          customer: { name: "Test", email: "test@example.com", phone: "Test" },
          createdAt: new Date().toISOString(),
          fulfillment: "collection",
          paymentMethod: "mtn",
        },
        preview: true,
        onClose: () => {},
        onSave: () => {},
        onQuote: () => {},
      },
      "Confirm a quote",
    ],
  ]

  for (const [Component, props, expected] of cases) {
    const html = renderToString(
      React.createElement(
        StoreProvider,
        null,
        React.createElement(Component, props),
      ),
    )

    assert.ok(html.includes(expected), Component.name + " includes " + expected)

    assert.ok(html.length > 100)
  }
})
