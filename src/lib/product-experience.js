import productMedia from "../data/product-media.json" with { type: "json" }
import productDetails from "../data/product-details.json" with { type: "json" }
import { products } from "../data/catalog.js"
import { stockedPhoneDetails } from "../data/phone-stock.js"
import { productImagePlaceholder } from "./product-image.js"

const defaults = new Map(products.map((product) => [product.id, product]))
const changed = (a, b) => JSON.stringify(a) !== JSON.stringify(b)
const headlinePhoneSpecs = new Set([
  "Display", "Main display", "Chip", "Main camera", "Rear camera", "Rear cameras", "Battery",
])
const sourceOnlyGalleryIds = new Set([
  "aideepo-pro-pd100-power-bank",
  "aideepo-usbc-lightning-braided-cable",
  "anker-25w-compact-usbc-charger",
  "anker-20w-usbc-charger-black",
  "anker-maggo-10k-slim-black",
  "apple-20w-usbc-power-adapter-type-g",
  "apple-240w-usbc-charge-cable-2m",
  "apple-usbc-lightning-cable-1m",
  "oraimo-powerflow-b11-10000",
  "oraimo-traveler-15-20000",
  "vidvie-car-air-vent-gravity-holder",
  "excellent-p26-20000-power-bank",
  "fs09-phone-cooler",
  "samsung-45w-usbc-charger",
  "samsung-65w-three-port-charger",
  "usb-c-8a-charge-cable",
  "vidvie-cb4038c-usbc-cable",
  "vidvie-three-in-one-charging-cable",
  "flat-wire-2-to-2-charging-cable",
  "usb-a-to-usbc-1-5m-two-pack",
  "wireless-power-bank-20000-black",
  "kh-740-fascial-massage-gun",
  "shoulder-neck-wrap-massager",
  "le-falcone-majestic-edp-100ml",
  "malika-eau-de-parfum",
  "al-ezz-oud-hersh-mehwar-edp-100ml",
  "reyane-paris-for-men-edt-100ml",
  "le-chameau-save-elixir-edp-85ml",
  "banafa-sparky-white-edp-100ml",
  "smo-al-oud-edp-100ml",
  "le-chameau-arabia-haya-gift-set",
  "al-ezz-oud-hersh-55-edp-100ml",
  "lattafa-maahir-black-edition-edp-100ml",
  "lattafa-eclaire-edp-100ml",
  "afnan-9am-dive-edp-100ml",
  "lattafa-al-areeq-silver-edp-100ml",
  "emper-presidente-fragrance",
  "apple-20w-usbc-power-adapter-eu",
])

