const english = new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 })
const arabic = new Intl.NumberFormat("ar-UG", {
  maximumFractionDigits: 0,
  numberingSystem: "arab",
})
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
