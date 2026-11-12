import { repairCatalogueMedia } from "../src/lib/catalogue-media.js"
import {
  approvedProducts,
  legacyProducts,
  phoneProducts,
  products,
  retiredPhoneSkus,
} from "../src/data/catalog.js"
import { cataloguePriceDefaults } from "../src/data/prices.js"
import { stockroomProducts, verifiedInventory } from "../src/data/verified-inventory.js"
import {
  referenceProducts,
  retiredReferenceSkus,
} from "../src/data/reference-catalogue.js"

const referencePriceVersion = "2026-11-10-reference-listing-prices"
const phoneVersion = "2026-11-11-stocked-phone-catalogue"
const referencePrices = referenceProducts
  .filter(({ priceConfirmed }) => priceConfirmed)
  .map(({ id, sku, price }) => ({ id, sku, price }))
const missingPrices = products
  .filter(({ id, active }) => active && Object.hasOwn(cataloguePriceDefaults, id))
  .map(({ id, sku }) => ({ id, sku, price: cataloguePriceDefaults[id] }))

const singleSpecAccessories = new Set([
  "itel-bl-5c-battery",
  "tecno-bl-5c-battery",
  "excellent-flash-power-bank-30000",
  "oraimo-microusb-charger-kit",
])
const expandedSpecs = referenceProducts.filter((p) =>
  p.sku.startsWith("LT-MODEL-") && p.specifications.length === 2 &&
  (p.specifications[0][0] === "Model" || singleSpecAccessories.has(p.id)),
).map(({ id, sku, specifications }) => ({
  id,
  sku,
  previous: specifications.slice(0, 1),
  next: specifications,
}))

/** Apply researched specifications only to unchanged seed fields. */
export async function adoptReferenceDetails(db) {
  await db.transaction(async (tx) => {
    const marker = await tx.query(
      "INSERT INTO catalogue_migrations(version) VALUES($1) ON CONFLICT DO NOTHING RETURNING version",
      ["2026-11-10-reference-listing-details"],
    )
    if (!marker.rows.length) return
    await tx.query(
      `UPDATE products AS p
       SET data=jsonb_set(p.data, '{specifications}', listing.next), updated_at=NOW()
       FROM jsonb_to_recordset($1::jsonb) AS listing(id text, sku text, previous jsonb, next jsonb)
       WHERE p.id=listing.id AND p.data->>'sku'=listing.sku AND p.data->'specifications'=listing.previous`,
      [JSON.stringify(expandedSpecs)],
    )
    const camon = referenceProducts.find(({ id }) => id === "tecno-camon-30-case")
    await tx.query(
      `UPDATE products SET data=jsonb_set(data, '{options}', $3::jsonb), updated_at=NOW()
       WHERE id=$1 AND data->>'sku'=$2 AND data->'options'='[]'::jsonb`,
      [camon.id, camon.sku, JSON.stringify(camon.options)],
    )
  })
}

/** Fill in prices once on the original quote-only listings. Keep merchant prices and stock. */
export async function adoptReferencePrices(db) {
  return fillSeedPrices(db, referencePriceVersion, referencePrices)
}

export async function adoptCataloguePrices(db) {
  return fillSeedPrices(db, "2026-11-12-catalogue-prices", missingPrices)
}

