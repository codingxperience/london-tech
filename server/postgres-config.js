import { readFileSync } from "node:fs"

export function postgresConfig(connectionString) {
  const url = new URL(connectionString)
  const supabase =
    url.hostname.endsWith(".supabase.com") ||
    url.hostname.endsWith(".supabase.co")
  // Configure TLS explicitly: pg connection-string SSL parameters otherwise
  // replace the supplied CA options. Never downgrade verification for Supabase.
  if (supabase)
    for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey"])
      url.searchParams.delete(key)
  return {
    connectionString: supabase ? url.href : connectionString,
    ...(supabase
      ? {
          ssl: {
            ca: readFileSync(
              new URL("./certs/supabase-ca.crt", import.meta.url),
              "utf8",
            ),
            rejectUnauthorized: true,
          },
        }
      : {}),
    max: 3,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 20000,
  }
}
