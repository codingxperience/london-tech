import { test } from "node:test"
import assert from "node:assert/strict"
import { PGlite } from "@electric-sql/pglite"
import { products, legacyProducts } from "../src/data/catalog.js"
import offers from "../src/data/launch-offers.json" with { type: "json" }
import { adoptLaunchOffers } from "../server/launch-offers-migration.js"

test("all approved launch offers are real catalogue prices and opening inventory", () => {
  assert.equal(Object.keys(offers).length, products.length)
  for (const p of products) {
    assert.equal(p.priceConfirmed, true, p.id)
    assert.ok(Number.isSafeInteger(p.price) && p.price > 0, p.id)
    assert.ok(p.comparePrice > p.price, p.id)
    assert.ok(Number.isSafeInteger(p.stock) && p.stock > 0, p.id)
    for (const key of ["price", "comparePrice", "stock", "priceConfirmed"])
      assert.equal(p[key], offers[p.id][key], p.id + " " + key)
  }
})

test(
  "offer adoption updates old seed records once, preserves merchant figures and never replenishes inventory",
  { timeout: 120000 },
  async () => {
    const db = new PGlite()
    await db.exec(`CREATE TABLE products(id TEXT PRIMARY KEY,data JSONB NOT NULL,updated_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE catalogue_migrations(version TEXT PRIMARY KEY,applied_at TIMESTAMPTZ DEFAULT NOW());`)
    const [old, edited, sold] = legacyProducts.slice(0, 3)
    const custom = {
      ...edited,
      price: 123456,
      comparePrice: 200000,
      priceConfirmed: true,
      stock: 7,
    }
    const depleted = { ...sold, stock: 0 }
    const read = async (id) =>
      (await db.query("SELECT data FROM products WHERE id=$1", [id])).rows[0]
        .data
    try {
      for (const p of [old, custom, depleted])
        await db.query("INSERT INTO products VALUES($1,$2::jsonb)", [
          p.id,
          JSON.stringify(p),
        ])
      assert.equal(await adoptLaunchOffers(db), 2)
      const first = await read(old.id)
      for (const key of ["price", "comparePrice", "stock", "priceConfirmed"])
        assert.equal(first[key], offers[old.id][key])
      assert.equal(first.name, old.name)
      assert.equal(first.image, old.image)
      assert.deepEqual(await read(custom.id), custom)
      assert.equal((await read(sold.id)).stock, 0)
      // An admin clears inventory after launch. Cold starts must not refill it.
      await db.query(
        "UPDATE products SET data=jsonb_set(data,'{stock}','null'::jsonb) WHERE id=$1",
        [old.id],
      )
      assert.equal(await adoptLaunchOffers(db), 0)
      assert.equal((await read(old.id)).stock, null)
      assert.equal((await read(sold.id)).stock, 0)
      assert.equal(
        (
          await db.query(
            "SELECT count(*)::int AS count FROM catalogue_migrations",
          )
        ).rows[0].count,
        1,
      )
    } finally {
      await db.close()
    }
  },
)

test(
  "failed offer adoption rolls back its marker and can be retried",
  { timeout: 120000 },
  async () => {
    const db = new PGlite()
    await db.exec(`CREATE TABLE products(id TEXT PRIMARY KEY,data JSONB NOT NULL,updated_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE catalogue_migrations(version TEXT PRIMARY KEY,applied_at TIMESTAMPTZ DEFAULT NOW());`)
    const p = legacyProducts[0]
    await db.query("INSERT INTO products VALUES($1,$2::jsonb)", [
      p.id,
      JSON.stringify(p),
    ])
    const failing = {
      transaction: (fn) =>
        db.transaction((tx) =>
          fn({
            query: (sql, values) => {
              if (sql.startsWith("UPDATE"))
                throw new Error("Simulated write failure")
              return tx.query(sql, values)
            },
          }),
        ),
    }
    try {
      await assert.rejects(
        adoptLaunchOffers(failing),
        /Simulated write failure/,
      )
      assert.equal(
        (
          await db.query(
            "SELECT count(*)::int AS count FROM catalogue_migrations",
          )
        ).rows[0].count,
        0,
      )
      assert.equal(await adoptLaunchOffers(db), 1)
    } finally {
      await db.close()
    }
  },
)
