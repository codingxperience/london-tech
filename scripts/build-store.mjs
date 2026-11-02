import { build } from "vite"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { products, categories, storeDefaults } from "../src/data/catalog.js"
import {
  resolveSeo,
  documentHtml,
  sitemapXml,
  sitemapPages,
} from "../src/lib/seo.js"
import { siteUrl } from "./site-config.mjs"

await build()
const directory = path.resolve("dist")
const shell = (
  await readFile(path.join(directory, "index.html"), "utf8")
).replaceAll("https://london-tech.vercel.app", siteUrl)
await build({
  build: {
    ssr: "src/entry-server.jsx",
    outDir: ".output/server",
    emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: "render.js" } },
  },
})
const { renderPage } = await import(
  pathToFileURL(path.resolve(".output/server/render.js")).href
)
await writeFile(".output/server/template.html", shell)
const data = {
  products: products.filter((p) => p.active),
  settings: storeDefaults,
  pages: [],
  reviews: {},
}
const privatePaths = [
  "cart",
  "checkout",
  "checkout/result",
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "unsubscribe",
  "account",
  "account/orders",
  "account/messages",
  "account/wishlist",
  "account/profile",
  "account/addresses",
  "account/security",
  "wishlist",
  "compare",
  "admin",
  "admin/preview",
  ...[
    "vendors",
    "customers",
    "products",
    "wishlist",
    "orders",
    "invoices",
    "history",
    "inventory",
    "categories",
    "settings",
    "messages",
    "subscribers",
    "pages",
    "language",
    "security",
  ].flatMap((s) => ["admin/" + s, "admin/preview/" + s]),
].map((p) => "/" + p + "/")
const pages = [...sitemapPages(data), ...privatePaths]
for (const page of pages) {
  const seo = resolveSeo(page, data, siteUrl)
  if (seo.redirect || page.includes("?")) continue
  const body = seo.render ? renderPage(data, page) : ""
  const html = documentHtml(shell, seo, body, data)
  const output =
    page === "/"
      ? path.join(directory, "index.html")
      : path.join(directory, page, "index.html")
  await mkdir(path.dirname(output), { recursive: true })
  await writeFile(output, html)
}
await writeFile(
  path.join(directory, "404.html"),
  documentHtml(
    shell,
    resolveSeo("/page-not-found/", data, siteUrl),
    renderPage(data, "/page-not-found/"),
    data,
  ),
)
await writeFile(path.join(directory, "sitemap.xml"), sitemapXml(data, siteUrl))
await writeFile(
  path.join(directory, "robots.txt"),
  "User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: " +
    siteUrl +
    "/sitemap.xml\n",
)
await writeFile(
  path.join(directory, "catalog.json"),
  JSON.stringify(data.products),
)
await writeFile(
  path.join(directory, "llms.txt"),
  "# London Tech\n\nLondon Technology Store in Arua Park, Kampala, Uganda. Currency: UGX.\nAddress: " +
    storeDefaults.address +
    "\nPhone: " +
    storeDefaults.phone +
    " / " +
    storeDefaults.phoneAlt +
    "\nPublished catalogue prices are in UGX. Confirm configuration, stock, delivery and product-specific terms with the store.\n\n- [Shop](" +
    siteUrl +
    "/collections/shop/)\n- [Store information](" +
    siteUrl +
    "/contact/)\n- [About London Tech](" +
    siteUrl +
    "/about/)\n",
)
console.log(
  `Production build complete: ${data.products.length} products, ${categories.length} categories, ${pages.length} routes. Public HTML and sitemap use the live database at request time.`,
)
