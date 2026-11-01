import { repairCatalogueMedia } from "../src/lib/catalogue-media.js"
import { legacyProducts } from "../src/data/catalog.js"

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
