import geography from "../data/delivery-districts.json" with { type: "json" }

export const deliveryDistricts = geography.districts
export const deliveryDefaults = {
  mode: "distance",
  baseFee: 5000,
  perKm: 100,
  minimumFee: 5000,
  maximumFee: 60000,
  rounding: 500,
  distanceMultiplier: 1.3,
  overrides: [],
}
const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+(district|city)$/, "")
export const findDeliveryDistrict = (value) =>
  deliveryDistricts.find(
    (d) => d.id === value || normalize(d.name) === normalize(value),
  )
export function deliveryRateSettings(settings = {}) {
  return {
    ...deliveryDefaults,
    ...(!settings.deliveryPricing && settings.deliveryFee != null
      ? { mode: "flat" }
      : {}),
    ...settings.deliveryPricing,
  }
}
export function calculateDelivery(settings = {}, districtName = "") {
  const rates = deliveryRateSettings(settings)
  if (rates.mode === "flat")
    return { fee: settings.deliveryFee ?? null, mode: "flat", distanceKm: null }
  const destination = findDeliveryDistrict(districtName)
  if (!destination)
    return {
      fee: null,
      mode: "distance",
      distanceKm: null,
      error: "Select your delivery district.",
    }
  const origin = deliveryDistricts.find((d) => d.name === "Kampala")
  const radians = (degrees) => (degrees * Math.PI) / 180
  const lat = radians(destination.latitude - origin.latitude),
    lon = radians(destination.longitude - origin.longitude)
  const a =
    Math.sin(lat / 2) ** 2 +
    Math.cos(radians(origin.latitude)) *
      Math.cos(radians(destination.latitude)) *
      Math.sin(lon / 2) ** 2
  const override = rates.overrides.find((o) => o.districtId === destination.id)
  const distanceKm =
    override?.distanceKm ??
    Math.round(
      6371 *
        2 *
        Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a))) *
        rates.distanceMultiplier,
    )
  const raw = override?.fee ?? rates.baseFee + distanceKm * rates.perKm
  const fee =
    override?.fee ??
    Math.max(
      rates.minimumFee,
      Math.min(
        rates.maximumFee,
        Math.ceil(raw / rates.rounding) * rates.rounding,
      ),
    )
  return {
    fee,
    distanceKm,
    mode: "distance",
    district: destination.name,
    districtId: destination.id,
  }
}
