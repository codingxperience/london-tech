# London Tech search visibility

The production origin is `https://london-tech.vercel.app`. A custom domain has not been supplied. Set `PUBLIC_SITE_URL` to the verified HTTPS origin when a domain is added, redirect the previous host, and resubmit the sitemap. Never use a deployment preview address as the canonical origin.

The team-scoped Vercel alias was checked on 2 November 2026 and redirected unauthenticated requests to Vercel login. It must not be used for search indexing while deployment protection is enabled. The short production alias is publicly accessible.

## Rendering and catalogue updates

`api/pages.js` serves public pages with their React content already present in the initial HTML. It reads the current public catalogue, store settings, published content pages and customer reviews from PostgreSQL. Page content, metadata, product offers and the sitemap use the same records. A database outage returns HTTP 503 with a retry header rather than publishing outdated prices. Without a configured production database, the approved source catalogue remains browsable.

The build produces the browser assets, static review snapshots in `dist`, and the server renderer and HTML template in `.output/server`. Vercel packages that renderer with the page function. The page response has an `X-London-Tech-Render: server` header. Public responses revalidate; private account pages and filtered search variants use `no-store`.

The browser receives only public catalogue records. Account, session, order, subscriber and payment credentials are never included in the HTML bootstrap. Client navigation updates titles, descriptions, canonical links, social metadata and structured data together.

## Indexing and rich results

- Product and category pages have distinct Uganda/Kampala titles, descriptions, headings and crawlable links.
- Product, Offer, BreadcrumbList, ElectronicsStore, WebSite and page schemas describe the visible content. Offers require a confirmed price and known stock. Ratings come only from actual published reviews. Unknown hours, coordinates, identifiers, awards and return promises are omitted.
- Clean category pagination has real links and a canonical URL for each page. Faceted, searched, sorted and alternate-view URLs are `noindex,follow` and canonicalize to the category. Account, checkout and admin pages are also excluded from indexing.
- Unknown products, categories and pages return HTTP 404. Old visit links redirect to the contact page. Crawlers can access pages with `noindex` so they can read the directive; API endpoints are blocked in `robots.txt`.
- `/sitemap.xml` uses active products, public categories, clean pagination and published information pages. It excludes private routes, filter variants and invented modification dates.
- The white London Tech logo remains the social sharing image and favicon. Hero image priority and font preconnections help the initial render.

## Verification

Run `pnpm typecheck`, `pnpm build` and `pnpm test`. SEO tests inspect initial HTML, live metadata and offers, canonical pagination, facet exclusions, status codes, safe JSON embedding and verified PostgreSQL TLS. After deployment, check public HTML without executing JavaScript, the renderer header, canonical links, status codes and the live sitemap. Confirm that public rewritten pages do not inherit API `noindex` headers.

Use [Google's Rich Results Test](https://search.google.com/test/rich-results) and Search Console URL Inspection on representative product, collection and store pages. Eligibility does not guarantee that Google will display a rich result.

## Owner setup after deployment

1. Verify the production property in [Google Search Console](https://search.google.com/search-console) using an account controlled by the business and submit `/sitemap.xml`. Verification requires the owner's Google access or a supplied verification token.
2. Claim and verify the physical shop in [Google Business Profile](https://www.google.com/business/). Use the same real address and phone numbers, real shop photos, and confirmed opening hours.
3. Keep product names, images, selling prices, previous prices, quantities and store policies accurate in admin. Review search queries, indexing and real-user performance in Search Console after Google has crawled the site.
4. Add only confirmed social profiles. The supplied TikTok profile is configured; the other networks remain unset.

Search rankings depend on competition, content, reputation and search engine decisions. This implementation improves crawlability and search eligibility; no code can guarantee a first-place ranking.

Primary references: [JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [product structured data](https://developers.google.com/search/docs/appearance/structured-data/product), [ecommerce pagination](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading), [faceted navigation](https://developers.google.com/crawling/docs/faceted-navigation), and [local business structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business).
