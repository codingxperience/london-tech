import { legacyProducts, products } from "../data/catalog.js"
import supersededMedia from "../data/superseded-product-media.json" with { type: "json" }
import { productImagePlaceholder } from "./product-image.js"

const before = new Map(legacyProducts.map((product) => [product.id, product]))
const after = new Map(products.map((product) => [product.id, product]))
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right)

const stockroomPhotoReplacements = new Map()
for (const { id, gallery } of products) {
  const replacements = new Map()
  for (const src of gallery || []) {
    const match = src.match(/^\/assets\/stockroom\/white\/([^/]+)-white(?:-v(\d+))?\.jpg$/)
    if (!match) continue
    const [, stem, revision] = match
    replacements.set(`/assets/stockroom/${stem}.jpeg`, src)
    if (revision) replacements.set(`/assets/stockroom/white/${stem}-white.jpg`, src)
    if (Number(revision) > 2)
      replacements.set(`/assets/stockroom/white/${stem}-white-v2.jpg`, src)
  }
  if (replacements.size) stockroomPhotoReplacements.set(id, replacements)
}

export const repairableProductIds = [...new Set([
  ...before.keys(), ...Object.keys(supersededMedia), ...stockroomPhotoReplacements.keys(),
])]

export function repairCatalogueImage(id, src) {
  const whitePhoto = stockroomPhotoReplacements.get(id)?.get(src)
  if (whitePhoto) return whitePhoto
  if (supersededMedia[id]?.includes(src))
    return after.get(id)?.image || productImagePlaceholder
  return src || productImagePlaceholder
}

/** Repair only the repository's known seed media; actual merchant edits win. */
export function repairCatalogueMedia(product) {
  const replacements = stockroomPhotoReplacements.get(product.id)
  if (replacements) {
    const image = replacements.get(product.image) ?? product.image
    const gallery = product.gallery?.map((src) => replacements.get(src) ?? src)
    if (image !== product.image || gallery?.some((src, index) => src !== product.gallery[index]))
      return { ...product, image, gallery }
  }
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
