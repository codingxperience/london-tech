# Delivery, cash orders and checkout follow-up

The owner selected direct ordering at the displayed UGX prices and nationwide delivery on 2 November 2026. Cash on delivery or collection is the default payment choice. No merchant payment keys are needed for cash orders. MTN, Airtel and Visa continue through the existing Flutterwave integration when its environment variables and merchant account are ready.

## Delivery rates

Open **Admin → Settings → Delivery pricing**. The initial distance formula is:

- Base fee: **UGX 5,000**.
- Additional rate: **UGX 100 per estimated kilometre**.
- Minimum: **UGX 5,000**; maximum: **UGX 60,000**.
- Round the calculated fee up to the next **UGX 500**.
- Distance: straight-line distance from the Kampala district centre to the selected district centre, multiplied by **1.3** as a road allowance and rounded to a whole kilometre.

These are launch estimates authorized by the owner, not live courier quotations, GPS distances to a customer's door or turn-by-turn road routes. The 135-district dataset uses the published administrative boundaries dated 24 August 2020; city and district boundaries can change. Where needed, select the surrounding district and configure a known distance or fixed fee override. Store collection is free.

Every formula input is editable. Expand **District overrides and price preview**, choose a district and optionally enter a known distance or a fixed fee, including zero for free delivery. A fixed fee takes precedence over the formula, rounding, minimum and cap. Leave an override blank to use the formula. A flat nationwide fee is also available. Existing installations with an explicit legacy flat fee keep it until the owner changes the pricing method.

The customer sees delivery and the total before placing the order. The server calculates both again from the current catalogue and settings. If the displayed total has changed, checkout asks the customer to review it and submit again. Already placed orders keep their accepted amount.

Geography attribution: Uganda Bureau of Statistics boundaries, with WHO named in the distribution metadata, distributed by [OCHA/HDX](https://data.humdata.org/dataset/cod-ab-uga) and the [UNOSAT district service](https://unosat-geodrr.cern.ch/data/rest/services/Hosted/UGA_District_Boundary/FeatureServer/23), under **CC BY-IGO**. The local file stores district centroids derived from that service and the original source metadata. Kampala's district centroid is not the exact store location.

## Cash orders and inventory

Cash orders are immediately **Confirmed** with payment status **Cash due on receipt**. Their inventory is deducted in the same transaction as order creation, after accounting for active online-payment reservations. Duplicate submissions with the same checkout key return the existing order. Staff can prepare, mark ready and dispatch a cash order before receiving payment.

Open **Admin → Orders → the order**, confirm that the complete amount has actually been received, then choose **Record cash received**. This records an auditable receipt without deducting stock again. The order can only be marked **Completed** after payment is recorded. Online orders can only be marked paid through verified provider settlement; the cash action cannot bypass this rule.

An unpaid cash order can be cancelled while it is still Confirmed. Staff can cancel eligible unpaid orders in administration. Cancellation restores committed cash inventory once. Paid orders require a refund review rather than silently restoring stock or changing the payment result. Cash receipt and cancellation lock the order so both cannot succeed at the same time.

## Checkout follow-up

Open **Admin → Checkout follow-up**. Logged-in checkout records contain the customer's account name, email and entered phone, the items, displayed amount, chosen payment method, district and latest activity. Known order-validation and provider failures appear as failures. A started checkout or pending payment with no activity for 30 minutes appears as **Not completed**; inactivity is not evidence of a failed payment.

The default list shows open records needing attention. Staff can search, filter, export the loaded records, open the associated order, record an internal note and mark follow-up **Open**, **Contacted** or **Closed**. The view loads the latest 500 attempts and paginates them. Call and email links require a staff action; this feature sends no automatic messages. A successfully placed cash order is not an abandoned checkout.

Tracking begins when a signed-in customer opens checkout. It cannot recover anonymous visitors or a browser that never reached the server. Card details, mobile money PINs and passwords are not collected in the tracking payload. The API is authenticated, ownership-checked and rate-limited; recovery records and notes are available only to administrators. The privacy page explains this transactional use of customer details.

## Paystack status

Paystack cannot currently be activated for this Uganda/UGX store: Uganda is absent from its [supported business countries](https://support.paystack.com/en/articles/2130562), and UGX is absent from its [supported currencies](https://paystack.com/docs/api/#supported-currency), checked on 2 November 2026. No unusable Paystack button or currency conversion has been added. Reassess when Paystack officially supports the merchant's registration country and selling currency.

## Verification

Local PostgreSQL-compatible integration tests cover authoritative totals, delivery settings, cash receipt, cancellation, duplicate requests, overselling, concurrent cash receipt/cancellation, failure tracking, ownership and admin permissions. Browser-DOM tests cover cash checkout, the account transition and settings form persistence. Payment responses are mocked and no production purchase is made during automated verification.
