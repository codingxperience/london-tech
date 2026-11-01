import React from "react"
import {
  arabicMoney,
  offerMoney,
  productOffer,
  stockAvailability,
} from "../lib/offer-details.js"

export function StockAvailability({ product, demo = false, className = "" }) {
  const stock = stockAvailability(product, { demo })
  return (
    <div className={`offer-stock ${className}`} data-stock={stock.state}>
      <span className="offer-stock-dot" aria-hidden="true" />
      <span>
        <span className="offer-stock-label">{stock.label}</span>
        {stock.note && <small>{stock.note}</small>}
      </span>
    </div>
  )
}

export function ProductOffer({
  product,
  demo = false,
  showStock = true,
  showDiscountBadge = true,
  compact = false,
  className = "",
}) {
  const offer = productOffer(product, { demo })
  const arabicLabel =
    demo && offer.discounted
      ? "سعر تجريبي بعد الخصم"
      : offer.discounted
        ? "السعر بعد الخصم"
        : offer.guide
          ? "سعر إرشادي"
          : demo
            ? "سعر تجريبي"
            : "السعر"
  return (
    <div
      className={`product-offer${compact ? " compact" : ""} ${className}`}
      data-demo={demo || undefined}
    >
      {demo && <span className="offer-demo-label">Demo offer</span>}
      <div className="offer-price-line">
        <strong
          className={
            "offer-current-price" +
            (offer.price === null ? " request-price" : "")
          }
        >
          {offerMoney(offer.price)}
        </strong>
        {showDiscountBadge && offer.discounted && (
          <span
            className="offer-discount"
            aria-label={`${
              demo ? "Demo discount" : "Discount"
            }: ${offer.discountPercent} percent`}
          >
            −{offer.discountPercent}%
          </span>
        )}
      </div>
      {offer.originalPrice !== null && (
        <del
          className="offer-previous-price"
          aria-label={`${
            demo ? "Demo previous price" : "Previous price"
          }: ${offerMoney(offer.originalPrice)}`}
        >
          {offerMoney(offer.originalPrice)}
        </del>
      )}
      {offer.guide && (
        <small className="guide-label offer-guide-label">Guide price</small>
      )}
      <div className="offer-arabic" lang="ar" dir="rtl">
        {offer.price !== null && <span>{arabicLabel}: </span>}
        <bdi>{arabicMoney(offer.price)}</bdi>
      </div>
      {showStock && <StockAvailability product={product} demo={demo} />}
    </div>
  )
}
