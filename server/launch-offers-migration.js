import launchOffers from "../src/data/launch-offers.json" with { type: "json" }
import { legacyProducts } from "../src/data/catalog.js"

const version = "2026-11-01-approved-launch-offers"
const before = new Map(legacyProducts.map((p) => [p.id, p]))

/** Adopt the owner's approved opening figures once; admin edits and sales win. */
export async function adoptLaunchOffers(db) {
  return db.transaction(async (tx) => {
    const marker = await tx.query(
      `INSERT INTO catalogue_migrations(version) VALUES($1)
       ON CONFLICT(version) DO NOTHING RETURNING version`,
      [version],
    )
    if (!marker.rows.length) return 0
    // Serialize against stock reservations, payments and administrative saves.
    const rows = await tx.query(
      "SELECT id,data FROM products WHERE id=ANY($1::text[]) FOR UPDATE",
      [Object.keys(launchOffers)],
    )
    let updated = 0
    for (const { id, data } of rows.rows) {
      const old = before.get(id),
        offer = launchOffers[id]
      const next = { ...data }
      if (
        data.price === old.price &&
        data.priceConfirmed === false &&
        data.comparePrice == null
      ) {
        next.price = offer.price
        next.comparePrice = offer.comparePrice
        next.priceConfirmed = offer.priceConfirmed
      }
      if (data.stock == null) next.stock = offer.stock
      if (JSON.stringify(next) === JSON.stringify(data)) continue
      await tx.query(
        "UPDATE products SET data=$2::jsonb,updated_at=NOW() WHERE id=$1",
        [id, JSON.stringify(next)],
      )
      updated++
    }
    return updated
  })
}
