# London Tech

A premium storefront prototype for **London Tech — London Technology Store**. The supplied London Tech logo informs the visual identity: deep navy, red, clean white space and a clear editorial layout.

## Run locally

Use Node.js 24 or later.

```powershell
npm install
npm run dev
```

The Vite development server serves the interactive storefront. Use `/admin.html` to view the separate browser-local administration prototype.

## Build and deployment

```powershell
npm run build
npm run preview
```

The production build precompiles the storefront and admin components, generates direct collection and product pages, and writes the sitemap and robots file. Vercel builds with `npm run build` and serves `dist/`.

The default canonical origin is `https://london-tech.vercel.app`. Set `PUBLIC_SITE_URL` to the verified production HTTPS origin in the deployment environment before publishing under a different domain. The repository’s GitHub URL is not assumed to be the public storefront URL.

## Project map

- `index.html` — interactive storefront and its London Tech visual system.
- `admin.html` — clearly labelled local prototype for catalogue and shop operations; it has no connected backend or production authentication.
- `public/admin-data.js` — shared sample catalogue data used by the storefront and admin prototype.
- `public/support.js` — storefront component runtime.
- `public/assets/` — supplied London Tech logo, generated brand preview and catalogue imagery.
- `scripts/build.mjs` — production build.
- `scripts/seo-pages.mjs` — collection, product, sitemap and robots generation.
- `scripts/site-config.mjs` — canonical origin validation and replacement.
- `scripts/precompile-dc.mjs` — component precompilation for the deployment content policy.
- `scripts/qa.mjs` — source and build consistency checks.
- `ASSET_SOURCES.md` — image source register.

## Store information and publishing notes

The store address, public telephone or WhatsApp, email, opening hours, collection and delivery arrangements have not yet been supplied. The storefront leaves these details unlisted until they are confirmed. It also avoids presenting product availability, pricing, warranties, trade-ins, repairs or delivery as guaranteed services.

The product catalogue is a static prototype. Confirm product names, specifications, imagery rights, pricing and availability before production use.

## Admin prototype

The admin console keeps sample data in the current browser and displays its demo access details in the sign-in view. It is a front-end prototype, not a secure or connected operations system. Do not enter real customer, payment or staff information.