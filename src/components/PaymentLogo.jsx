import React from "react"
import { useLocale } from "../lib/locale.jsx"
import "../payment-logos.css"

const methods = {
  mtn: { name: "MTN Mobile Money", image: "mtn.svg" },
  airtel: { name: "Airtel Money", image: "airtel.png" },
  visa: { name: "Visa / card", image: "visa.png" },
}

export function PaymentLogo({ method, decorative = false }) {
  const { t } = useLocale()
  if (method === "cod")
    return (
      <span
        className="payment-brand payment-brand-cod"
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : t("Cash on delivery")}
      >
        <svg
          className="cash-on-delivery-icon"
          viewBox="0 0 32 32"
          width="32"
          height="32"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M13 3h11M13 6h11M12 9h13v7H12z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="18.5" cy="12.5" r="1.6" fill="currentColor" />
          <path
            d="m4 22 4-4 5 1.5 4.2 1.2a1.7 1.7 0 0 1-.9 3.2L12 22.8m6.7-.5 5.8-3a1.9 1.9 0 0 1 1.9 3.3l-7.7 5a5 5 0 0 1-4.8.3L8.4 25"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="m2.5 23 3.2-3.2 5.2 6L7.7 29z" fill="currentColor" />
        </svg>
      </span>
    )
  const brand = methods[method]
  if (!brand) return null
  return (
    <span className={`payment-brand payment-brand-${method}`}>
      <img
        src={`/assets/payments/${brand.image}`}
        alt={decorative ? "" : t(brand.name)}
        width="80"
        height="36"
      />
    </span>
  )
}

export function PaymentMethod({ method }) {
  const { t } = useLocale()
  const brand =
    method === "cod"
      ? { name: "Cash on delivery / collection" }
      : methods[method]
  return brand ? (
    <span className="payment-method-name">
      <PaymentLogo method={method} decorative />
      <span>{t(brand.name)}</span>
    </span>
  ) : null
}
