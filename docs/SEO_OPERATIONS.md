# London Tech search and publishing operations

This project generates crawlable storefront pages, structured business and product information, a sitemap, a robots file, and a concise machine-readable catalogue. Search engines determine indexing, rankings, favicons and rich-result presentation; the build does not guarantee those outcomes.

## What the build publishes

- A home page with London Tech identity and navigation structured data.
- Crawlable category pages under `/collections/` and catalogue pages under `/products/`.
- A generated `sitemap.xml`, `robots.txt`, and `llms.txt` / `llms-full.txt` summaries.
- The owner-supplied London Tech logo and its generated social preview.
- A browser-local administration prototype marked `noindex`.

The catalogue is a prototype, not a live stock or pricing feed. Do not infer current availability, price, condition, delivery, collection, warranty, or service terms from a catalogue entry. Add structured offers, reviews, ratings, and verified business contact or location data only when London Tech supplies and confirms those facts.

## Canonical origin

The build reads one HTTPS origin from `PUBLIC_SITE_URL`. It currently defaults to the project’s preview origin, `https://london-tech.vercel.app`. Treat that as a build placeholder until the owner confirms the actual public domain and it resolves to the deployed site. Before publishing, set `PUBLIC_SITE_URL` to the verified HTTPS origin in the deployment environment and rebuild. The value must be an origin only, with no path, query, or fragment.

Do not use the GitHub repository URL as the public storefront URL. Do not reuse the previous brand’s domain, redirect rules, or Search Console verification token.

## Release review

For a release, build the static site and inspect the deployed responses after publishing:

1. Check the home page and a product/category page at desktop and mobile widths.
2. Confirm the canonical URLs, social image, logo and structured data use the verified public origin.
3. Confirm `/robots.txt` and `/sitemap.xml` point to that same origin and include the generated collection and product routes.
4. Confirm `/admin.html` remains noindex and continues to identify itself as a browser-only demonstration.
5. Submit the sitemap to the search service associated with London Tech only after the public domain is verified.

## Business details and local discovery

The store address, public phone or WhatsApp number, email, opening hours, collection options, and delivery arrangements have not yet been supplied. Keep these fields unlisted until the owner confirms them. When provided, use the same accurate details across the website and official business profiles. Request honest reviews from real customers only; do not create or buy reviews.

## Prototype boundary

The public storefront is static. Enquiry actions remain on-site until a public contact channel is configured. The admin page saves demonstration records in the current browser and does not connect to orders, payments, inventory, staff, or customer systems. It is not production authentication or a secure operations backend.
