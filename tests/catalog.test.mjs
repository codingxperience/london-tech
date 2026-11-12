import { test } from "node:test"

import assert from "node:assert/strict"

import { access, readFile } from "node:fs/promises"

import { products, categories, caseProducts, phoneProducts, storeDefaults } from "../src/data/catalog.js"
import { referenceProducts } from "../src/data/reference-catalogue.js"

test("catalogue images exist, identifiers are unique and every category resolves", async () => {
  assert.equal(new Set(products.map((p) => p.id)).size, products.length)

  for (const product of products) {
    assert.ok(
      categories.some((c) => c.id === product.category),
      product.id + " has a category",
    )

    if ((phoneProducts.includes(product) || caseProducts.includes(product)) && product.stock == null) {
      assert.equal(product.price, null)
      assert.equal(product.priceConfirmed, false)
      assert.equal(product.comparePrice, null)
    } else if (referenceProducts.some((entry) => entry.id === product.id)) {
      if (product.price != null) {
        assert.ok(Number.isSafeInteger(product.price) && product.price > 0)
      }
      assert.ok(!product.priceConfirmed || product.price != null)
      assert.equal(product.comparePrice, null)
      assert.equal(product.stock, null)
    } else {
      assert.ok(Number.isInteger(product.price) && product.price > 0)
      assert.equal(product.priceConfirmed, true)
      assert.ok(product.comparePrice > product.price)
      assert.ok(Number.isSafeInteger(product.stock) && product.stock > 0)
    }

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
        'property="og:image" content="https://london-tech.vercel.app/assets/london-tech-share-logo-v3.jpg"',
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
      assert.ok(html.includes("noindex,follow"))
  }
})

test("reference products render their local photos and show prices without claiming stock", async () => {
  for (const product of referenceProducts) {
    const html = await readFile(`dist/products/${product.id}/index.html`, "utf8")
    assert.ok(html.includes(`src="${product.image}"`), product.id)
    assert.ok(html.includes("/assets/catalogue-references/credits.txt"))
    if (product.price != null) {
      assert.ok(html.includes(new Intl.NumberFormat("en-UG").format(product.price)), product.id)
      assert.ok(!html.includes("Request the current price and configuration"), product.id)
    } else {
      assert.ok(html.includes("Request the current price and configuration"), product.id)
    }
    assert.ok(!html.includes('"@type":"Offer"'))
  }
})