export function galleryImages(product) {
  const baseline = defaults.get(product.id)
  const edited =
    baseline &&
    (product.name !== baseline.name ||
      product.image !== baseline.image ||
      changed(product.gallery, baseline.gallery))
  const phone = edited ? null : stockedPhoneDetails.get(product.id)
  const researched = phone?.views || (edited ? [] : productMedia[product.id]) || []
  const featuredVideo = phone?.video || (!edited ? productDetails[product.id]?.video : null)
  const videos = (phone?.videos || (featuredVideo ? [featuredVideo] : [])).flatMap((videoInfo) => {
    const videoUrl = videoInfo.url
    const youtubeId = videoUrl?.match(
      /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/,
    )?.[1]
    const embedSrc = videoInfo.embedUrl || (youtubeId
      ? `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=1&playsinline=1&rel=0`
      : null)
    if (!videoUrl || (!embedSrc && !/\.mp4(?:[?#]|$)/i.test(videoUrl))) return []
    return [{
      type: "video",
      src: videoInfo.poster || researched[0]?.src || product.image,
      videoSrc: embedSrc ? null : videoUrl,
      embedSrc,
      alt: videoInfo.label || `Product video for ${product.name}`,
      preview: videoInfo.preview,
    }]
  })
  const existing = [product.image, ...(product.gallery || [])]
    .filter((src) => src && src !== productImagePlaceholder)
    // A generic stock photo is not an extra view of a specific device.
    .filter((src) => !researched.length || !src.includes("images.unsplash.com"))
    .map((src, i) => ({ src, alt: `${product.name} — product view ${i + 1}` }))
  // A curated set replaces legacy photos, which may be the same angle at a
  // different resolution. A single new view can still complement store photos.
  const images = researched.length && sourceOnlyGalleryIds.has(product.id)
    ? researched
    : researched.length >= 2
      ? researched
      : [...researched, ...existing]
  const gallery = [...videos, ...images]
  return gallery.filter(
    (image, index) =>
      gallery.findIndex(
        (other) => other.src === image.src && other.type === image.type &&
          other.videoSrc === image.videoSrc && other.embedSrc === image.embedSrc,
      ) === index,
  )
}

export function productInformation(product) {
  const baseline = defaults.get(product.id)
  const phone = stockedPhoneDetails.get(product.id)
  if (phone && product.name === phone.name) {
    const specifications = product.specifications || []
    return {
      description: product.description,
      highlights: specifications
        .filter(([label]) => headlinePhoneSpecs.has(label))
        .map(([title, body]) => ({ title, body })),
      specifications,
      sources: [{ label: `${phone.brand} product specifications`, url: phone.source }],
      guides: phone.guide ? [{ label: "iPhone user guide", url: phone.guide }] : [],
      promotion: phone.promotion,
      video: phone.video,
      modelReferences: phone.modelReferences,
    }
  }
  const researched =
    baseline && product.name !== baseline.name
      ? {}
      : productDetails[product.id] || {}
  const customSpecs =
    baseline && changed(product.specifications, baseline.specifications)
  const customDescription =
    baseline && product.description !== baseline.description
  // Checked model facts replace, rather than coexist with, unqualified legacy
  // claims. Merchant edits remain authoritative for the actual unit being sold.
  const specifications = customSpecs
    ? product.specifications
    : researched.specifications || product.specifications || []
  return {
    description:
      !customDescription && researched.highlights?.length
        ? researched.highlights
            .slice(0, 2)
            .map(({ body }) => body)
            .join(" ")
        : product.description,
    highlights: researched.highlights || [],
    specifications,
    sources: customSpecs ? [] : researched.sources || [],
    guides: researched.guides || [],
    video: researched.video,
  }
}

export function zoomOrigin(clientX, clientY, rect) {
  const percent = (point, start, size) =>
    Math.max(0, Math.min(100, size > 0 ? ((point - start) / size) * 100 : 50))
  return `${percent(clientX, rect.left, rect.width)}% ${percent(clientY, rect.top, rect.height)}%`
}

export function filterReviews(reviews, rating = "all", sort = "newest") {
  return reviews
    .filter((review) => rating === "all" || review.rating === Number(rating))
    .slice()
    .sort((a, b) =>
      sort === "highest"
        ? b.rating - a.rating
        : sort === "lowest"
          ? a.rating - b.rating
          : new Date(b.created_at) - new Date(a.created_at),
    )
}

export function buyingQuestions(product, settings, t = (phrase, { address } = {}) => address ? phrase.replace("{address}", address) : phrase) {
  const categoryQuestion = {
    mobiles: [
      "Will this phone work with my SIM?",
      "Confirm the exact regional model, SIM or eSIM support, network compatibility and unlocked status with our team before ordering.",
    ],
    laptops: [
      "Which memory and storage should I choose?",
      "Tell us the apps you use and your budget. We can help you compare the available memory, storage, operating system and ports for the listed model.",
    ],
    tablets: [
      "Does it support a keyboard, pen or mobile data?",
      "Compatibility depends on the generation and model. Confirm supported accessories and whether you need Wi-Fi or cellular before ordering.",
    ],
    audio: [
      "Will it work with my phone or computer?",
      "Check the connector, Bluetooth support and any app requirements for your device. Confirm the exact model with our team if you are unsure.",
    ],
    watches: [
      "Is this watch compatible with my phone?",
      "Phone and software requirements vary by model. Share your phone model so the team can confirm pairing, size and connectivity options.",
    ],
    gaming: [
      "Which console or platform is it compatible with?",
      "Confirm the console generation, platform, region and included accessories before buying a game, controller or console.",
    ],
    cameras: [
      "Which accessories are included?",
      "Confirm whether the listing is a body, lens kit or bundle, and check battery, charger, memory card and lens compatibility with the store.",
    ],
    accessories: [
      "Will this fit or charge my device?",
      "Share your exact device model so we can check the connector, fit, charging requirements and included cable before purchase.",
    ],
  }[product.category] || [
    "How do I choose the right option?",
    "Share what you need with the team so we can confirm the model, size, colour and configuration before you order.",
  ]
  return [
    categoryQuestion,
    [
      "What is the condition and warranty?",
      [
        t(product.condition || ""),
        t(product.warranty ||
          "Our team will confirm the condition and any applicable warranty for this item before payment."),
      ]
        .filter(Boolean)
        .join(". "),
    ],
    [
      "Is the displayed price final?",
      product.priceConfirmed && product.price != null
        ? "The displayed selling price applies to the listed configuration. Any delivery cost is shown or confirmed before payment."
        : "This is a guide price. Request this item and the store will confirm your configuration, stock and final total before you pay.",
    ],
    [
      "Can I collect my order from the shop?",
      t("Contact us to confirm collection at {address}. Please wait for the team to confirm availability and that your order is ready.", { address: t(settings.address) }),
    ],
  ]
}
