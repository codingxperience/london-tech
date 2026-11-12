import React from "react"
import { useLocale } from "../lib/locale.jsx"
import {
  formatArabicShillings,
  formatEstimatedDollars,
  formatShillings,
} from "../lib/number-format.js"
import { productOffer } from "../lib/offer-details.js"

export function CardPrices({ product, showDiscount = false }) {
  const { t, formatNumber, language } = useLocale()
  const offer = productOffer(product)
  const { price } = offer
  if (price === null)
    return <div className="product-card-prices"><strong>{t("Price on request")}</strong></div>

  return (
    <div className="product-card-prices">
      <strong dir="ltr">{formatShillings(price)}</strong>
      <span dir="ltr" title={t("Estimated equivalent in US dollars")}>
        {language === "ar"
          ? `${formatEstimatedDollars(price)} ${t("US dollars")}`
          : `US ${formatEstimatedDollars(price)}`}
      </span>
      {language === "ar" && (
        <span className="product-card-price-ar" dir="rtl" lang="ar">
          {formatArabicShillings(price)}
        </span>
      )}
      {showDiscount && offer.discounted && (
        <span className="card-sale-details">
          <del
            className="card-sale-previous"
            aria-label={t("Regular price: {price}", {
              price: formatShillings(offer.originalPrice),
            })}
          >
            {formatShillings(offer.originalPrice)}
          </del>
          <strong
            className="card-sale-discount"
            aria-label={t("Discount: {percent} percent", {
              percent: formatNumber(offer.discountPercent),
            })}
          >
            −{formatNumber(offer.discountPercent)}%
          </strong>
        </span>
      )}
    </div>
  )
}
