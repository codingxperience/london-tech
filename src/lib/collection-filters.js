const sorts = ["featured", "name", "price-low", "price-high"]
const price = (value) =>
  value !== "" &&
  value != null &&
  Number.isFinite(Number(value)) &&
  Number(value) >= 0
    ? String(Number(value))
    : ""

export function readCollectionFilters(search = "") {
  const query = new URLSearchParams(search)
  return {
    query: query.get("q") || "",
    brands: [...new Set(query.getAll("brand").filter(Boolean))],
    min: price(query.get("min")),
    max: price(query.get("max")),
    inStock: query.get("stock") === "1",
    sort: sorts.includes(query.get("sort")) ? query.get("sort") : "featured",
    view: query.get("view") === "list" ? "list" : "grid",
    page: Math.max(1, Number.parseInt(query.get("page"), 10) || 1),
  }
}

export function collectionQuery(filters) {
  const query = new URLSearchParams()
  if (filters.query.trim()) query.set("q", filters.query.trim())
  for (const brand of filters.brands) query.append("brand", brand)
  if (filters.min !== "") query.set("min", filters.min)
  if (filters.max !== "") query.set("max", filters.max)
  if (filters.inStock) query.set("stock", "1")
  if (filters.sort !== "featured") query.set("sort", filters.sort)
  if (filters.view !== "grid") query.set("view", filters.view)
  if (filters.page > 1) query.set("page", String(filters.page))
  return query.size ? "?" + query.toString() : ""
}

export function scopeCollection(products, category) {
  const active = products.filter((product) => product.active !== false)
  if (category === "shop") return active
  if (category === "apple-products-london")
    return active.filter((p) => p.brand === "Apple")
  if (category === "iphones-london")
    return active.filter((p) => /iphone/i.test(p.name))
  if (category === "samsung-galaxy-ultra-london")
    return active.filter((p) => /Galaxy.*Ultra/i.test(p.name))
  if (category === "hot-deals")
    return active.filter(
      (p) => p.price != null && p.comparePrice != null && p.comparePrice > p.price,
    )
  return active.filter((p) => p.category === category)
}

export function selectCollection(products, filters, translate = (value) => value) {
  const query = filters.query.trim().toLowerCase()
  return products
    .filter(
      (product) =>
        (!query ||
          [product.name, translate(product.name), product.brand, product.sku]
            .some((value) => value?.toLowerCase().includes(query))) &&
        (!filters.brands.length || filters.brands.includes(product.brand)) &&
        (!filters.inStock || product.stock > 0) &&
        (filters.min === "" ||
          (product.price != null && product.price >= Number(filters.min))) &&
        (filters.max === "" ||
          (product.price != null && product.price <= Number(filters.max))),
    )
    .sort((a, b) =>
      filters.sort === "name"
        ? a.name.localeCompare(b.name)
        : filters.sort === "price-low"
          ? (a.price ?? Infinity) - (b.price ?? Infinity)
          : filters.sort === "price-high"
            ? (b.price ?? -Infinity) - (a.price ?? -Infinity)
            : Number(b.featured) - Number(a.featured),
    )
}
