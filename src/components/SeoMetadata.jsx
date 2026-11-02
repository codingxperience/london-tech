import { useEffect } from "react"
import { useStore } from "../store.jsx"
import { defaultOrigin, resolveSeo } from "../lib/seo.js"

export function SeoMetadata({ path }) {
  const { products, settings, pages, initialReviews } = useStore()
  useEffect(() => {
    const update = () => {
      const existing = document.querySelector('link[rel="canonical"]')?.href
      const origin = existing ? new URL(existing).origin : defaultOrigin
      const seo = resolveSeo(
        location.pathname + location.search,
        { products, settings, pages, reviews: initialReviews },
        origin,
      )
      document.title = seo.title
      const meta = (key, value, prop = false) => {
        const selector = `meta[${prop ? "property" : "name"}="${key}"]`
        let node = document.querySelector(selector)
        if (!node) {
          node = document.createElement("meta")
          node.setAttribute(prop ? "property" : "name", key)
          document.head.append(node)
        }
        node.setAttribute("content", value)
      }
      meta("description", seo.description)
      meta(
        "robots",
        seo.noindex
          ? "noindex,follow"
          : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
      )
      document.querySelector('meta[name="googlebot"]')?.remove()
      for (const [key, val] of [
        ["title", seo.title],
        ["description", seo.description],
        ["url", seo.canonical],
      ])
        meta("og:" + key, val, true)
      meta("twitter:title", seo.title)
      meta("twitter:description", seo.description)
      for (const [rel, value] of [
        ["canonical", seo.canonical],
        ["prev", seo.previous],
        ["next", seo.next],
      ]) {
        let link = document.querySelector(`link[rel="${rel}"]`)
        if (!value) {
          link?.remove()
          continue
        }
        if (!link) {
          link = document.createElement("link")
          link.rel = rel
          document.head.append(link)
        }
        link.href = value
      }
      let schema = document.getElementById("seo-structured-data")
      if (!schema) {
        schema = document.createElement("script")
        schema.type = "application/ld+json"
        schema.id = "seo-structured-data"
        document.head.append(schema)
      }
      schema.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@graph": seo.schemas,
      })
    }
    update()
    window.addEventListener("lt:location-meta", update)
    return () => window.removeEventListener("lt:location-meta", update)
  }, [path, products, settings, pages, initialReviews])
  return null
}
