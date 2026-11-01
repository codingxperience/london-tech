import { api, readStorage, writeStorage } from "./api.js"

export const visitorStorageKey = "lt.visit.daily.v1"
const inFlight = new Set()

/** Count a browser once per Uganda day; never store URLs, email or an IP. */
export async function recordStoreVisit({
  path,
  enabled,
  privacy = navigator,
  now = new Date(),
}) {
  if (
    !enabled ||
    /^\/admin(?:\/|$)/.test(path) ||
    privacy.doNotTrack === "1" ||
    privacy.globalPrivacyControl === true
  )
    return false
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Kampala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
  const previous = readStorage(visitorStorageKey, null)
  if (previous?.date === date && previous.recorded) return false
  const visitorId =
    previous?.date === date && typeof previous.id === "string"
      ? previous.id
      : crypto.randomUUID()
  const lock = date + ":" + visitorId
  if (inFlight.has(lock)) return false
  inFlight.add(lock)
  writeStorage(visitorStorageKey, { date, id: visitorId, recorded: false })
  try {
    const result = await api("analytics/visit", {
      method: "POST",
      body: { visitorId },
    })
    if (result.available)
      writeStorage(visitorStorageKey, { date, id: visitorId, recorded: true })
    return result.available === true
  } catch {
    return false
  } finally {
    inFlight.delete(lock)
  }
}
