import { repairCatalogueMedia } from "../src/lib/catalogue-media.js"
import { legacyProducts } from "../src/data/catalog.js"
import {
  referenceProducts,
  retiredReferenceSkus,
} from "../src/data/reference-catalogue.js"

const referencePriceVersion = "2026-11-10-reference-listing-prices"
const referencePrices = referenceProducts
  .filter(({ priceConfirmed }) => priceConfirmed)
  .map(({ id, sku, price }) => ({ id, sku, price }))

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
  return db.transaction(async (tx) => {
    const marker = await tx.query(
      `INSERT INTO catalogue_migrations(version) VALUES($1)
       ON CONFLICT(version) DO NOTHING RETURNING version`,
      [referencePriceVersion],
    )
    if (!marker.rows.length) return 0

    const result = await tx.query(
      `UPDATE products AS p
       SET data=p.data || jsonb_build_object('price', listing.price, 'priceConfirmed', true),
           updated_at=NOW()
       FROM jsonb_to_recordset($1::jsonb) AS listing(id text, sku text, price integer)
       WHERE p.id=listing.id AND p.data->>'sku'=listing.sku
         AND p.data->>'active'='true' AND p.data->>'priceConfirmed'='false'
         AND p.data->>'price' IS NULL AND p.data->>'comparePrice' IS NULL`,
      [JSON.stringify(referencePrices)],
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
