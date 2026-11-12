export const productImagePlaceholder = "/assets/product-image-unavailable.svg"

export function showProductImageFallback(event) {
  const image = event.currentTarget
  if (image.getAttribute("src") !== productImagePlaceholder)
    image.src = productImagePlaceholder
}
