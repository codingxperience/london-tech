import { test } from "node:test"
import assert from "node:assert/strict"
import { PGlite } from "@electric-sql/pglite"
import { products, legacyProducts } from "../src/data/catalog.js"
import { repairCatalogueMedia } from "../src/lib/catalogue-media.js"
import {
  galleryImages,
  productInformation,
} from "../src/lib/product-experience.js"
import { repairSeedCatalogue } from "../server/catalogue-migration.js"

test("known mismatched seed media is repaired without changing price, stock or selected configuration", () => {
  for (const id of [
    "galaxy-s26-ultra",
    "apple-watch-series",
    "samsung-galaxy-tablet",
    "apple-ipad-pro",
    "aramid-fibre-case",
    "pierre-cardin-softshell-72",
  ]) {
    const previous = legacyProducts.find((product) => product.id === id)
    const current = products.find((product) => product.id === id)
    const input = {
      ...previous,
      stock: 7,
      price: 1280000,
      priceConfirmed: true,
      options: ["Owner configuration"],
    }
    const repaired = repairCatalogueMedia(input)
    assert.equal(repaired.image, current.image)
    assert.deepEqual(repaired.gallery, current.gallery)
    assert.equal(repaired.stock, 7)
    assert.equal(repaired.price, 1280000)
    assert.equal(repaired.priceConfirmed, true)
    assert.deepEqual(repaired.options, ["Owner configuration"])
    assert.equal(input.image, previous.image, "The old record is never mutated")
  }
})

test("merchant name, primary-photo and gallery edits are preserved, including a primary-only edit", () => {
  const original = legacyProducts.find(
    (product) => product.id === "galaxy-s26-ultra",
  )
  for (const input of [
    { ...original, image: "/shop-photo.jpg" },
    { ...original, name: "Store-specific model" },
    { ...original, gallery: ["/shop-photo.jpg"] },
  ])
    assert.equal(repairCatalogueMedia(input), input)
  const current = products.find((product) => product.id === "iphone-13-pro-max")
  assert.equal(
    galleryImages({ ...current, image: "/merchant-main.jpg" })[0].src,
    "/merchant-main.jpg",
  )
  assert.equal(repairCatalogueMedia(current), current)
})

test("unverified accessory claims are removed and their reference status remains explicit", () => {
  for (const id of [
    "elite-controller",
    "magsafe-powerbank",
    "clear-armor-case",
    "slim-case-trio",
  ]) {
    const product = products.find((product) => product.id === id)
    assert.match(product.mediaNote, /reference/i)
    assert.doesNotMatch(
      JSON.stringify(productInformation(product)),
      /40 hours|4 back paddles|military-grade|0\.35mm|215g|10,000mAh/,
    )
  }
})

test(
  "the persisted catalogue migration repairs known old rows and protects concurrent merchant changes",
  { timeout: 120000 },
  async () => {
    const db = new PGlite()
    await db.exec(
      "CREATE TABLE products (id TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW())",
    )
    const old = legacyProducts.find(
      (product) => product.id === "apple-watch-series",
    )
    const merchant = {
      ...legacyProducts.find((product) => product.id === "galaxy-s26-ultra"),
      image: "/merchant-samsung.jpg",
    }
    for (const product of [old, merchant])
      await db.query("INSERT INTO products(id,data) VALUES($1,$2::jsonb)", [
        product.id,
        JSON.stringify(product),
      ])
    try {
      await repairSeedCatalogue(db)
      assert.equal(
        (await db.query("SELECT data FROM products WHERE id=$1", [old.id]))
          .rows[0].data.image,
        products.find((product) => product.id === old.id).image,
      )
      assert.equal(
        (await db.query("SELECT data FROM products WHERE id=$1", [merchant.id]))
          .rows[0].data.image,
        "/merchant-samsung.jpg",
      )
      await db.query("UPDATE products SET data=$2::jsonb WHERE id=$1", [
        old.id,
        JSON.stringify(old),
      ])
      const raced = { ...old, stock: 19 }
      const proxy = {
        async query(sql, values) {
          const result = await db.query(sql, values)
          if (sql.startsWith("SELECT"))
            await db.query("UPDATE products SET data=$2::jsonb WHERE id=$1", [
              old.id,
              JSON.stringify(raced),
            ])
          return result
        },
      }
      await repairSeedCatalogue(proxy)
      assert.deepEqual(
        (await db.query("SELECT data FROM products WHERE id=$1", [old.id]))
          .rows[0].data,
        raced,
        "A concurrently changed record wins over the seed repair",
      )
    } finally {
      await db.close()
    }
  },
)
