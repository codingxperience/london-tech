import { legacyProducts, products } from "../data/catalog.js"
import supersededMedia from "../data/superseded-product-media.json" with { type: "json" }
import { productImagePlaceholder } from "./product-image.js"

const before = new Map(legacyProducts.map((product) => [product.id, product]))
const after = new Map(products.map((product) => [product.id, product]))
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right)
export const repairableProductIds = [...new Set([...before.keys(), ...Object.keys(supersededMedia)])]

export function repairCatalogueImage(id, src) {
  if (supersededMedia[id]?.includes(src))
    return after.get(id)?.image || productImagePlaceholder
  return src || productImagePlaceholder
}

/** Repair only the repository's known seed media; actual merchant edits win. */
export function repairCatalogueMedia(product) {
  const previous = before.get(product.id)
  const current = after.get(product.id)
  const obsolete = supersededMedia[product.id]
  if (current && obsolete) {
    const gallery = product.gallery || []
    const outdatedHero = obsolete.includes(product.image)
    if (outdatedHero || gallery.some((src) => obsolete.includes(src))) {
      const photos = [...new Set(gallery.flatMap((src) =>
        obsolete.includes(src) ? current.gallery : [src],
      ))]
      const nextGallery = outdatedHero ? [...new Set([...current.gallery, ...photos])] : photos
      return {
        ...product,
        image: outdatedHero ? nextGallery[0] || productImagePlaceholder : product.image,
        gallery: nextGallery,
      }
    }
  }
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
