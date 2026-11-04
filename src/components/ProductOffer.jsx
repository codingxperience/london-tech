import React from "react"
import { useLocale } from "../lib/locale.jsx"
import {
  arabicMoney,
  offerMoney,
  productOffer,
  stockAvailability,
} from "../lib/offer-details.js"

export function StockAvailability({ product, className = "" }) {
  const { t, formatNumber } = useLocale()
  const stock = stockAvailability(product)
  const label =
    stock.quantity > 0
      ? t(stock.quantity === 1 ? "{count} item left" : "{count} items left", {
          count: formatNumber(stock.quantity),
        })
      : t(stock.label)
  return (
    <div className={`offer-stock ${className}`} data-stock={stock.state}>
      <span className="offer-stock-dot" aria-hidden="true" />
      <span>
        <span className="offer-stock-label">{label}</span>
        {stock.note && <small>{t(stock.note)}</small>}
      </span>
    </div>
  )
}

export function ProductOffer({
  product,
  showStock = true,
  showDiscountBadge = true,
  compact = false,
  className = "",
}) {
  const { t, language, numberStyle, formatNumber } = useLocale()
  const offer = productOffer(product)
  const arabicLabel = offer.discounted
    ? "السعر بعد الخصم"
    : offer.guide
      ? "سعر إرشادي"
      : "السعر"
  return (
    <div className={`product-offer${compact ? " compact" : ""} ${className}`}>
      <div className="offer-price-line">
        <strong
          className={
            "offer-current-price" +
            (offer.price === null ? " request-price" : "")
          }
        >
          <bdi>{offerMoney(offer.price)}</bdi>
        </strong>
        {showDiscountBadge && offer.discounted && (
          <span
            className="offer-discount"
            aria-label={t("Discount: {percent} percent", {
              percent: formatNumber(offer.discountPercent),
            })}
          >
            −{formatNumber(offer.discountPercent)}%
          </span>
        )}
      </div>
      {offer.originalPrice !== null && (
        <del
          className="offer-previous-price"
          aria-label={t("Regular price: {price}", {
            price: offerMoney(offer.originalPrice),
          })}
        >
          {offerMoney(offer.originalPrice)}
        </del>
      )}
      {offer.guide && (
        <small className="guide-label offer-guide-label">
          {t("Guide price")}
        </small>
      )}
      {language === "en" && numberStyle === "latn" && (
        <div className="offer-arabic" lang="ar" dir="rtl">
          {offer.price !== null && <span>{arabicLabel}: </span>}
          <bdi>{arabicMoney(offer.price)}</bdi>
        </div>
      )}
      {showStock && <StockAvailability product={product} />}
    </div>
  )
}
