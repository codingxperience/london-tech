import { test, afterEach } from "node:test"
import assert from "node:assert/strict"
import {
  recordStoreVisit,
  visitorStorageKey,
} from "../src/lib/visit-tracking.js"

const originalFetch = globalThis.fetch,
  originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage")
const values = new Map()
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
  },
})
afterEach(() => {
  values.clear()
  globalThis.fetch = originalFetch
})
import { after } from "node:test"
after(() => {
  if (originalStorage)
    Object.defineProperty(globalThis, "localStorage", originalStorage)
  else delete globalThis.localStorage
})

test("visitor collection deduplicates route changes and rotates identifiers at the Kampala day boundary", async () => {
  const requests = []
  globalThis.fetch = async (url, opts) => {
    requests.push({ url, body: JSON.parse(opts.body) })
    return { ok: true, json: async () => ({ available: true, recorded: true }) }
  }
  const first = {
    path: "/",
    enabled: true,
    privacy: {},
    now: new Date("2026-11-01T20:59:00Z"),
  }
  assert.equal(await recordStoreVisit(first), true)
  assert.equal(
    await recordStoreVisit({ ...first, path: "/products/phone/" }),
    false,
  )
  assert.equal(requests.length, 1)
  const stored = JSON.parse(values.get(visitorStorageKey))
  assert.equal(stored.recorded, true)
  assert.equal(
    await recordStoreVisit({ ...first, now: new Date("2026-11-01T21:01:00Z") }),
    true,
  )
  assert.notEqual(requests[0].body.visitorId, requests[1].body.visitorId)
  assert.deepEqual(Object.keys(requests[0].body), ["visitorId"])
  assert.equal(requests[0].url, "/api/analytics/visit")
})

test("visitor collection respects privacy preferences and retries failed storage requests without blocking the storefront", async () => {
  let requests = 0
  globalThis.fetch = async () => {
    requests++
    throw new Error("offline")
  }
  const input = {
    path: "/",
    enabled: true,
    privacy: {},
    now: new Date("2026-11-01T10:00:00Z"),
  }
  for (const extra of [
    { enabled: false },
    { path: "/admin/preview/" },
    { path: "/admin" },
    { privacy: { doNotTrack: "1" } },
    { privacy: { globalPrivacyControl: true } },
  ])
    assert.equal(await recordStoreVisit({ ...input, ...extra }), false)
  assert.equal(requests, 0)
  assert.equal(await recordStoreVisit(input), false)
  assert.equal(requests, 1)
  const id = JSON.parse(values.get(visitorStorageKey)).id
  globalThis.fetch = async (_url, opts) => {
    requests++
    assert.equal(JSON.parse(opts.body).visitorId, id)
    return { ok: true, json: async () => ({ available: true, recorded: true }) }
  }
  assert.equal(await recordStoreVisit(input), true)
  assert.equal(requests, 2)
})
