const englishDigits = new Intl.NumberFormat("en-UG", {
  maximumFractionDigits: 0,
})
const arabicDigits = new Intl.NumberFormat("ar-EG-u-nu-arab", {
  maximumFractionDigits: 0,
})

const validAmount = (value) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
const validStock = (value) => Number.isSafeInteger(value) && value >= 0

export const offerMoney = (value) =>
  validAmount(value) ? `UGX ${englishDigits.format(value)}` : "Price on request"
export const arabicMoney = (value) =>
  validAmount(value)
    ? `${arabicDigits.format(value)} شلن أوغندي`
    : "السعر عند الطلب"

export function productOffer(product) {
  const price = validAmount(product.price) ? product.price : null
  const originalPrice =
    product.priceConfirmed === true &&
    price !== null &&
    validAmount(product.comparePrice) &&
    product.comparePrice > price
      ? product.comparePrice
      : null
  const discountPercent =
    originalPrice !== null ? Math.round((1 - price / originalPrice) * 100) : 0
  return {
    price,
    originalPrice,
    discountPercent,
    discounted: discountPercent > 0,
    guide: price !== null && product.priceConfirmed !== true,
  }
}

export function stockAvailability(product) {
  const stock = product.stock
  const quantity = validStock(stock) ? stock : null
  if (quantity === null)
    return {
      quantity,
      state: "unknown",
      label: "Check availability",
      note: "Stock unconfirmed",
    }
  if (quantity === 0)
    return {
      quantity,
      state: "out",
      label: "Out of stock",
      note: "",
    }
  const count = englishDigits.format(quantity)
  return {
    quantity,
    state: quantity <= 5 ? "low" : "available",
    label: `${count} ${quantity === 1 ? "item" : "items"} left`,
    note: "",
  }
}
