import React from "react"
import { PaymentLogo } from "./PaymentLogo.jsx"
import { useLocale } from "../lib/locale.jsx"

export function PaymentMarks() {
  const { t } = useLocale()
  return (
    <div
      className="payment-marks"
      aria-label={t("Payment methods: cash on delivery, MTN Mobile Money, Airtel Money and Visa")}
    >
      {["cod", "mtn", "airtel", "visa"].map((method) => (
        <PaymentLogo key={method} method={method} />
      ))}
    </div>
  )
}
