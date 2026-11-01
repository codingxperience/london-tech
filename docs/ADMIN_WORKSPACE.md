# London Tech administration

The workspace follows the supplied dashboard reference: a fixed sidebar, a compact toolbar, four metric cards, sales and order charts, two progress cards, recent orders, revenue, a destination map and a product rail. Main controls use 13–14px or larger text; the layout switches to a navigation drawer and stacked charts on smaller screens. Tables scroll inside their panels instead of shrinking their contents.

## Available areas

- **Dashboard:** paid sales, orders, customers, inventory health, selectable 7-day / 30-day / 12-month charts, chart data and CSV export. Figures are derived from loaded order records. They are not visitor, profit or expense estimates.
- **Vendors:** create, edit, archive and delete supplier records; assign products in the product editor. Database references prevent deleting vendors while products use them.
- **Customers:** search registered customers, export the directory and inspect customer order histories.
- **Products / Inventory / Categories:** create and edit products, specifications, images, prices, quantities and supplier assignments; filter, paginate and export the catalogue. Payment verification rules remain enforced on the server.
- **Wishlist:** inspect saved products from authenticated accounts. Guest wishlists remain on their own devices.
- **Orders:** filter and export recent orders, review line items, confirm quotes and update fulfillment. Unverified payments cannot be manually marked paid.
- **Invoices:** printable order invoices from verified paid orders. Use Print / Save PDF; totals come from the order records.
- **History:** search and filter the latest 500 audit events by action and date, then export the results. Audit entries do not include conversation message bodies.
- **Settings:** store contact information, policies, delivery fee and integration status. Secret credentials stay in the hosting environment.
- **Messages:** authenticated in-app customer conversations, replies and resolution. Customers use Account → Messages; administrators use the workspace inbox. These actions do not send email or SMS.
- **Pages:** create plain-text pages with summaries, draft / published states and optional footer links. Slugs about, delivery, returns, help, privacy and terms override the corresponding default information pages when published. Custom pages use `/pages/{slug}/`. Removing a default-page override restores the default content. Raw HTML is never executed.
- **Language & region:** English interface, English / Arabic regional numerals for the header date and charts, time zone, product/order table page size and appearance. Preferences are saved in the browser. Product descriptions and customer messages retain their original language.
- **Login & security:** change the current account password using the existing authenticated service. The profile menu, theme toggle, workspace refresh, fullscreen control and notification links are functional.

## Preview and production

`/admin/preview/` is an interactive local preview. Example customers and orders are marked as preview data. Product values start with the approved launch catalogue. Changes to products, vendors, pages, settings, conversations and orders stay in `lt.admin.preview.v4` in that browser; no live writes, messages, payments or credential changes occur. The reset control clears this preview workspace. Actual published pages can be reviewed locally in a page preview dialog.

Production access remains session-based and administrator-only. Configure PostgreSQL, `ADMIN_EMAIL` and `ADMIN_PASSWORD` in Vercel as described in [commerce setup](COMMERCE_SETUP.md). New tables and indexes are created on database initialization. Supplier references, draft visibility, message ownership and mutation permissions are enforced by the API, not by hiding controls.

## Artwork and maps

Wordmarks use [the supplied logo’s traced vector artwork](WORDMARK.md), including an inverse variant for navy backgrounds. The dashboard world outline is generated from [Natural Earth country data](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson), which is [public domain](https://www.naturalearthdata.com/about/terms-of-use/). Uganda is highlighted; the destination figures come from paid order records.

Store Information embeds the [OpenStreetMap interactive export](https://wiki.openstreetmap.org/wiki/Export), framed around the Arua Park area. It is an area map, not a claim that the exact shop has been geolocated. The supplied NYUMBA KUBUA building, second-floor and FN:19 shop information remains visible. Arua Park’s location is cross-checked against [OpenStreetMap node 585262983](https://www.openstreetmap.org/node/585262983) and the [NEMA Arua Park location record](https://www.nema.go.ug/new_site/wp-content/uploads/2024/02/LIST-FOR-EATORS-AND-ENVIRONMENTAL-AUDITS-FOR-THE-MONTH-OF-DECEMBER.pdf). CSP permits frames only from `https://www.openstreetmap.org`.
