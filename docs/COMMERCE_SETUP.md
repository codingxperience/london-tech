# London Tech commerce setup

The storefront keeps the design from repository commit `ec27da6`: Nunito typography, light canvas, white cards, navy header and navigation, bilingual categories, wide promotional hero, green chat actions and the existing footer. Commerce pages use the same visual language. The admin console is a separate light workspace.

## Run locally

Use Node.js 24 and pnpm. Install with `pnpm install --frozen-lockfile`, then run `pnpm dev`. Open the URL printed by Vite. Local account and order records use PostgreSQL-compatible PGlite files in the ignored `.data/postgres` directory.

To create your first local administrator, copy `.env.example` to `.env`, set `PUBLIC_SITE_URL` to Vite's printed origin (usually `http://127.0.0.1:5173`), enter `ADMIN_EMAIL` and an `ADMIN_PASSWORD` of at least 12 characters, and run `pnpm db:setup`. There is no shared or hardcoded administrator password. Restart the development server after changing environment variables.

## Production environment in Vercel

Keep the existing London Tech Vercel project and GitHub integration. The build command is `pnpm run build`; published assets are in `.output/public`, with static review snapshots in `dist`. The Node function at `api/router.js` supplies account, catalogue, order and payment endpoints. `api/pages.js` serves public HTML and the sitemap from current public database records, using the renderer packaged from `.output/server`. See [SEO](SEO.md).

`vercel.json` explicitly captures `/api/:__lt_route(.*)` and forwards it to the commerce function. The capture includes canonical trailing slashes because Vercel compiles route patterns with strict matching. This Vite deployment does not use Next.js catch-all filename routing. The adapter retains request bodies, cookies, origin headers and business query parameters before calling the shared commerce handler.

Set the following in Vercel → Project → Settings → Environment Variables. Keep secret values out of source files, browser code and chat.

| Variable | Purpose |
| --- | --- |
| `PUBLIC_SITE_URL` | The verified production origin, currently `https://london-tech.vercel.app`. No path or trailing slash. |
| `DATABASE_URL` | Hosted PostgreSQL connection string. Use the Supabase transaction pooler on port 6543 for serverless requests. Supabase TLS verifies against the bundled public CA. |
| `DIRECT_URL` | Optional session-mode connection on port 5432, used by `pnpm db:setup` for schema initialization. Never expose it in client variables. |
| `ADMIN_EMAIL` | Email for the initial administrator. Set it before opening registration. |
| `ADMIN_PASSWORD` | Initial administrator password, at least 12 characters. |
| `FLW_SECRET_KEY` | Flutterwave v3 server secret. Start with a test secret. |
| `FLW_SECRET_HASH` | A long random webhook secret that exactly matches the hash configured in Flutterwave. |
| `RESEND_API_KEY` | Optional server key for password resets and order updates. |
| `EMAIL_FROM` | Optional: a sender address on your verified Resend domain. |

Redeploy after adding or changing environment variables. On the first database-backed request, the application initializes its tables, adds missing catalogue entries and creates the initial administrator. Existing administrator passwords are not overwritten by later environment changes; use the account password screen to change a password.

The supplied Supabase database was initialized on 2 November 2026 with 89 catalogue records and the requested administrator identity. A supplied database URL does not automatically configure Vercel: the production project must have `DATABASE_URL` set and be redeployed. An existing administrator does not need `ADMIN_PASSWORD` to be set again. Password setup must use a short-lived, single-use reset link or the existing authenticated account flow; no initial password is stored in this repository.

