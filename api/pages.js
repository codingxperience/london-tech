import { readFile } from "node:fs/promises"
import { publicCatalog } from "../server/public-catalog.js"
import {
  defaultOrigin,
  publicOrigin,
  resolveSeo,
  documentHtml,
  sitemapXml,
} from "../src/lib/seo.js"

const origin = () => publicOrigin(process.env.PUBLIC_SITE_URL || defaultOrigin)
let shell
function requestPath(req) {
  const url = new URL(req.url || "/", origin()),
    query = req.query || {}
  const captured = query.__lt_page ?? url.searchParams.get("__lt_page")
  if (
    Array.isArray(captured) ||
    url.searchParams.getAll("__lt_page").length > 1
  )
    throw Object.assign(new Error("Invalid path"), { status: 400 })
  const pathname =
    captured == null
      ? url.pathname
      : "/" + String(captured).replace(/^\/+|\/+$/g, "")
  if (
    !/^\/[a-zA-Z0-9_./%-]*$/.test(pathname) ||
    pathname.includes("..") ||
    pathname.includes("//")
  )
    throw Object.assign(new Error("Invalid path"), { status: 400 })
  url.searchParams.delete("__lt_page")
  for (const [key, value] of Object.entries(query))
    if (key !== "__lt_page" && !url.searchParams.has(key))
      for (const item of Array.isArray(value) ? value : [value])
        if (typeof item === "string") url.searchParams.append(key, item)
  return (
    pathname +
    (pathname !== "/" && !pathname.endsWith("/") && pathname !== "/sitemap.xml"
      ? "/"
      : "") +
    (url.searchParams.size ? "?" + url.searchParams : "")
  )
}
export function createPageHandler({
  load = publicCatalog,
  render,
  template,
} = {}) {
  return async function pageHandler(req, res) {
    res.setHeader("Content-Type", "text/html; charset=utf-8")
    res.setHeader("X-London-Tech-Render", "server")
    if (!["GET", "HEAD"].includes(req.method || "GET")) {
      res.statusCode = 405
      res.setHeader("Allow", "GET, HEAD")
      res.end()
      return
    }
    try {
      const path = requestPath(req),
        data = await load()
      if (path.split("?")[0] === "/sitemap.xml") {
        res.setHeader("Content-Type", "application/xml; charset=utf-8")
        res.setHeader("Cache-Control", "public, max-age=0, must-revalidate")
        res.statusCode = 200
        res.end(req.method === "HEAD" ? "" : sitemapXml(data, origin()))
        return
      }
      const seo = resolveSeo(path, data, origin())
      if (seo.redirect) {
        res.statusCode = seo.status
        res.setHeader("Location", seo.redirect)
        res.end()
        return
      }
      res.statusCode = seo.status
      res.setHeader(
        "Cache-Control",
        seo.noindex ? "no-store" : "public, max-age=0, must-revalidate",
      )
      if (seo.noindex) res.setHeader("X-Robots-Tag", "noindex, follow")
      if (req.method === "HEAD") {
        res.end()
        return
      }
      const html =
        template ||
        (shell ??= await readFile(
          new URL("../.output/server/template.html", import.meta.url),
          "utf8",
        ))
      const renderer =
        render || (await import("../.output/server/render.js")).renderPage
      const body = seo.render
        ? renderer(data, seo.status === 404 ? "/page-not-found/" : path)
        : "<main><h1>Your London Tech account</h1><p>Enable JavaScript to access secure shopping and account features.</p></main>"
      res.end(documentHtml(html, seo, body, data))
    } catch (error) {
      res.statusCode = error.status || 503
      res.setHeader("Cache-Control", "no-store")
      res.setHeader("Retry-After", "60")
      res.setHeader("X-Robots-Tag", "noindex, follow")
      res.end(
        '<!doctype html><html lang="en"><head><meta name="robots" content="noindex"><title>London Tech — Please try again</title></head><body><h1>We’ll be back shortly.</h1><p>The store could not load its current catalogue. Please try again soon.</p></body></html>',
      )
      console.error("Public page unavailable", error.code || error.name)
    }
  }
}
export default createPageHandler()
export { requestPath }
