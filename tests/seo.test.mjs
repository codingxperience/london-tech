import { test } from "node:test"
import assert from "node:assert/strict"
import { readFile, readdir } from "node:fs/promises"
import { products, storeDefaults } from "../src/data/catalog.js"
import {
  defaultOrigin,
  resolveSeo,
  documentHtml,
  sitemapXml,
} from "../src/lib/seo.js"
import { createPageHandler, requestPath } from "../api/pages.js"
import { pathToRegexp } from "path-to-regexp"
import { postgresConfig } from "../server/postgres-config.js"

const data = { products, settings: storeDefaults, pages: [], reviews: {} }
test("SEO metadata matches live catalogue truth, location and published review data without invented claims", () => {
  const changed = { ...products[0], price: 123456, stock: 0 }
  const seo = resolveSeo("/products/" + changed.id + "/", {
    ...data,
    products: [changed],
  })
  const p = seo.schemas.find((s) => s["@type"] === "Product")
  assert.equal(p.offers.price, 123456)
  assert.equal(p.offers.availability, "https://schema.org/OutOfStock")
  assert.equal(p.aggregateRating, undefined)
  assert.equal(p.gtin, undefined)
  assert.ok(seo.schemas.some((s) => s["@type"] === "BreadcrumbList"))
  const store = seo.schemas.find((s) => s["@type"] === "ElectronicsStore")
  assert.equal(store.address.addressLocality, "Kampala")
  assert.equal(store.telephone, "+256788341111")
  assert.equal(store.geo, undefined)
  assert.equal(store.openingHours, undefined)
  const contact = resolveSeo("/contact/", {
    ...data,
    settings: {
      ...storeDefaults,
      address: "Updated store address",
      phone: "0700000000",
      phoneAlt: "",
    },
  })
  assert.ok(contact.description.includes("Updated store address"))
  assert.ok(contact.description.includes("0700000000"))
  assert.ok(!contact.description.includes(storeDefaults.phone))
  assert.equal(
    resolveSeo("/products/" + changed.id + "/", {
      ...data,
      products: [{ ...changed, priceConfirmed: false }],
    }).schemas.find((s) => s["@type"] === "Product").offers,
    undefined,
  )
})
test("pagination self canonicalizes while filter variants and secure pages stay outside indexing", () => {
  const page = resolveSeo("/collections/shop/?page=2", data)
  assert.equal(page.noindex, false)
  assert.equal(page.canonical, defaultOrigin + "/collections/shop/?page=2")
  assert.ok(page.next.endsWith("?page=3"))
  assert.equal(page.previous, defaultOrigin + "/collections/shop/")
  assert.equal(
    resolveSeo("/collections/shop/?brand=Apple&page=2", data).noindex,
    true,
  )
  for (const p of [
    "/admin/preview/",
    "/account/orders/",
    "/unsubscribe/?token=secret",
  ])
    assert.equal(resolveSeo(p, data).noindex, true)
  for (const p of [
    "/not-a-page/",
    "/products/missing/",
    "/collections/missing/",
    "/collections/shop/?page=999",
    "/collections/shop/?page=-1",
  ])
    assert.equal(resolveSeo(p, data).status, 404, p)
  const xml = sitemapXml(data, defaultOrigin)
  assert.ok(xml.includes("?page=2"))
  assert.ok(!xml.includes("/admin/"))
  assert.ok(!xml.includes("brand="))
  const published = {
    ...data,
    pages: [
      {
        slug: "buying-guide",
        title: "Buying guide",
        body: "Useful product advice.",
      },
    ],
  }
  assert.equal(resolveSeo("/pages/buying-guide/", published).status, 200)
  assert.equal(resolveSeo("/buying-guide/", published).status, 404)
})
test("page HTML safely embeds public content and replaces every stale SEO tag", () => {
  const shell =
    '<html><head><title>Old</title><meta name="description" content="Old"><meta name="robots" content="index"><link rel="canonical" href="https://old.test/"></head><body><div id="root"></div></body></html>'
  const html = documentHtml(
    shell,
    resolveSeo("/about/", data),
    "<h1>Visible store story</h1>",
    {
      ...data,
      settings: {
        ...storeDefaults,
        about: "</script><script>alert(1)</script>",
      },
    },
  )
  assert.equal((html.match(/<title>/g) || []).length, 1)
  assert.ok(html.includes("<h1>Visible store story</h1>"))
  assert.ok(!html.includes("</script><script>alert"))
  assert.ok(html.includes("\\u003c/script>"))
})
test("public page adapter preserves pagination and returns real status codes with live records", async () => {
  const v = JSON.parse(await readFile("vercel.json", "utf8")),
    rule = v.rewrites.find((r) => r.destination.startsWith("/api/pages"))
  const compiled = pathToRegexp(rule.source, [], {
    strict: true,
    sensitive: true,
    delimiter: "/",
  })
  assert.ok(compiled.test("/products/phone/"))
  assert.ok(compiled.test("/"))
  assert.ok(!compiled.test("/assets/main.js"))
  assert.ok(compiled.test("/sitemap.xml"))
  assert.equal(
    requestPath({ url: "/api/pages?__lt_page=collections/shop/&page=2" }),
    "/collections/shop/?page=2",
  )
  const handler = createPageHandler({
    load: async () => data,
    render: (_data, path) => "<h1>" + path + "</h1>",
    template: '<html><head></head><body><div id="root"></div></body></html>',
  })
  async function get(path, method = "GET") {
    const headers = {}
    let body
    const res = {
      setHeader: (k, v) => (headers[k] = v),
      end: (v) => (body = v),
    }
    await handler({ url: path, method }, res)
    return { ...res, headers, body }
  }
  const result = await get("/products/" + products[0].id + "/")
  assert.equal(result.statusCode, 200)
  assert.ok(result.body.includes(products[0].name))
  const missing = await get("/products/not-found/")
  assert.equal(missing.statusCode, 404)
  assert.equal(missing.headers["X-Robots-Tag"], "noindex, follow")
  assert.equal((await get("/", "POST")).statusCode, 405)
  assert.equal((await get("/", "HEAD")).body, undefined)
})
test("Supabase pool configuration verifies the public CA and cannot be downgraded by URL SSL options", () => {
  const config = postgresConfig(
    "postgresql://test:example@aws-1-eu-west-3.pooler.supabase.com:6543/postgres?sslmode=no-verify&pgbouncer=true",
  )
  assert.equal(config.ssl.rejectUnauthorized, true)
  assert.ok(config.ssl.ca.includes("BEGIN CERTIFICATE"))
  assert.ok(!config.connectionString.includes("sslmode="))
  assert.ok(config.connectionString.includes("pgbouncer=true"))
})
test("production HTML contains crawlable product and category content before JavaScript executes", async () => {
  const publishedFiles = await readdir(".output/public", { recursive: true })
  assert.ok(
    !publishedFiles.some(
      (p) =>
        (p.endsWith(".html") && !/^google[a-f0-9]+\.html$/.test(p)) ||
        p === "sitemap.xml",
    ),
    "Static files must not bypass the live HTML and sitemap functions",
  )
  assert.ok(publishedFiles.some((p) => p.endsWith(".js")))
  const verification = "googlee264a0cdaaba06d8.html"
  assert.equal(
    await readFile(".output/public/" + verification, "utf8"),
    await readFile("public/" + verification, "utf8"),
  )
  const product = await readFile(
    "dist/products/" + products[0].id + "/index.html",
    "utf8",
  )
  assert.ok(product.includes("<h1>" + products[0].name + "</h1>"))
  assert.ok(product.includes('"@type":"Product"'))
  const category = await readFile("dist/collections/shop/index.html", "utf8")
  assert.ok(category.includes("/products/" + products[0].id + "/"))
  assert.ok(category.includes("?page=2"))
  const home = await readFile("dist/index.html", "utf8")
  assert.ok(home.includes('id="root"><'))
  assert.ok(!home.includes('id="root"></div>'))
  const icon = "/assets/london-tech-icon-192.png"
  const icons = [
    ...home.matchAll(/<link\b[^>]+rel="(?:icon|shortcut icon)"[^>]*>/g),
  ]
  assert.equal(icons.length, 1)
  assert.ok(icons[0][0].includes(`href="${icon}"`))
  const favicon = await readFile(".output/public" + icon)
  assert.equal(favicon.readUInt32BE(16), 192)
  assert.equal(favicon.readUInt32BE(20), 192)
  const website = resolveSeo("/", data).schemas.find(
    (node) => node["@type"] === "WebSite",
  )
  assert.equal(website.name, "London Tech Stores")
  assert.equal(website.url, defaultOrigin + "/")
  assert.ok(website.alternateName.includes("London Tech"))
  for (const [path, label] of [
    ["/collections/shop/", "Shop all electronics"],
    ["/about/", "About London Tech"],
    ["/contact/", "Visit our Kampala store"],
  ]) {
    assert.ok(home.includes(`href="${path}">${label}</a>`))
    assert.equal(resolveSeo(path, data).noindex, false)
  }
})
