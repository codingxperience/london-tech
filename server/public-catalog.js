import { products, storeDefaults } from "../src/data/catalog.js"
import { databaseConfigured, getDatabase } from "./db.js"

/** Public records only. Never serialize users, sessions, messages or keys. */
export async function publicCatalog() {
  if (!databaseConfigured())
    return {
      products: products.filter((p) => p.active),
      settings: storeDefaults,
      pages: [],
      reviews: {},
    }
  const db = await getDatabase()
  const [catalog, settings, pages, reviews] = await Promise.all([
    db.query(
      "SELECT data FROM products WHERE data->>'active'='true' ORDER BY data->>'name'",
    ),
    db.query("SELECT data FROM settings WHERE id='store'"),
    db.query(
      "SELECT data FROM content_pages WHERE data->>'status'='published'",
    ),
    db.query(
      "SELECT r.product_id,r.id,r.rating,r.title,r.body,r.created_at,u.name FROM reviews r JOIN users u ON u.id=r.user_id ORDER BY r.created_at DESC",
    ),
  ])
  const grouped = {}
  for (const r of reviews.rows)
    (grouped[r.product_id] ??= []).push({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      createdAt: r.created_at,
      name: r.name,
      verified: true,
    })
  const stored = settings.rows[0]?.data || {}
  return {
    products: catalog.rows.map((r) => r.data),
    settings: {
      ...storeDefaults,
      ...stored,
      socials: { ...storeDefaults.socials, ...stored.socials },
    },
    pages: pages.rows.map((r) => r.data),
    reviews: grouped,
  }
}
