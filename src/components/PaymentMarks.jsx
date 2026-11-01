import React from "react"
import { PaymentLogo } from "./PaymentLogo.jsx"

export function PaymentMarks() {
  return (
    <div
      className="payment-marks"
      aria-label="Payment methods: MTN Mobile Money, Airtel Money and Visa"
    >
      {["mtn", "airtel", "visa"].map((method) => (
        <PaymentLogo key={method} method={method} />
      ))}
    </div>
  )
}
