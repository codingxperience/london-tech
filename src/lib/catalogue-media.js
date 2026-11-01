import { legacyProducts, products } from "../data/catalog.js"

const before = new Map(legacyProducts.map((product) => [product.id, product]))
const after = new Map(products.map((product) => [product.id, product]))
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right)

/** Repair only the repository's known seed media; actual merchant edits win. */
export function repairCatalogueMedia(product) {
  const previous = before.get(product.id)
  const current = after.get(product.id)
  if (
    !previous ||
    !current ||
    product.name !== previous.name ||
    product.image !== previous.image ||
    !same(product.gallery, previous.gallery)
  )
    return product
  const repaired = {
    ...product,
    image: current.image,
    gallery: current.gallery,
  }
  // Restrict non-media corrections to values that the merchant has not edited.
  for (const field of [
    "name",
    "brand",
    "description",
    "specifications",
    "mediaNote",
  ]) {
    if (
      same(product[field], previous[field]) &&
      !same(current[field], previous[field])
    )
      repaired[field] = current[field]
  }
  return same(repaired, product) ? product : repaired
}