/** Refresh matching seed listings and keep merchant edits to price, stock and photos. */
export async function adoptStockroomDetails(db) {
  const reference = new Map(referenceProducts.map((product) => [product.id, product]))
  const replacements = stockroomProducts.flatMap((product) => {
    const previous = reference.get(product.id)
    return previous?.sku === product.sku ? [{ previous, product }] : []
  })
  return db.transaction(async (tx) => {
    const marker = await tx.query(
      "INSERT INTO catalogue_migrations(version) VALUES($1) ON CONFLICT DO NOTHING RETURNING version",
      ["2026-11-12-stockroom-accessories"],
    )
    if (!marker.rows.length) return

    const { rows } = await tx.query(
      "SELECT id, data FROM products WHERE id=ANY($1::text[]) FOR UPDATE",
      [replacements.map(({ product }) => product.id)],
    )
    const current = new Map(rows.map(({ id, data }) => [id, data]))
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
    for (const { previous, product } of replacements) {
      const data = current.get(product.id)
      if (!data || data.sku !== previous.sku || data.name !== previous.name) continue
      const updates = {}
      for (const field of ["brand", "description", "mediaNote"]) {
        if (same(data[field], previous[field])) updates[field] = product[field] ?? ""
      }
      if (
        same(data.specifications, previous.specifications) ||
        same(data.specifications, previous.specifications.slice(0, 1))
      ) {
        updates.specifications = product.specifications
      }
      if (data.image === previous.image && same(data.gallery, previous.gallery)) {
        updates.image = product.image
        updates.gallery = product.gallery
      }
      if (data.price == null && !data.priceConfirmed) {
        updates.price = product.price
        updates.priceConfirmed = product.priceConfirmed
      }
      if (Object.keys(updates).some((field) => !same(updates[field], data[field]))) {
        await tx.query(
          "UPDATE products SET data=data || $2::jsonb, updated_at=NOW() WHERE id=$1",
          [product.id, JSON.stringify(updates)],
        )
      }
    }
  })
}

/** Retire only listings from the old built-in seed catalogue that are not in
 * the owner-supplied inventory. Preserve order history and merchant records. */
export async function retireUnlistedSeedProducts(db) {
  const activeInventory = new Set(
    products.filter((product) => product.active !== false).map(({ id }) => id),
  )
  const seedRows = [...legacyProducts, ...referenceProducts, ...verifiedInventory]
  const retired = [...new Map(seedRows.map(({ id, sku }) => [`${id}:${sku}`, { id, sku }])).values()]
    .filter(({ id }) => !activeInventory.has(id))

  return db.transaction(async (tx) => {
    const marker = await tx.query(
      `INSERT INTO catalogue_migrations(version) VALUES($1)
       ON CONFLICT(version) DO NOTHING RETURNING version`,
      ["2026-11-12-owner-inventory-only"],
    )
    if (!marker.rows.length) return 0

    const result = await tx.query(
      `UPDATE products AS p
       SET data=jsonb_set(p.data, '{active}', 'false'::jsonb), updated_at=NOW()
       FROM jsonb_to_recordset($1::jsonb) AS item(id text, sku text)
       WHERE p.id=item.id AND p.data->>'sku'=item.sku
         AND p.data->>'active' IS DISTINCT FROM 'false'`,
      [JSON.stringify(retired)],
    )
    return result.affectedRows ?? result.rowCount
  })
}

/** Move supplied stockroom items to their current owner-defined categories. */
export async function adoptStockroomCategories(db) {
  const rows = stockroomProducts
    .filter(({ category }) => category === "accessories" || category === "perfumes")
    .map(({ id, sku, category }) => ({ id, sku, previous: "lifestyle", category }))
  return db.transaction(async (tx) => {
    const marker = await tx.query(
      `INSERT INTO catalogue_migrations(version) VALUES($1)
       ON CONFLICT(version) DO NOTHING RETURNING version`,
      ["2026-11-12-owner-stockroom-categories"],
    )
    if (!marker.rows.length) return 0
    const result = await tx.query(
      `UPDATE products AS p
       SET data=jsonb_set(p.data, '{category}', to_jsonb(item.category), true), updated_at=NOW()
       FROM jsonb_to_recordset($1::jsonb) AS item(id text, sku text, previous text, category text)
       WHERE p.id=item.id AND p.data->>'sku'=item.sku
         AND p.data->>'category'=item.previous`,
      [JSON.stringify(rows)],
    )
    return result.affectedRows ?? result.rowCount
  })
}

