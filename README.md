# London Tech

London Tech — London Technology Store, Uganda. The current repository storefront design is preserved: its light canvas, white product cards, navy navigation, bilingual category sidebar, promotional hero, green chat buttons and existing footer. New commerce pages extend that design.

## Development

Use Node.js 24 and pnpm.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Local accounts and orders use a PostgreSQL-compatible PGlite database in the ignored `.data/postgres` directory. Copy `.env.example` to `.env` and set your own administrator email and password before running `pnpm db:setup`.

## Checks and production

```sh
pnpm run typecheck
pnpm run build
pnpm test
```

Vercel serves `dist/` and the Node API in `api/`. Hosted PostgreSQL and Flutterwave credentials are required for live account, order and payment services. See [commerce setup](docs/COMMERCE_SETUP.md) for the exact environment variables, webhook URL and activation steps. No administrator password or payment secret is embedded in the application.

## Included

- Existing storefront design and source imagery.
- 12 categories, search, filters, sorting, pagination and product comparison.
- Product galleries, specifications, options, package/condition/warranty details, related products and verified-purchase reviews.
- Persistent cart and wishlist, customer registration/sign-in, account details, saved addresses and order history.
- UGX checkout for MTN Mobile Money, Airtel Money and Visa / card through Flutterwave hosted payment.
- Price confirmation requests, admin quotes, customer quote review, stock reservations and server-verified payment status.
- Admin overview, products, stock, categories, orders, customers, exports, settings and activity log.
- Read-only admin design preview at `/admin/preview/`.
- Footer about link, store information, delivery/returns/help pages, white-logo share metadata and favicon.

Draft guide prices are estimates until approved in admin; stock is unconfirmed until entered. They cannot trigger immediate payment. Public phone numbers are 0788341111 and 0709417273. The supplied address is Arua Park, NYUMBA KUBUA building, second floor, shop FN:19.

The automated payment tests use mocked provider responses and never make real charges. [Pricing and asset notes](docs/PRICING_AND_ASSETS.md) describe the catalogue assumptions.