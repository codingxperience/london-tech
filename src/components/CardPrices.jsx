import React from "react"
import { useLocale } from "../lib/locale.jsx"
import { formatEstimatedDollars, formatShillings } from "../lib/number-format.js"
import { productOffer } from "../lib/offer-details.js"

export function CardPrices({ product }) {
  const { t } = useLocale()
  const { price } = productOffer(product)
  if (price === null)
    return <div className="product-card-prices"><strong>{t("Price on request")}</strong></div>

  return (
    <div className="product-card-prices">
      <strong dir="ltr">{formatShillings(price)}</strong>
      <span dir="ltr" title={t("Estimated price in US dollars")}>
        {formatEstimatedDollars(price)}
      </span>
    </div>
  )
}
