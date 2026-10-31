import { build } from "vite"

import { mkdir, readFile, writeFile } from "node:fs/promises"

import path from "node:path"

import { products, categories, storeDefaults } from "../src/data/catalog.js"
import {
  galleryImages,
  productInformation,
} from "../src/lib/product-experience.js"

import { siteUrl } from "./site-config.mjs"

await build()

const directory = path.resolve("dist")

const original = await readFile(path.join(directory, "index.html"), "utf8")

const escape = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")

const json = (v) => JSON.stringify(v).replaceAll("<", "\\u003c")

const organization = {
  "@type": "Store",
  "@id": siteUrl + "/#store",
  name: "London Tech",
  url: siteUrl,
  logo: siteUrl + "/assets/london-tech-logo.png",
  image: siteUrl + "/assets/london-tech-logo.png",
  telephone: storeDefaults.phone,
  address: {
    "@type": "PostalAddress",
    streetAddress: storeDefaults.address,
    addressCountry: "UG",
  },
  currenciesAccepted: "UGX",
}

const pages = [
  {
    path: "/",
    title: "London Tech | London Technology Store",
    description:
      "Phones, laptops, audio, gaming and everyday technology. Visit London Tech at Arua Park, NYUMBA KUBUA building, shop FN:19. Shop in UGX.",
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        organization,
        {
          "@type": "WebSite",
          name: "London Tech",
          url: siteUrl,
          inLanguage: "en-UG",
        },
      ],
    },
  },

  {
    path: "/collections/shop/",
    title: "Shop technology | London Tech",
    description:
      "Explore the complete London Tech collection. Compare products, save your favourites and find your next everyday essential.",
  },

  ...categories.map((c) => ({
    path: "/collections/" + c.id + "/",
    title: c.name + " | London Tech Uganda",
    description:
      c.description +
      " Explore the " +
      c.name.toLowerCase() +
      " collection at London Tech.",
  })),

  ...products
    .filter((p) => p.active)
    .map((p) => ({
      path: "/products/" + p.id + "/",
      title: p.name + " | London Tech Uganda",
      description: productInformation(p).description,
      schema: {
        "@context": "https://schema.org",
        "@type": "Product",
        name: p.name,
        sku: p.sku,
        description: productInformation(p).description,
        brand: { "@type": "Brand", name: p.brand },
        image: galleryImages(p).map(({ src: url }) =>
          url.startsWith("/") ? siteUrl + url : url,
        ),
        ...(p.priceConfirmed && p.price && p.stock != null
          ? {
              offers: {
                "@type": "Offer",
                price: p.price,
                priceCurrency: "UGX",
                availability:
                  p.stock > 0
                    ? "https://schema.org/InStock"
                    : "https://schema.org/OutOfStock",
                url: siteUrl + "/products/" + p.id + "/",
              },
            }
          : {}),
      },
    })),

  ...[
    "about",
    "contact",
    "delivery",
    "returns",
    "help",
    "privacy",
    "terms",
  ].map((p) => ({
    path: "/" + p + "/",
    title:
      {
        about: "About London Tech",
        contact: "Visit & contact London Tech",
        delivery: "Delivery & collection",
        returns: "Returns & warranty",
        help: "Frequently asked questions",
        privacy: "Privacy information",
        terms: "Shopping terms",
      }[p] + " | London Tech",
    description:
      "London Tech — London Technology Store. Product information, store details and shopping support in Uganda.",
  })),

  ...[
    "cart",
    "checkout",
    "checkout/result",
    "login",
    "register",
    "forgot-password",
    "reset-password",
    "account",
    "account/orders",
    "account/wishlist",
    "account/profile",
    "account/addresses",
    "account/security",
    "wishlist",
    "compare",
    "admin",
    "admin/preview",
  ].map((p) => ({
    path: "/" + p + "/",
    title:
      "London Tech | " + p.split("/")[0].replace(/^\w/, (c) => c.toUpperCase()),
    description: "Your London Tech store account and shopping experience.",
    noindex: true,
  })),

  ...[
    ["apple-products-london", "The Apple collection"],
    ["iphones-london", "iPhones"],
    ["samsung-galaxy-ultra-london", "Samsung Galaxy Ultra"],
    ["visit", "Visit London Tech"],
  ].map(([slug, title]) => ({
    path: "/collections/" + slug + "/",
    title: title + " | London Tech Uganda",
    description:
      "Explore London Tech in Uganda. Compare products and visit the store at Arua Park.",
  })),
]

for (const page of pages) {
  let html = original
    .replace(
      /<title>[\s\S]*?<\/title>/,
      "<title>" + escape(page.title) + "</title>",
    )

    .replace(
      /(<meta name="description" content=")[^"]*/,
      (_, prefix) => prefix + escape(page.description),
    )

    .replace(
      /(<meta id="og-title" property="og:title" content=")[^"]*/,
      (_, prefix) => prefix + escape(page.title),
    )

    .replace(
      /(<meta property="og:description" content=")[^"]*/,
      (_, prefix) => prefix + escape(page.description),
    )

    .replace(
      /(<meta id="twitter-title" name="twitter:title" content=")[^"]*/,
      (_, prefix) => prefix + escape(page.title),
    )

    .replace(
      /(<meta name="twitter:description" content=")[^"]*/,
      (_, prefix) => prefix + escape(page.description),
    )

    .replace(
      /(<link id="canonical-url" rel="canonical" href=")[^"]*/,
      (_, prefix) => prefix + siteUrl + page.path,
    )

    .replace(
      /(<meta id="og-url" property="og:url" content=")[^"]*/,
      (_, prefix) => prefix + siteUrl + page.path,
    )

    .replaceAll("https://london-tech.vercel.app", siteUrl)

  if (page.noindex)
    html = html.replace(
      /(<meta name="(?:robots|googlebot)" content=")[^"]*/g,
      "$1noindex,nofollow",
    )

  const schema = page.schema || {
    "@context": "https://schema.org",
    "@graph": [organization],
  }

  html = html.replace(
    "</head>",
    '<script type="application/ld+json">' + json(schema) + "</script></head>",
  )

  const output =
    page.path === "/"
      ? path.join(directory, "index.html")
      : path.join(directory, page.path, "index.html")

  await mkdir(path.dirname(output), { recursive: true })
  await writeFile(output, html)
}

await writeFile(
  path.join(directory, "sitemap.xml"),
  '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    pages
      .filter((p) => !p.noindex)
      .map((p) => "<url><loc>" + siteUrl + p.path + "</loc></url>")
      .join("") +
    "</urlset>",
)

await writeFile(
  path.join(directory, "robots.txt"),
  "User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /account/\nDisallow: /checkout/\nDisallow: /api/\nSitemap: " +
    siteUrl +
    "/sitemap.xml\n",
)

await writeFile(path.join(directory, "catalog.json"), JSON.stringify(products))

await writeFile(
  path.join(directory, "llms.txt"),
  "# London Tech\n\nLondon Technology Store in Uganda. Currency: UGX.\nAddress: " +
    storeDefaults.address +
    "\nPhone: " +
    storeDefaults.phone +
    " / " +
    storeDefaults.phoneAlt +
    "\nGuide prices are estimates until confirmed by the store.\n\n- [Shop](" +
    siteUrl +
    "/collections/shop/)\n- [Store information](" +
    siteUrl +
    "/contact/)\n",
)

console.log(
  `London Tech production build complete: ${products.length} products, ${categories.length} categories, ${pages.length} pages. Guide prices are excluded from product offer schema.`,
)
