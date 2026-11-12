import { categories, productPath, storeDefaults } from "../data/catalog.js"
import { galleryImages, productInformation } from "./product-experience.js"
import {
  readCollectionFilters,
  scopeCollection,
  selectCollection,
} from "./collection-filters.js"

export const defaultOrigin = "https://london-tech.vercel.app"
export function publicOrigin(value = defaultOrigin) {
  const url = new URL(value)
  if (
    url.protocol !== "https:" ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    throw new Error("PUBLIC_SITE_URL must be a clean HTTPS origin.")
  return url.origin
}
export const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
export const jsonForHtml = (value) =>
  JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029")
const summary = (text) =>
  String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 170)
const phone = (value) =>
  String(value || "")
    .replace(/[^+\d]/g, "")
    .replace(/^0/, "+256")
const curated = {
  shop: "Shop Electronics",
  "hot-deals": "Hot Deals",
  "apple-products-london": "Apple Products",
  "iphones-london": "iPhones",
  "samsung-galaxy-ultra-london": "Samsung Galaxy Ultra",
}
const info = {
  about: [
    "About the Store",
    "Meet London Tech Stores, your local technology store in Arua Park, Kampala. See the shop, explore our products and watch our community videos.",
  ],
  contact: [
    "Visit Our Kampala Store",
    "Find London Tech Stores in Kampala. Contact the store for products, directions and opening hours.",
  ],
  delivery: [
    "Delivery & Collection in Uganda",
    "Explore London Tech Stores delivery and collection options in Uganda. Check availability, delivery charges and collection readiness before you order.",
  ],
  returns: [
    "Returns & Warranty",
    "Read London Tech Stores return and warranty information. Confirm the product-specific coverage, condition and sale terms before purchasing.",
  ],
  help: [
    "Shopping Help & FAQs",
    "Find answers about ordering, MTN and Airtel Mobile Money, Visa, store collection, payments and shopping at London Tech Stores.",
  ],
  privacy: [
    "Privacy Information",
    "How London Tech Stores uses account, order, newsletter and anonymous visitor information, and how to manage your choices.",
  ],
  terms: [
    "Shopping Terms",
    "Read London Tech Stores shopping terms covering confirmed prices, orders, payment verification, delivery, collection and returns.",
  ],
}
const privateRoute =
  /^\/(?:admin|account|cart|checkout|login|register|forgot-password|reset-password|unsubscribe|wishlist|compare)(?:\/|$)/
