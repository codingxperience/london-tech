import { test } from "node:test"

import assert from "node:assert/strict"

import { access, readFile } from "node:fs/promises"

import { products, categories, storeDefaults } from "../src/data/catalog.js"

test("catalogue images exist, identifiers are unique and every category resolves", async () => {
  assert.equal(new Set(products.map((p) => p.id)).size, products.length)

  for (const product of products) {
    assert.ok(
      categories.some((c) => c.id === product.category),
      product.id + " has a category",
    )

    assert.ok(
      Number.isInteger(product.price) && product.price > 0,
      product.id + " has an approved selling price",
    )

    assert.equal(product.priceConfirmed, true)
    assert.ok(product.comparePrice > product.price)
    assert.ok(Number.isSafeInteger(product.stock) && product.stock > 0)

    assert.ok(product.gallery.length > 0)

    for (const image of product.gallery) {
      if (image.startsWith("/"))
        await access("public" + decodeURIComponent(image))
    }
  }

  assert.equal(storeDefaults.country, "Uganda")
  assert.equal(storeDefaults.currency, "UGX")

  assert.equal(storeDefaults.phone, "0788341111")
  assert.equal(storeDefaults.phoneAlt, "0709417273")
})

test("production pages have white-logo metadata, canonical URLs and approved product offers", async () => {
  for (const path of [
    "index.html",
    "products/iphone-17-pro-max/index.html",
    "collections/mobiles/index.html",
    "admin/index.html",
    "account/wishlist/index.html",
    "register/index.html",
  ]) {
    const html = await readFile("dist/" + path, "utf8")

    assert.ok(
      html.includes(
        'property="og:image" content="https://london-tech.vercel.app/assets/london-tech-logo.png"',
      ),
    )

    assert.ok(html.includes('rel="canonical"'))
    assert.ok(!html.includes("london-tech-social-card.png"))

    if (path.startsWith("products/"))
      assert.ok(html.includes('"@type":"Offer"'))

    if (
      path.startsWith("admin/") ||
      path.startsWith("account/") ||
      path.startsWith("register/")
    )
      assert.ok(html.includes("noindex,nofollow"))
  }
})