function fillSeedPrices(db, version, listings) {
  return db.transaction(async (tx) => {
    const marker = await tx.query(
      `INSERT INTO catalogue_migrations(version) VALUES($1)
       ON CONFLICT(version) DO NOTHING RETURNING version`,
      [version],
    )
    if (!marker.rows.length) return 0

    const result = await tx.query(
      `UPDATE products AS p
       SET data=p.data || jsonb_build_object('price', listing.price, 'priceConfirmed', true),
           updated_at=NOW()
       FROM jsonb_to_recordset($1::jsonb) AS listing(id text, sku text, price integer)
       WHERE p.id=listing.id AND p.data->>'sku'=listing.sku
         AND p.data->>'active'='true' AND p.data->>'priceConfirmed'='false'
         AND (p.data->>'price' IS NULL OR p.data->>'price'=listing.price::text)
         AND p.data->>'comparePrice' IS NULL`,
      [JSON.stringify(listings)],
    )
    return result.affectedRows ?? result.rowCount
  })
}

/** Hide retired seed listings while preserving records referenced by older orders. */
export async function retireReferenceListings(db) {
  const result = await db.query(
    `UPDATE products AS p SET data=jsonb_set(p.data, '{active}', 'false'::jsonb), updated_at=NOW()
     FROM jsonb_each_text($1::jsonb) AS retired(id, sku)
     WHERE p.id=retired.id AND p.data->>'sku'=retired.sku
       AND p.data->>'active' IS DISTINCT FROM 'false'`,
    [JSON.stringify(retiredReferenceSkus)],
  )
  return result.affectedRows ?? result.rowCount
}

export async function adoptStockedPhones(db) {
  const previous = new Map(approvedProducts.map((product) => [product.id, product]))
  const nextPhones = new Map(phoneProducts.map((product) => [product.id, product]))
  const ids = [
    ...Object.keys(retiredPhoneSkus),
    ...phoneProducts.filter(({ id }) => previous.has(id)).map(({ id }) => id),
  ]
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

  return db.transaction(async (tx) => {
    const marker = await tx.query(
      "INSERT INTO catalogue_migrations(version) VALUES($1) ON CONFLICT DO NOTHING RETURNING version",
      [phoneVersion],
    )
    if (!marker.rows.length) return

    const { rows } = await tx.query(
      "SELECT id,data FROM products WHERE id=ANY($1::text[]) FOR UPDATE",
      [ids],
    )
    for (const { id, data } of rows) {
      const before = previous.get(id)
      if (data.sku !== before.sku || data.category !== "mobiles") continue
      const phone = nextPhones.get(id)
      const updates = {}
      if (!phone) {
        updates.active = false
      } else if (data.name === before.name || data.name === phone.name) {
        for (const field of ["name", "brand", "description", "specifications", "inTheBox", "mediaNote"]) {
          if (same(data[field] ?? "", before[field] ?? "")) updates[field] = phone[field]
        }
        if (data.image === before.image && same(data.gallery, before.gallery)) {
          updates.image = phone.image
          updates.gallery = phone.gallery
        }
      }
      if (Object.keys(updates).some((field) => !same(updates[field], data[field])))
        await tx.query(
          "UPDATE products SET data=data || $2::jsonb,updated_at=NOW() WHERE id=$1",
          [id, JSON.stringify(updates)],
        )
    }
  })
}

/** Repair known old seed photos without overwriting concurrent merchant changes. */
export async function repairSeedCatalogue(db) {
  const rows = await db.query(
    "SELECT id,data FROM products WHERE id = ANY($1::text[])",
    [legacyProducts.map((product) => product.id)],
  )
  const updates = rows.rows.flatMap(({ id, data }) => {
    const next = repairCatalogueMedia(data)
    return next === data ? [] : [{ id, previous: data, next }]
  })
  if (updates.length)
    await db.query(
      `UPDATE products AS p SET data=repair.next, updated_at=NOW()
     FROM jsonb_to_recordset($1::jsonb) AS repair(id text, previous jsonb, next jsonb)
     WHERE p.id=repair.id AND p.data=repair.previous`,
      [JSON.stringify(updates)],
    )
  return updates.length
}
