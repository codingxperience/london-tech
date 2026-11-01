const day = 86400000
const local = (date) => new Date(new Date(date).getTime() + 3 * 3600000)
const key = (date, monthly) =>
  local(date)
    .toISOString()
    .slice(0, monthly ? 7 : 10)

export function salesSeries(orders, period = "year", now = new Date()) {
  const today = local(now)
  const monthly = period === "year",
    count = monthly ? 12 : period === "month" ? 30 : 7
  const buckets = Array.from({ length: count }, (_, i) => {
    const date = monthly
      ? new Date(
          Date.UTC(
            today.getUTCFullYear(),
            today.getUTCMonth() - count + 1 + i,
            1,
            12,
          ),
        )
      : new Date(new Date(now).getTime() - (count - 1 - i) * day)
    return {
      key: key(date, monthly),
      label: date.toLocaleDateString(
        "en-UG",
        monthly
          ? { month: "short", timeZone: "Africa/Kampala" }
          : { day: "numeric", month: "short", timeZone: "Africa/Kampala" },
      ),
      sales: 0,
      total: 0,
      orders: 0,
      paid: 0,
      pending: 0,
    }
  })
  const byKey = new Map(buckets.map((b) => [b.key, b]))
  for (const order of orders) {
    if (
      !Number.isFinite(new Date(order.createdAt).getTime()) ||
      new Date(order.createdAt) > now
    )
      continue
    const bucket = byKey.get(key(order.createdAt, monthly))
    if (!bucket) continue
    bucket.orders++
    bucket.total += Number.isFinite(order.amount) ? order.amount : 0
    if (order.paymentStatus === "paid") {
      bucket.paid++
      bucket.sales += order.amount || 0
    } else if (order.status !== "cancelled") bucket.pending++
  }
  return buckets
}

export function bestSellers(products, orders) {
  const totals = new Map()
  for (const order of orders.filter((o) => o.paymentStatus === "paid"))
    for (const item of order.items) {
      const entry = totals.get(item.id) || { units: 0, revenue: 0 }
      entry.units += item.quantity
      entry.revenue += item.quantity * item.unitPrice
      totals.set(item.id, entry)
    }
  return products
    .map((p) => ({ ...p, ...(totals.get(p.id) || { units: 0, revenue: 0 }) }))
    .sort(
      (a, b) => b.units - a.units || Number(b.featured) - Number(a.featured),
    )
    .slice(0, 12)
}

export function destinations(orders) {
  const totals = new Map()
  for (const order of orders.filter((o) => o.paymentStatus === "paid")) {
    const place =
      order.fulfillment === "collection"
        ? "Store collection"
        : order.customer.district?.trim() || "Other delivery"
    totals.set(place, (totals.get(place) || 0) + (order.amount || 0))
  }
  return [...totals].sort((a, b) => b[1] - a[1])
}