Hosted initialization enables row-level security on the 21 application tables with no anonymous/public policies. The backend uses its server-only database role. `server/certs/supabase-ca.crt` is Supabase's public root certificate, obtained from the [provider's certificate download](https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt); it is not a private key. `server/postgres-config.js` requires certificate verification and removes conflicting URL SSL options. Update the certificate when Supabase rotates its CA. See [Supabase TLS guidance](https://supabase.com/docs/guides/database/psql).

Without a production database, browsing, product information and a device-local cart remain available. Daily visitor measurement and newsletter storage also require that database; they never fabricate totals or successful subscriptions. The server explicitly refuses registration, login and orders until persistent storage is configured. It never silently stores real customer records in a browser-only demo. `/admin/preview/` is an interactive, clearly labelled local preview. Its changes remain in that browser and never modify the live store. See [the administration guide](ADMIN_WORKSPACE.md).

## Flutterwave

1. Complete the Uganda merchant verification and enable **Card** and **Mobile Money Uganda** in Flutterwave under **Settings → Business Preferences → Payment Methods**. This covers Visa, MTN and Airtel in UGX.
2. Start with the Flutterwave v3 **test** secret key in a separate Vercel Preview environment with an isolated test database. The hosted page presents the mobile network choice. Test MTN, Airtel and a Visa test card, including a failed payment and the return to order tracking.
3. Configure the production webhook at `https://london-tech.vercel.app/api/payments/webhook/`. Keep the final slash and enable Flutterwave webhook retries. Use the same randomly generated secret hash in Flutterwave and in Vercel’s production `FLW_SECRET_HASH`.
4. Save the approved **live** Flutterwave v3 secret key as production `FLW_SECRET_KEY` in **Vercel → London Tech → Settings → Environment Variables**, then redeploy. Keep both values server-side. Production checkout requires both settings and a live key. Test keys can run on Preview and local development.

Checkout creates an order with a server-calculated amount. The customer is redirected to Flutterwave; card details and mobile money PINs are never collected by London Tech. Both the return route and signed webhook call Flutterwave’s transaction verification endpoint. Reference, currency, amount and successful status must match before the order is marked paid. Duplicate verification does not deduct inventory twice.

See [Uganda merchant onboarding](https://flutterwave.com/rw/support/general/heres-all-you-need-to-know-about-operating-a-flutterwave-account-in-uganda), [payment methods](https://developer.flutterwave.com/docs/payment-methods), [transaction verification](https://developer.flutterwave.com/docs/transaction-verification) and [v3 webhooks](https://developer.flutterwave.com/v3.0.0/docs/webhooks).

## Order tracking and email

Open **Admin → Orders → an order → Update fulfillment**. Save a status, a customer-visible note or delivery tracking details. The customer sees the recorded milestones, Kampala timestamps, courier and tracking reference, and any estimated date or courier link you provide. The account page fetches the individual order and has a Refresh button. Staff updates and courier links supply the tracking information.

Order placement, verified payment, fulfillment changes and cancellation create separate email records. The record is saved with the order change, and the application attempts delivery after the change commits. **Customer emails** in the order editor shows the send state and lets staff retry an unsent email. Accepted by Resend means the provider accepted the request. After an uncertain send, allow two minutes for its claim to expire before reopening the log and retrying. Resend deduplicates retries with the same key within its [24-hour window](https://resend.com/docs/dashboard/emails/idempotency-keys).

To activate delivery, [verify a domain you own in Resend](https://resend.com/docs/dashboard/domains/introduction), create a sending key, and set `RESEND_API_KEY` and `EMAIL_FROM` in Vercel Production. Use a sender on the verified domain, such as `London Tech <orders@your-domain.example>`, and redeploy. The storefront can keep its Vercel address. New events send automatically once configured. Earlier pending records remain available for staff review and individual retry.

## Prices, stock and checkout

The owner approved the proposed UGX prices, regular prices and opening quantities as launch values on 1 November 2026. They appear by default across the storefront and order calculation. See [launch offers](LAUNCH_OFFERS.md) for the source records and one-time database migration. Merchant changes and numeric stock counts are preserved.

In admin → Products, maintain each product's configuration, selling price, regular price, condition, warranty and remaining stock. New products start with unconfirmed prices and inventory: check **This price is confirmed by the store**, enter a stock quantity and save when ready. Unconfirmed guide prices are excluded from structured-data offers and cannot be ordered until the store confirms them. Checkout orders directly at published, confirmed prices. Nationwide district delivery rates and overrides are editable in Settings; collection at the supplied store address is free. See [delivery and checkout](DELIVERY_AND_CHECKOUT.md) for the launch formula and operating instructions.

New checkout does not automatically turn an order into a quote request. Existing historical requests and quotes remain manageable in Admin → Orders. Those quotes retain their 24-hour validity and reserve stock for 30 minutes when online payment starts; the application does not claim to email a quote automatically.

Payment status is server-controlled. Cash orders deduct stock immediately and can be prepared before payment; an administrator must explicitly record receipt of the full cash amount before completion. Online orders require provider verification. Paid orders cannot be manually marked unpaid or cancelled; refunds require review and the appropriate cash or provider process. Admin → Checkout follow-up lists failed and unfinished authenticated checkouts for customer follow-up.

## Confirmed public information

- Phone: **0788341111**
- Second phone: **0709417273**
- Address: **Arua Park, NYUMBA KUBUA building, second floor, shop FN:19**
- Country / currency: **Uganda / UGX**
- Opening hours and public email remain unset until confirmed.

## Verification and limitations

Run `pnpm run typecheck`, `pnpm run build`, and `pnpm test`. Tests cover permissions, cross-origin writes, account persistence, authoritative totals, stock reservations, quotes, payment verification, idempotent settlement, image references, metadata and component rendering. Payment-provider responses are mocked in automated tests; no real charge is made. Browser screenshot review depends on the available desktop/browser connection.

The old, incompatible browser-local prototype and runtime are not used. The storefront, accounts, orders and admin share the same server catalogue. Database backups, merchant onboarding and operational delivery/return rules should be maintained through the store’s providers and confirmed business processes.
