const englishDigits = new Intl.NumberFormat("en-UG", {
  maximumFractionDigits: 0,
})
const arabicDigits = new Intl.NumberFormat("ar-EG-u-nu-arab", {
  maximumFractionDigits: 0,
})

const validAmount = (value) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
const validStock = (value) => Number.isSafeInteger(value) && value >= 0
const fingerprint = (value) =>
  [...String(value || "item")].reduce(
    (hash, character) => (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0,
    7,
  )

export const offerMoney = (value) =>
  validAmount(value) ? `UGX ${englishDigits.format(value)}` : "Price on request"
export const arabicMoney = (value) =>
  validAmount(value)
    ? `${arabicDigits.format(value)} شلن أوغندي`
    : "السعر عند الطلب"

/** Display-only fixtures for the explicit offer-review mode. Never save these. */
export function demoOffer(product) {
  const price = validAmount(product.price) ? product.price : null
  const hash = fingerprint(product.id || product.name)
  const rate = [10, 12, 15, 18, 20, 25][hash % 6]
  const comparePrice =
    price > 0 ? Math.ceil(price / (1 - rate / 100) / 1000) * 1000 : null
  return {
    price,
    comparePrice,
    stock: validStock(product.stock) ? product.stock : 4 + (hash % 21),
    priceConfirmed: false,
  }
}

export function productOffer(product, { demo = false } = {}) {
  const display = demo ? demoOffer(product) : product
  const price = validAmount(display.price) ? display.price : null
  const originalPrice =
    (demo || product.priceConfirmed === true) &&
    price !== null &&
    validAmount(display.comparePrice) &&
    display.comparePrice > price
      ? display.comparePrice
      : null
  const discountPercent =
    originalPrice !== null ? Math.round((1 - price / originalPrice) * 100) : 0
  return {
    price,
    originalPrice,
    discountPercent,
    discounted: discountPercent > 0,
    guide: !demo && price !== null && product.priceConfirmed !== true,
    demo,
  }
}

export function stockAvailability(product, { demo = false } = {}) {
  const stock = demo ? demoOffer(product).stock : product.stock
  const quantity = validStock(stock) ? stock : null
  if (quantity === null)
    return {
      quantity,
      state: "unknown",
      label: "Check availability",
      note: "Stock unconfirmed",
      demo: false,
    }
  if (quantity === 0)
    return {
      quantity,
      state: "out",
      label: demo ? "Demo stock · out of stock" : "Out of stock",
      note: "",
      demo,
    }
  const count = englishDigits.format(quantity)
  return {
    quantity,
    state: quantity <= 5 ? "low" : "available",
    label: demo
      ? `Demo stock · ${count} left`
      : `${count} ${quantity === 1 ? "item" : "items"} left`,
    note: "",
    demo,
  }
}
