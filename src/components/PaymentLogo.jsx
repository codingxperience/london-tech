import React from "react"
import { Banknote } from "lucide-react"
import "../payment-logos.css"

const methods = {
  mtn: { name: "MTN Mobile Money", image: "mtn.svg" },
  airtel: { name: "Airtel Money", image: "airtel.png" },
  visa: { name: "Visa / card", image: "visa.png" },
}

export function PaymentLogo({ method, decorative = false }) {
  if (method === "cod")
    return (
      <span
        className="payment-brand payment-brand-cod"
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : "Cash on delivery"}
      >
        <Banknote size={24} aria-hidden="true" />
        <span>Cash</span>
      </span>
    )
  const brand = methods[method]
  if (!brand) return null
  return (
    <span className={`payment-brand payment-brand-${method}`}>
      <img
        src={`/assets/payments/${brand.image}`}
        alt={decorative ? "" : brand.name}
        width="80"
        height="36"
      />
    </span>
  )
}

export function PaymentMethod({ method }) {
  const brand =
    method === "cod"
      ? { name: "Cash on delivery / collection" }
      : methods[method]
  return brand ? (
    <span className="payment-method-name">
      <PaymentLogo method={method} decorative />
      <span>{brand.name}</span>
    </span>
  ) : null
}
