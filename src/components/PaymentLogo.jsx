import React from "react"
import "../payment-logos.css"

const methods = {
  mtn: { name: "MTN Mobile Money", image: "mtn.svg" },
  airtel: { name: "Airtel Money", image: "airtel.png" },
  visa: { name: "Visa / card", image: "visa.png" },
}

export function PaymentLogo({ method, decorative = false }) {
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
  const brand = methods[method]
  return brand ? (
    <span className="payment-method-name">
      <PaymentLogo method={method} decorative />
      <span>{brand.name}</span>
    </span>
  ) : null
}
