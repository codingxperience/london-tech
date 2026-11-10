const fields = {
  name: "Product name", sku: "SKU", category: "Category", brand: "Brand",
  vendorId: "Supplier", price: "Selling price", comparePrice: "Regular price",
  priceConfirmed: "Price confirmed", stock: "Stock quantity", active: "Store visibility",
  featured: "Spotlight", condition: "Condition", description: "Description",
  specifications: "Specifications", options: "Configurations", colors: "Colours",
  tags: "Tags", mediaNote: "Photo note", warranty: "Warranty",
  inTheBox: "Box contents", delivery: "Delivery notes", gallery: "Photos",
}

const numbers = new Intl.NumberFormat("en-UG")

function displayValue(key, value) {
  if (key === "stock" && value == null) return "Unconfirmed"
  if (key === "active") return value ? "Published" : "Draft"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (key === "gallery") return (value?.length || 0) + " photos"
  if (value == null || value === "") return "—"
  if (key === "price" || key === "comparePrice") return "UGX " + numbers.format(value)
  const copy = Array.isArray(value)
    ? value.map((entry) => Array.isArray(entry) ? entry.join(": ") : entry).join(", ")
    : String(value)
  return copy.length > 180 ? copy.slice(0, 177) + "…" : copy || "—"
}

export function productHistory(previous, product) {
  const changes = []
  for (const [key, field] of Object.entries(fields)) {
    if (!previous && !["price", "stock", "active", "gallery"].includes(key))
      continue
    const before = previous?.[key], after = product[key]
    if (previous && JSON.stringify(before ?? null) === JSON.stringify(after ?? null))
      continue
    const from = previous ? displayValue(key, before) : "—"
    let to = displayValue(key, after)
    if (key === "gallery" && from === to)
      to += previous.image !== product.image ? " · cover changed" : " · updated"
    changes.push({ field, before: from, after: to })
  }
  if (previous && previous.image !== product.image && !changes.some(({ field }) => field === "Photos"))
    changes.push({ field: "Cover photo", before: "Previous photo", after: "Updated photo" })
  return { id: product.id, name: product.name, changes }
}
