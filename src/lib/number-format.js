const english = new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 })
const arabic = new Intl.NumberFormat("ar-UG", {
  maximumFractionDigits: 0,
  numberingSystem: "arab",
})
const dollarDigits = {
  latn: new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
  arab: new Intl.NumberFormat("ar-UG-u-nu-arab", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
}
// Rounded display rate for 11 November 2026. Checkout is priced in UGX.
const shillingsPerDollar = 4100
let display = { language: "en", numberStyle: "latn" }

export function setNumberDisplay(preferences) {
  if (typeof window !== "undefined") display = preferences
}

export function displayNumber(value) {
  return (
    typeof window !== "undefined" && display.numberStyle === "arab"
      ? arabic
      : english
  ).format(value)
}

export function formatShillings(value) {
  if (value == null)
    return typeof window !== "undefined" && display.language === "ar"
      ? "السعر عند الطلب"
      : "Price on request"
  return "UGX " + displayNumber(value)
}

export function formatArabicShillings(value) {
  if (value == null) return "السعر عند الطلب"
  return arabic.format(value) + " شلن أوغندي"
}

export function formatEstimatedDollars(shillings) {
  const style = typeof window !== "undefined" && display.numberStyle === "arab"
    ? "arab"
    : "latn"
  return "$" + dollarDigits[style].format(shillings / shillingsPerDollar)
}