export function storeSchema(settings, origin) {
  const socials = Object.values(settings.socials || {}).filter((u) =>
    /^https:\/\//.test(u),
  )
  return {
    "@type": "ElectronicsStore",
    "@id": origin + "/#store",
    name: "London Tech Stores",
    alternateName: ["London Tech", "London Technology Store"],
    url: origin + "/",
    logo: origin + "/assets/london-tech-logo.png",
    image: origin + "/assets/about/store-interior.webp",
    telephone: phone(settings.phone),
    ...(settings.email ? { email: settings.email } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.address,
      addressLocality: "Kampala",
      addressCountry: "UG",
    },
    currenciesAccepted: "UGX",
    areaServed: { "@type": "Country", name: "Uganda" },
    ...(socials.length ? { sameAs: socials } : {}),
    hasMap: origin + "/contact/",
  }
}
export function resolveSeo(requestPath, data, origin = defaultOrigin) {
  origin = publicOrigin(origin)
  const url = new URL(requestPath, origin),
    pathname = url.pathname.replace(/\/+$/, "") || "/"
  const canonicalPath = pathname === "/" ? "/" : pathname + "/"
  const settings = { ...storeDefaults, ...data.settings },
    products = data.products.filter((p) => p.active !== false),
    pages = data.pages || []
  const result = {
    status: 200,
    title: "London Tech Stores | Electronics in Kampala",
    description: `Shop phones, tablets, audio, watches, accessories and perfumes at London Tech Stores in Arua Park, Kampala. Explore prices in UGX and visit shop FN:19.`,
    canonical: origin + canonicalPath,
    noindex: false,
    render: true,
    schemas: [],
  }
  const store = storeSchema(settings, origin)
  const crumbs = [{ name: "Home", url: origin + "/" }]
  let pageType = "WebPage",
    main
  if (pathname === "/visit" || pathname === "/collections/visit")
    return { ...result, status: 308, redirect: "/contact/" }
  if (privateRoute.test(pathname))
    return {
      ...result,
      title: "Your Account & Shopping | London Tech Stores",
      noindex: true,
      render: false,
      schemas: [],
    }
  if (pathname === "/") {
    result.schemas.push({
      "@type": "WebSite",
      "@id": origin + "/#website",
      url: origin + "/",
      name: "London Tech Stores",
      alternateName: ["London Tech", "London Technology Store"],
      inLanguage: "en-UG",
      publisher: { "@id": store["@id"] },
    })
  } else if (pathname.startsWith("/products/")) {
    const id = pathname.split("/")[2],
      p = products.find((p) => p.id === id)
    if (!p || pathname.split("/").length !== 3) result.status = 404
    else {
      const information = productInformation(p)
      const specs = new Map(information.specifications)
      const model = specs.get("Model number") || specs.get("Model code") || specs.get("Model")
      const color = specs.get("Colour") || specs.get("Color") || specs.get("Finish")
      result.title = `${p.name} in Uganda | London Tech Stores Kampala`
      result.description = summary(
        `${information.description} Shop at London Tech Stores in Kampala.`,
      )
      crumbs.push(
        {
          name: categories.find((c) => c.id === p.category)?.name || "Shop",
          url: origin + "/collections/" + p.category + "/",
        },
        { name: p.name, url: result.canonical },
      )
      const images = galleryImages(p)
        .filter((item) => item.type !== "video")
        .map((item) => new URL(item.src, origin).href)
      main = {
        "@type": "Product",
        "@id": result.canonical + "#product",
        name: p.name,
        url: result.canonical,
        sku: p.sku,
        description: information.description,
        ...(images.length ? { image: images } : {}),
        ...(color ? { color } : {}),
        ...(model ? { model } : {}),
        ...(specs.get("Storage")
          ? { additionalProperty: { "@type": "PropertyValue", name: "Storage", value: specs.get("Storage") } }
          : {}),
        ...(p.brand
          ? {
              brand: {
                "@type": "Brand",
                "@id": result.canonical + "#brand",
                name: p.brand,
              },
            }
          : {}),
        ...(p.priceConfirmed &&
        Number.isFinite(p.price) &&
        p.price > 0 &&
        p.stock !== null &&
        p.stock !== undefined
          ? {
              offers: {
                "@type": "Offer",
                "@id": result.canonical + "#offer",
                price: p.price,
                priceCurrency: "UGX",
                availability:
                  "https://schema.org/" +
                  (p.stock > 0 ? "InStock" : "OutOfStock"),
                url: result.canonical,
                seller: { "@id": store["@id"] },
              },
            }
          : {}),
      }
      // Ratings are included only when real published reviews are also rendered.
      const reviews = data.reviews?.[p.id] || []
      if (reviews.length)
        main.aggregateRating = {
          "@type": "AggregateRating",
          ratingValue:
            reviews.reduce((n, r) => n + Number(r.rating), 0) / reviews.length,
          reviewCount: reviews.length,
        }
      // Quote-only pages without reviews are not eligible for product rich results.
      if (main.offers || main.aggregateRating) result.schemas.push(main)
      else main = undefined
    }
  } else if (pathname.startsWith("/collections/")) {
    const id = pathname.split("/")[2],
      cat = categories.find((c) => c.id === id),
      title = curated[id] || cat?.name
    if (!title || pathname.split("/").length !== 3) result.status = 404
    else {
      const filters = readCollectionFilters(url.search),
        filtered = selectCollection(scopeCollection(products, id), filters),
        count = Math.max(1, Math.ceil(filtered.length / 12))
      const invalid =
        url.searchParams.has("page") &&
        !/^[1-9]\d*$/.test(url.searchParams.get("page"))
      if (invalid || filters.page > count) result.status = 404
      const faceted = [
        "q",
        "brand",
        "min",
        "max",
        "stock",
        "sort",
        "view",
      ].some((k) => url.searchParams.has(k))
      result.noindex = faceted
      result.canonical =
        origin +
        canonicalPath +
        (!faceted && filters.page > 1 ? "?page=" + filters.page : "")
      result.title = `${title} in Uganda${
        filters.page > 1 ? " – Page " + filters.page : ""
      } | London Tech Stores`
      result.description = summary(
        `${cat?.description || "Explore " + title.toLowerCase() + ", compare products and check current prices in UGX."} Shop at London Tech Stores in Arua Park, Kampala.`,
      )
      pageType = "CollectionPage"
      crumbs.push({ name: title, url: result.canonical })
      main = {
        "@type": "ItemList",
        numberOfItems: filtered.length,
        itemListElement: filtered
          .slice((filters.page - 1) * 12, filters.page * 12)
          .map((p, i) => ({
            "@type": "ListItem",
            position: (filters.page - 1) * 12 + i + 1,
            url: origin + "/products/" + p.id + "/",
            name: p.name,
          })),
      }
      result.schemas.push(main)
      result.previous =
        filters.page > 1
          ? origin +
            canonicalPath +
            (filters.page > 2 ? "?page=" + (filters.page - 1) : "")
          : null
      result.next =
        filters.page < count
          ? origin + canonicalPath + "?page=" + (filters.page + 1)
          : null
    }
  } else {
    const slug = pathname.startsWith("/pages/")
        ? pathname.split("/")[2]
        : pathname.slice(1),
      managed = pages.find((p) => p.slug === slug && p.body)
    if (
      managed &&
      (pathname === "/pages/" + slug || (info[slug] && pathname === "/" + slug))
    ) {
      if (info[slug]) result.canonical = origin + "/" + slug + "/"
      result.title = managed.title + " | London Tech Stores"
      result.description = summary(managed.summary || managed.body)
      crumbs.push({ name: managed.title, url: result.canonical })
    } else if (info[slug] && pathname.split("/").length === 2) {
      result.title = info[slug][0] + " | London Tech Stores"
      result.description =
        slug === "contact"
          ? summary(
              `Find London Tech Stores at ${settings.address}, Kampala. Call ${[settings.phone, settings.phoneAlt].filter(Boolean).join(" or ")} for products, directions and opening hours.`,
            )
          : info[slug][1]
      pageType =
        slug === "about"
          ? "AboutPage"
          : slug === "contact"
            ? "ContactPage"
            : "WebPage"
      crumbs.push({ name: info[slug][0], url: result.canonical })
    } else result.status = 404
  }
  if (result.status === 404)
    return {
      ...result,
      title: "Page Not Found | London Tech Stores",
      description:
        "This page is unavailable. Explore phones, tablets and more at London Tech Stores.",
      noindex: true,
      schemas: [],
    }
  result.schemas.unshift(store)
  result.schemas.push({
    "@type": pageType,
    "@id": result.canonical + "#webpage",
    url: result.canonical,
    name: result.title,
    description: result.description,
    inLanguage: "en-UG",
    isPartOf: { "@id": origin + "/#website" },
    about: { "@id": store["@id"] },
    ...(main ? { mainEntity: main["@id"] ? { "@id": main["@id"] } : main } : {}),
  })
  if (crumbs.length > 1)
    result.schemas.push({
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        item: c.url,
      })),
    })
  return result
}
export function seoHead(seo) {
  const meta = (key, value, property = false) =>
    `<meta ${
      property ? "property" : "name"
    }="${key}" content="${escapeHtml(value)}">`
  const serverProduct = seo.schemas.some((node) => node["@type"] === "Product")
  const schema = jsonForHtml({
    "@context": "https://schema.org",
    "@graph": seo.schemas,
  })
  return (
    `<title>${escapeHtml(seo.title)}</title>` +
    meta("description", seo.description) +
    meta(
      "robots",
      seo.noindex
        ? "noindex,follow"
        : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
    ) +
    `<link rel="canonical" href="${escapeHtml(seo.canonical)}">` +
    meta("og:title", seo.title, true) +
    meta("og:description", seo.description, true) +
    meta("og:url", seo.canonical, true) +
    meta("twitter:title", seo.title) +
    meta("twitter:description", seo.description) +
    (seo.previous
      ? `<link rel="prev" href="${escapeHtml(seo.previous)}">`
      : "") +
    (seo.next ? `<link rel="next" href="${escapeHtml(seo.next)}">` : "") +
    `<script id="seo-structured-data" type="application/ld+json"${serverProduct ? " data-server-product" : ""}>${schema}</script>`
  )
}
export function documentHtml(shell, seo, body, data) {
  shell = shell
    .replace(/<title>[\s\S]*?<\/title>/g, "")
    .replace(
      /<meta\b[^>]*(?:name="(?:description|robots|googlebot|twitter:title|twitter:description)"|property="(?:og:title|og:description|og:url)")[^>]*>/g,
      "",
    )
    .replace(/<link\b[^>]*rel="canonical"[^>]*>/g, "")
    .replace(
      /<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g,
      "",
    )
  return shell
    .replace("</head>", seoHead(seo) + "</head>")
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`)
    .replace(
      "</body>",
      `<script id="store-bootstrap" type="application/json">${jsonForHtml(data)}</script></body>`,
    )
}
export function sitemapPages(data) {
  const paths = [
    "/",
    "/collections/shop/",
    ...categories.map((c) => "/collections/" + c.id + "/"),
    ...Object.keys(curated)
      .filter((k) => k !== "shop")
      .map((k) => "/collections/" + k + "/"),
    ...Object.keys(info).map((s) => "/" + s + "/"),
    ...data.products
      .filter((p) => p.active !== false)
      .map(productPath),
    ...(data.pages || [])
      .filter((p) => p.body && !info[p.slug])
      .map((p) => "/pages/" + p.slug + "/"),
  ]
  for (const id of [
    "shop",
    ...categories.map((c) => c.id),
    ...Object.keys(curated).filter((k) => k !== "shop"),
  ])
    for (
      let page = 2;
      page <= Math.ceil(scopeCollection(data.products, id).length / 12);
      page++
    )
      paths.push("/collections/" + id + "/?page=" + page)
  return [...new Set(paths)]
}
export function sitemapXml(data, origin) {
  const products = new Map(
    data.products.filter((product) => product.active !== false)
      .map((product) => [productPath(product), product]),
  )
  return (
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">' +
    sitemapPages(data)
      .map((path) => {
        const product = products.get(path)
        const date = product ? Date.parse(product.updatedAt || product.createdAt) : NaN
        const lastmod = Number.isFinite(date)
          ? `<lastmod>${new Date(date).toISOString()}</lastmod>`
          : ""
        const images = product ? galleryImages(product).filter(({ src }) => src.startsWith("/assets/")) : []
        const imageEntries = images.map(({ src }) =>
          `<image:image><image:loc>${escapeHtml(new URL(src, origin).href)}</image:loc></image:image>`,
        ).join("")
        return `<url><loc>${escapeHtml(origin + path)}</loc>${lastmod}${imageEntries}</url>`
      })
      .join("") +
    "</urlset>"
  )
}
