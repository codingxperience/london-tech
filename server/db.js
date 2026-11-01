import { randomUUID, scryptSync, randomBytes } from "node:crypto"

import { mkdir } from "node:fs/promises"

import path from "node:path"

import { products, storeDefaults } from "../src/data/catalog.js"
import { repairSeedCatalogue } from "./catalogue-migration.js"
import { adoptLaunchOffers } from "./launch-offers-migration.js"

let connection

let localQueue = Promise.resolve()

export function databaseConfigured() {
  return (
    !!(process.env.DATABASE_URL || process.env.POSTGRES_URL) ||
    process.env.NODE_ENV !== "production"
  )
}

export function getDatabase() {
  if (!connection)
    connection = initialize().catch((error) => {
      connection = undefined
      throw error
    })

  return connection
}

async function initialize() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL

  let db

  if (url) {
    const { Pool } = await import("pg")

    const pool = new Pool({
      connectionString: url,
      max: 3,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 20000,
    })

    db = {
      close: () => pool.end(),

      query: (text, params) => pool.query(text, params),

      transaction: async (fn) => {
        const client = await pool.connect()

        try {
          await client.query("BEGIN")
          const value = await fn(client)
          await client.query("COMMIT")
          return value
        } catch (error) {
          await client.query("ROLLBACK")
          throw error
        } finally {
          client.release()
        }
      },
    }
  } else {
    if (process.env.NODE_ENV === "production")
      throw Object.assign(
        new Error(
          "Account and order services are being connected. Please try again later.",
        ),
        { status: 503 },
      )

    const { PGlite } = await import("@electric-sql/pglite")

    const localPath = process.env.LOCAL_DATABASE_PATH || ".data/postgres"

    if (!localPath.startsWith("memory:"))
      await mkdir(path.dirname(path.resolve(localPath)), { recursive: true })

    const local = new PGlite(localPath)

    await local.waitReady

    db = {
      close: () => local.close(),

      query: async (text, params) => {
        await localQueue
        return local.query(text, params)
      },

      transaction: (fn) => {
        const run = localQueue.then(() => local.transaction((tx) => fn(tx)))

        localQueue = run.catch(() => {})

        return run
      },
    }
  }

  const statements = [
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')), phone TEXT NOT NULL DEFAULT '', addresses JSONB NOT NULL DEFAULT '[]', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,

    `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL)`,

    `CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS catalogue_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,

    `CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, data JSONB NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS vendors (id TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS vendor_id TEXT REFERENCES vendors(id) ON DELETE RESTRICT`,
    `CREATE TABLE IF NOT EXISTS content_pages (id TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
    `CREATE UNIQUE INDEX IF NOT EXISTS content_pages_slug_idx ON content_pages((data->>'slug'))`,
    `CREATE TABLE IF NOT EXISTS message_threads (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, subject TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')), messages JSONB NOT NULL DEFAULT '[]', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
    `CREATE INDEX IF NOT EXISTS message_threads_user_idx ON message_threads(user_id,updated_at DESC)`,

    `CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), idempotency_key TEXT NOT NULL, status TEXT NOT NULL, payment_status TEXT NOT NULL DEFAULT 'unpaid', amount BIGINT, currency TEXT NOT NULL DEFAULT 'UGX', details JSONB NOT NULL, transaction_id TEXT UNIQUE, expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(user_id,idempotency_key))`,

    `CREATE TABLE IF NOT EXISTS stock_reservations (order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE, product_id TEXT NOT NULL REFERENCES products(id), quantity INTEGER NOT NULL CHECK(quantity>0), expires_at TIMESTAMPTZ NOT NULL, PRIMARY KEY(order_id,product_id))`,

    `CREATE TABLE IF NOT EXISTS wishlists (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, product_ids JSONB NOT NULL DEFAULT '[]')`,

    `CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), product_id TEXT NOT NULL REFERENCES products(id), rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), title TEXT NOT NULL, body TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(user_id,product_id))`,

    `CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, hits INTEGER NOT NULL DEFAULT 1, expires_at TIMESTAMPTZ NOT NULL)`,

    `CREATE TABLE IF NOT EXISTS reset_tokens (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL)`,

    `CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY, actor_id TEXT REFERENCES users(id), action TEXT NOT NULL, details JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,

    `CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS reviews_product_idx ON reviews(product_id)`,

    `CREATE INDEX IF NOT EXISTS reservations_expiry_idx ON stock_reservations(expires_at)`,
  ]

  for (const text of statements) await db.query(text)

  await db.query(
    `INSERT INTO products(id,data) SELECT value->>'id',value FROM jsonb_array_elements($1::jsonb) ON CONFLICT(id) DO NOTHING`,
    [JSON.stringify(products)],
  )

  await repairSeedCatalogue(db)
  await adoptLaunchOffers(db)

  await db.query(
    `INSERT INTO settings(id,data) VALUES('store',$1::jsonb) ON CONFLICT(id) DO NOTHING`,
    [JSON.stringify(storeDefaults)],
  )

  if (
    process.env.ADMIN_EMAIL &&
    process.env.ADMIN_PASSWORD &&
    process.env.ADMIN_PASSWORD.length >= 12
  ) {
    const salt = randomBytes(16).toString("hex")

    const password =
      salt +
      ":" +
      scryptSync(process.env.ADMIN_PASSWORD, salt, 64).toString("hex")

    await db.query(
      `INSERT INTO users(id,name,email,password_hash,role) VALUES($1,'Store administrator',$2,$3,'admin') ON CONFLICT(email) DO NOTHING`,
      [randomUUID(), process.env.ADMIN_EMAIL.toLowerCase().trim(), password],
    )
  }

  return db
}
