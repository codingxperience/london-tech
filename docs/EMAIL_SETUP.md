# Email delivery and verification

London Tech supports the store's Gmail mailbox now, with a verified-domain Resend sender available later. The storefront can keep its Vercel address with either choice.

## Activate the Gmail sender

1. Sign in to the **Gmail account you control and have selected as the sender** in [Google Account Security](https://myaccount.google.com/security). Check the account at the top right.
2. Complete **2-Step Verification**. It must be enabled, rather than merely having a phone number or passkey saved.
3. Open [App Passwords](https://myaccount.google.com/apppasswords) directly. Reauthenticate with Google if asked. Create an app password named **London Tech**.
4. In the project's [Vercel environment settings](https://vercel.com/codingxperiences-projects/london-tech/settings/environment-variables), save it as **GMAIL_APP_PASSWORD**, type **Secret**, environment **Production**. Use the generated app password, not the regular mailbox password. Keep it out of chat.
5. Redeploy production after saving the secret.

The other settings are `EMAIL_PROVIDER=gmail` and `GMAIL_USER` set to your selected address. Gmail sends as **London Tech Stores** from that mailbox. The server removes spaces in Google's displayed app password. SMTP uses encrypted TLS with certificate verification; credentials never enter browser code.

If App Passwords is unavailable, confirm the selected account and complete 2-Step Verification. Google documents restrictions for accounts using only security keys for two-step verification, accounts managed by an organization, and accounts with Advanced Protection. See [Google's App Passwords help](https://support.google.com/accounts/answer/185833). Use an allowed sender account or the verified-domain alternative rather than weakening account protections.

## Customer experience

When a sender is configured, **Register / Sign in → email → Continue** sends a six-digit code. A spinner runs during the request. The code screen appears only after sender acceptance. Codes expire after ten minutes; resends unlock after sixty seconds. A new request replaces the previous challenge for that browser and address.

The six boxes support typing, pasting, keyboard navigation, Arabic digits and device code autofill. Customers can change their email. Errors remain on the form. Verification creates a normal session, preserves existing account roles and returns to the intended page. New customer accounts are created only after verification. Password sign-in and Google remain available; password registration cannot bypass enabled verification.

Until sender credentials are configured, the normal password flow remains available. The site never invents a successful email send or displays a secret code. Public configuration exposes readiness booleans only.

## Order notifications

Placement, verified payment, quotation, fulfillment, tracking changes and cancellation save an email event in the order transaction. Sending runs after commit, so an email outage cannot roll back an order or payment. Rendered snapshots preserve the original items, totals and status during retries.

Emails use the original logo, item details, UGX totals, delivery or pickup information, progress and an authenticated **View your order** link. Full street addresses stay inside the account. Test payments are clearly identified. Password resets use the same styling and short-lived, one-use links.

**Admin → Orders → order → Customer emails** shows pending, failed, accepted and unconfirmed sends. **Accepted for delivery** means sender acceptance, not confirmed inbox placement or reading. Normal failures can be retried. For ambiguous Gmail sends, check the mailbox's Sent folder before explicitly choosing **Review & resend**; SMTP cannot guarantee provider-side deduplication.

The authenticated `/api/internal/email-dispatch/` worker gives a daily fallback retry, using the private production `CRON_SECRET`. Each run selects at most six due events, with bounded concurrency, backoff and an eight-attempt cap. It never automatically retries uncertain Gmail sends or switches an uncertain event between providers. New events are attempted immediately. Review historical pending events when first activating the mailbox.

## Verified-domain alternative

[Verify a sending domain in Resend](https://resend.com/docs/dashboard/domains/introduction), then save `EMAIL_PROVIDER=resend`, `RESEND_API_KEY` and `EMAIL_FROM` in Vercel and redeploy. Resend retries preserve their idempotency key; uncertain automatic retries stay inside a conservative 23-hour window. Google developer sign-in keys do not authorize sending email.

## Verification and email clients

Tests cover browser binding, cooldowns, attempt limits, expiry, one-use sessions, concurrent requests, roles, resets, provider failures and retries. Local browser checks use a temporary in-memory database and fake email transport; no production customers or mail are touched.

Gmail controls its sender avatar, verification badge, code-copy cards and purchase summaries. HTML templates cannot force these enhancements. Confirm real inbox delivery with a customer-initiated code request after the Gmail secret is saved and deployed.
