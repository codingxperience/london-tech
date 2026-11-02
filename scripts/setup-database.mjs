import { loadEnvFile } from "node:process"

try {
  loadEnvFile(".env")
} catch (error) {
  if (error.code !== "ENOENT") throw error
}

if (
  !process.env.ADMIN_EMAIL ||
  !process.env.ADMIN_PASSWORD ||
  process.env.ADMIN_PASSWORD.length < 12
) {
  throw new Error(
    "Set ADMIN_EMAIL and a password of at least 12 characters in .env or the server environment.",
  )
}

const { getDatabase } = await import("../server/db.js")

if (process.env.DIRECT_URL) process.env.DATABASE_URL = process.env.DIRECT_URL

await getDatabase()

console.log(
  "Database schema, catalogue and initial administrator are ready. No credentials are printed.",
)

process.exit(0)
