import { after, before, test } from "node:test"
import assert from "node:assert/strict"
import { createServer } from "node:http"
import { readFileSync } from "node:fs"
import { pathToRegexp } from "path-to-regexp"
import {
  apiRequestUrl,
  createApiRouter,
  default as router,
} from "../api/router.js"

// Exercise the deployment's public fallback without touching a developer's
// local PostgreSQL/PGlite database or requiring account/payment credentials.
process.env.NODE_ENV = "production"
delete process.env.DATABASE_URL
delete process.env.POSTGRES_URL

let server, origin

test("the deployed rewrite matches canonical trailing-slash API paths with Vercel's strict parser", () => {
  const config = JSON.parse(
    readFileSync(new URL("../vercel.json", import.meta.url), "utf8"),
  )
  const rewrite = config.rewrites.find((route) =>
    route.destination.startsWith("/api/router?"),
  )
  const keys = []
  // Vercel routing-utils uses path-to-regexp with strict matching enabled.
  const matcher = pathToRegexp(rewrite.source, keys, {
    strict: true,
    sensitive: true,
    delimiter: "/",
  })
  for (const path of [
    "/api/config",
    "/api/config/",
    "/api/catalog/",
    "/api/auth/me/",
    "/api/products/iphone-13-pro-max/reviews/",
    "/api/orders/order-123/pay/",
  ]) {
    const match = matcher.exec(path)
    assert.ok(match, `The production rewrite must match ${path}`)
    let destination = rewrite.destination
    keys.forEach((key, index) => {
      destination = destination.replace(
        `:${key.name}`,
        encodeURIComponent(match[index + 1] || ""),
      )
    })
    assert.equal(
      apiRequestUrl({ url: destination + "&sort=newest" }),
      path.replace(/\/$/, "") + "?sort=newest",
    )
  }
  for (const path of [
    "/collections/shop/",
    "/assets/product.jpg",
    "/products/phone/",
  ])
    assert.equal(matcher.exec(path), null)
})
before(async () => {
  server = createServer(router)
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  origin = `http://127.0.0.1:${server.address().port}`
})
after(async () => {
  await new Promise((resolve) => server.close(resolve))
})

test("Vercel wildcard query rebuilds nested API paths with either forwarded request shape", () => {
  assert.equal(
    apiRequestUrl({ url: "/api/router?__lt_route=auth%2Flogin%2F" }),
    "/api/auth/login",
  )
  assert.equal(
    apiRequestUrl({ url: "/api/auth/me/", query: { __lt_route: "auth/me/" } }),
    "/api/auth/me",
  )
  assert.equal(
    apiRequestUrl({
      url: "/api/router?__lt_route=admin%2Fproducts%2Fiphone-13-pro-max",
    }),
    "/api/admin/products/iphone-13-pro-max",
  )
  assert.equal(
    apiRequestUrl({
      url: "/api/router",
      query: { __lt_route: "products/phone-a/reviews" },
    }),
    "/api/products/phone-a/reviews",
  )
})

test("business query values survive while the reserved route key is excluded", () => {
  const result = apiRequestUrl({
    url: "/api/router?__lt_route=orders&status=paid&tag=one&tag=two&empty=",
    query: {
      __lt_route: "orders",
      status: "paid",
      q: "phone + case",
      label: ["red", "blue"],
    },
  })
  const url = new URL(result, origin)
  assert.equal(url.pathname, "/api/orders")
  assert.equal(url.searchParams.has("__lt_route"), false)
  assert.equal(url.searchParams.get("status"), "paid")
  assert.deepEqual(url.searchParams.getAll("tag"), ["one", "two"])
  assert.deepEqual(url.searchParams.getAll("label"), ["red", "blue"])
  assert.equal(url.searchParams.get("q"), "phone + case")
  assert.equal(url.searchParams.get("empty"), "")
})

test("routing preserves method, body object, cookies and headers for the existing handler", async () => {
  const body = {
    email: "fixture@example.test",
    password: "synthetic-test-value",
  }
  const headers = {
    cookie: "lt_session=synthetic",
    origin: "https://shop.example.test",
    "content-type": "application/json",
  }
  const req = {
    method: "POST",
    url: "/api/router?__lt_route=auth/login&next=%2Faccount%2F",
    query: { __lt_route: "auth/login", next: "/account/" },
    body,
    headers,
  }
  const res = {}
  let forwarded
  const adapter = createApiRouter(async (incoming, response) => {
    forwarded = incoming
    assert.equal(response, res)
    return "handled"
  })
  assert.equal(await adapter(req, res), "handled")
  assert.equal(forwarded, req)
  assert.equal(forwarded.method, "POST")
  assert.equal(forwarded.body, body)
  assert.equal(forwarded.headers, headers)
  assert.equal(forwarded.url, "/api/auth/login?next=%2Faccount%2F")
  assert.equal(forwarded.query.__lt_route, undefined)
  assert.equal(forwarded.query.next, "/account/")
})

test("ambiguous or malformed route captures cannot leak into path or query handling", () => {
  for (const req of [
    { url: "/api/router?__lt_route=auth/login&__lt_route=admin/orders" },
    {
      url: "/api/router?__lt_route=auth/login",
      query: { __lt_route: "admin/orders" },
    },
    { url: "/api/router", query: { __lt_route: ["auth", "login"] } },
    { url: "/api/router?__lt_route=..%2Fconfig" },
    { url: "/api/router?__lt_route=auth%3Fadmin=true" },
    { url: "/api/router?__lt_route=auth%23login" },
    { url: "/api/router?__lt_route=auth%5Clogin" },
  ])
    assert.throws(
      () => apiRequestUrl(req),
      (error) => error.statusCode === 400,
    )
  assert.throws(
    () => apiRequestUrl({ url: "/api/router" }),
    (error) => error.statusCode === 404,
  )
})

test("real adapter serves config and catalogue JSON without a catch-all filename", async () => {
  for (const route of ["config", "catalog"]) {
    const response = await fetch(`${origin}/api/router?__lt_route=${route}`)
    assert.equal(response.status, 200)
    assert.match(response.headers.get("content-type"), /application\/json/)
    const data = await response.json()
    if (route === "config") {
      assert.equal(data.currency, "UGX")
      assert.equal(data.accounts, false)
    } else {
      assert.ok(Array.isArray(data.products))
      assert.ok(data.products.length > 0)
    }
  }
})

test("cross-origin POST protection remains enforced on rewritten nested auth routes", async () => {
  const response = await fetch(
    `${origin}/api/router?__lt_route=auth%2Fregister`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://untrusted.example.test",
      },
      body: JSON.stringify({ email: "fixture@example.test" }),
    },
  )
  assert.equal(response.status, 403)
  assert.match(response.headers.get("content-type"), /application\/json/)
})

test("missing route captures produce a JSON error without invoking commerce or leaking HTML", async () => {
  const response = await fetch(`${origin}/api/router`)
  assert.equal(response.status, 404)
  assert.match(response.headers.get("content-type"), /application\/json/)
  assert.equal(response.headers.get("cache-control"), "no-store")
  assert.deepEqual(await response.json(), { error: "API route not found." })
})
