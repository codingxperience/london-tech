# London Tech commerce setup

The storefront keeps the design from repository commit `ec27da6`: Nunito typography, light canvas, white cards, navy header and navigation, bilingual categories, wide promotional hero, green chat actions and the existing footer. Commerce pages use the same visual language. The admin console is a separate light workspace.

## Run locally

Use Node.js 24 and pnpm. Install with `pnpm install --frozen-lockfile`, then run `pnpm dev`. Open the URL printed by Vite. Local account and order records use PostgreSQL-compatible PGlite files in the ignored `.data/postgres` directory.

To create your first local administrator, copy `.env.example` to `.env`, set `PUBLIC_SITE_URL` to Vite's printed origin (usually `http://127.0.0.1:5173`), enter `ADMIN_EMAIL` and an `ADMIN_PASSWORD` of at least 12 characters, and run `pnpm db:setup`. There is no shared or hardcoded administrator password. Restart the development server after changing environment variables.

## Production environment in Vercel

Keep the existing London Tech Vercel project and GitHub integration. The build command is `pnpm run build`; output is `dist`. The Node function at `api/router.js` supplies account, catalogue, order and payment endpoints. `vercel.json` explicitly captures `/api/:__lt_route(.*)` and forwards it to that function. The capture includes canonical trailing slashes because Vercel compiles route patterns with strict matching. This Vite deployment does not use Next.js catch-all filename routing. The adapter retains request bodies, cookies, origin headers and business query parameters before calling the shared commerce handler.

Set the following in Vercel → Project → Settings → Environment Variables. Keep secret values out of source files, browser code and chat.

| Variable | Purpose |
| --- | --- |
| `PUBLIC_SITE_URL` | The verified production origin, currently `https://london-tech-codingxperiences-projects.vercel.app`. No path or trailing slash. |
| `DATABASE_URL` | Hosted PostgreSQL connection string. A pooled connection is recommended for serverless hosting. Preserve the provider’s required TLS settings. |
| `ADMIN_EMAIL` | Email for the initial administrator. Set it before opening registration. |
| `ADMIN_PASSWORD` | Initial administrator password, at least 12 characters. |
| `FLW_SECRET_KEY` | Flutterwave v3 server secret. Start with a test secret. |
| `FLW_SECRET_HASH` | A long random webhook secret that exactly matches the hash configured in Flutterwave. |
| `RESEND_API_KEY` | Optional: transactional email for password resets. |
| `EMAIL_FROM` | Optional: a sender address on your verified Resend domain. |

Redeploy after adding or changing environment variables. On the first database-backed request, the application initializes its tables, adds missing catalogue entries and creates the initial administrator. Existing administrator passwords are not overwritten by later environment changes; use the account password screen to change a password.

Without a production database, browsing, product information and a device-local cart remain available. The server explicitly refuses registration, login and orders until persistent storage is configured. It never silently stores real customer records in a browser-only demo. `/admin/preview/` is an interactive, clearly labelled local preview. Its changes remain in that browser and never modify the live store. See [the administration guide](ADMIN_WORKSPACE.md).

## Flutterwave

1. Enable Uganda mobile money and card payments on your Flutterwave merchant account. Currency is UGX.
2. Configure the webhook URL as `https://london-tech-codingxperiences-projects.vercel.app/api/payments/webhook/` (or your verified production origin). Keep the final slash to match Vercel’s URL policy.
3. Set the webhook secret hash to the same value as `FLW_SECRET_HASH` and enable webhook retries.
4. If using per-payment method selection, follow Flutterwave’s dashboard guidance for `payment_options`.
5. Validate a test card and each available Uganda mobile money network in the merchant sandbox. Then use the approved live merchant secret and redeploy.

Checkout creates an order with a server-calculated amount. The customer is redirected to Flutterwave; card details and mobile money PINs are never collected by London Tech. Both the return route and signed webhook call Flutterwave’s transaction verification endpoint. Reference, currency, amount and successful status must match before the order is marked paid. Duplicate verification does not deduct inventory twice.

Official documentation: [payment methods](https://developer.flutterwave.com/docs/payment-methods), [transaction verification](https://developer.flutterwave.com/docs/transaction-verification), [webhooks](https://developer.flutterwave.com/docs/webhooks).

## Prices, stock and quotes

The owner approved the proposed UGX prices, regular prices and opening quantities as launch values on 1 November 2026. They appear by default across the storefront and order calculation. See [launch offers](LAUNCH_OFFERS.md) for the source records and one-time database migration. Merchant changes and numeric stock counts are preserved.

In admin → Products, maintain each product's configuration, selling price, regular price, condition, warranty and remaining stock. New products start with unconfirmed prices and inventory: check **This price is confirmed by the store**, enter a stock quantity and save when ready. Unconfirmed guide prices are excluded from structured-data offers and cannot be used for immediate payment. Enter the delivery charge in Settings, or leave it blank to require a delivery quote. Collection uses the supplied store address.

For an unconfirmed item, the customer submits a price and availability request. In admin → Orders, open that request and save a confirmed quote with unit prices, any delivery fee and configuration notes. The quote appears in the customer’s account and is valid for 24 hours. Stock is rechecked and reserved for 30 minutes when the customer starts payment. The application does not claim to send an email when a quote is saved.

Payment status is server-controlled. Admin can update fulfillment after payment verification. Paid orders cannot be manually marked unpaid or cancelled; refunds must be handled through Flutterwave and the order marked for review.

## Confirmed public information

- Phone: **0788341111**
- Second phone: **0709417273**
- Address: **Arua Park, NYUMBA KUBUA building, second floor, shop FN:19**
- Country / currency: **Uganda / UGX**
- Opening hours and public email remain unset until confirmed.

## Verification and limitations

Run `pnpm run typecheck`, `pnpm run build`, and `pnpm test`. Tests cover permissions, cross-origin writes, account persistence, authoritative totals, stock reservations, quotes, payment verification, idempotent settlement, image references, metadata and component rendering. Payment-provider responses are mocked in automated tests; no real charge is made. Browser screenshot review depends on the available desktop/browser connection.

The old, incompatible browser-local prototype and runtime are not used. The storefront, accounts, orders and admin share the same server catalogue. Database backups, merchant onboarding and operational delivery/return rules should be maintained through the store’s providers and confirmed business processes.
