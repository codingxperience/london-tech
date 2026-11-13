import originalCatalog from "./legacy-catalog.json" with { type: "json" }
import productMedia from "./product-media.json" with { type: "json" }
import catalogueCorrections from "./catalogue-corrections.json" with { type: "json" }
import launchOffers from "./launch-offers.json" with { type: "json" }
import { onRequestPhoneIds, stockedPhones, stockedPhoneDetails } from "./phone-stock.js"
import { stockroomProducts, verifiedInventory } from "./verified-inventory.js"

import { cataloguePriceDefaults, guidePrices, phoneGuidePrices } from "./prices.js"
import { formatShillings } from "../lib/number-format.js"

export const categories = [
  {
    id: "mobiles",
    name: "Phones",
    icon: "Smartphone",
    description: "Find your next everyday essential.",
  },

  {
    id: "tablets",
    name: "Tablets",
    icon: "Tablet",
    description: "Create, read and take it all with you.",
  },

  {
    id: "audio",
    name: "Audio",
    icon: "Headphones",
    description: "A little more music. A little less noise.",
  },

  {
    id: "wristwatches",
    name: "Wristwatches",
    icon: "Watch",
    description: "Explore watches for everyday wear.",
  },

  {
    id: "accessories",
    name: "Accessories",
    icon: "Cable",
    description: "The details that bring it together.",
  },

  {
    id: "perfumes",
    name: "Perfumes",
    icon: "PerfumeBottle",
    description: "Fragrance for every day and every occasion.",
  },
]

export const asset = (name) => "/assets/supplied/" + encodeURIComponent(name)

const suppliedOverrides = {
  "iphone-17-pro-max": [
    "IMG-18071447_m_jpeg_1.jpg.jpeg",
    "IMG-18071467_m_jpeg_1.jpg.jpeg",
    "IMG-18071477_m_jpeg_1_a38ec317-1ec9-42c3-b2ba-8658dc22ba83.jpg.jpeg",
    "IMG-18071487_m_jpeg_1.jpg.jpeg",
  ],

  "iphone-17-pro": [
    "IMG-18071477_m_jpeg_1_a38ec317-1ec9-42c3-b2ba-8658dc22ba83.jpg.jpeg",
    "IMG-18071497_m_jpeg_1.jpg.jpeg",
  ],

  "iphone-17": ["iphone-17_specs__bzlgip6v14mu_og.png"],

  "galaxy-s26-ultra": [
    "2674791.jpg.jpeg",
    "kv_group_Tablet.jpg.jpeg",
    "Samsung-Mobile-Galaxy-Unpacked-2026-Galaxy-S26-Series-Launch_main1.jpg.jpeg",
  ],

  "iphone-13-pro-max": [
    "iPhone_13_Pro_Max_Graphite_PDP_Image_Position-1A__GBEN_fbf33161-6c44-43db-b256-21caa357fdaa.jpg.jpeg",
    "iphone-13-pro-max-family-select__68596.1632232234.1280.1280__89681.1632232296.jpg.jpeg",
  ],
}

const additions = [
  [
    "iphone-13-pro-max",
    "mobiles",
    "iPhone 13 Pro Max",
    "Apple",
    "A large-screen iPhone from the Pro family. Compare the listed configuration, condition and included accessories before ordering.",
    ["Display", "6.7-inch"],
    ["Processor", "A15 Bionic"],
  ],

  [
    "iphone-air",
    "mobiles",
    "iPhone Air",
    "Apple",
    "A slim iPhone design with a distinctive profile. Choose your preferred configuration and confirm availability with the store.",
    ["Category", "Smartphone"],
    ["Brand", "Apple"],
  ],

  [
    "galaxy-s25-ultra",
    "mobiles",
    "Samsung Galaxy S25 Ultra",
    "Samsung",
    "A Galaxy Ultra smartphone for photography, productivity and entertainment, with integrated S Pen support.",
    ["Series", "Galaxy S25"],
    ["Feature", "Integrated S Pen"],
  ],

  [
    "galaxy-a16",
    "mobiles",
    "Samsung Galaxy A16 5G",
    "Samsung",
    "An everyday Galaxy smartphone with 5G connectivity. Review the available memory, storage and colour before purchase.",
    ["Connectivity", "5G"],
    ["Series", "Galaxy A"],
  ],

  [
    "honor-x6b",
    "mobiles",
    "HONOR X6b",
    "HONOR",
    "An accessible HONOR smartphone for everyday calls, messaging and entertainment.",
    ["Series", "HONOR X"],
    ["Category", "Smartphone"],
  ],

  [
    "honor-x9b",
    "mobiles",
    "HONOR X9b",
    "HONOR",
    "A curved-display HONOR smartphone with a distinctive circular camera design.",
    ["Series", "HONOR X"],
    ["Category", "Smartphone"],
  ],

  [
    "infinix-smart-10-plus",
    "mobiles",
    "Infinix SMART 10 Plus",
    "Infinix",
    "An Infinix SMART series phone for everyday communication and entertainment.",
    ["Series", "SMART 10 Plus"],
    ["Category", "Smartphone"],
  ],

  [
    "infinix-smart-9",
    "mobiles",
    "Infinix SMART 9",
    "Infinix",
    "An everyday smartphone in the Infinix SMART range. Ask about the configuration that suits your needs.",
    ["Series", "SMART 9"],
    ["Category", "Smartphone"],
  ],

  [
    "redmi-13c",
    "mobiles",
    "Redmi 13C",
    "Xiaomi",
    "A Redmi everyday smartphone with a choice of colourways. Compare available storage and memory configurations.",
    ["Brand", "Xiaomi Redmi"],
    ["Category", "Smartphone"],
  ],

  [
    "soundcore-party-speaker",
    "audio",
    "Soundcore party speaker",
    "Soundcore",
    "A portable speaker with a carry handle and illuminated design. Confirm the exact model and specifications with the store.",
    ["Category", "Portable speaker"],
    ["Model details", "Confirm with store"],
  ],

  [
    "green-lion-usbc-cable",
    "accessories",
    "Green Lion Transparent USB-C Cable",
    "Green Lion",
    "A USB-C to USB-C charging cable. Confirm device compatibility and cable length before ordering.",
    ["Connectors", "USB-C to USB-C"],
    ["Colour shown", "Black"],
  ],

  [
    "dji-pocket-camera",
    "cameras",
    "DJI Osmo Pocket camera",
    "DJI",
    "A compact handheld camera with an integrated gimbal. Confirm the exact generation and package contents before ordering.",
    ["Category", "Handheld gimbal camera"],
    ["Package", "Confirm with store"],
  ],
].map(([id, cat, name, brand, blurb, ...specs]) => ({
  id,
  cat,
  name,
  brand,
  blurb,
  specs,
}))

const additionImages = {
  "iphone-air": ["iphone_17_Air_color.jpg.jpeg"],
  "galaxy-s25-ultra": ["samsung-galaxy-s25-ultra-5g-512gb.jpg.jpeg"],

  "galaxy-a16": ["ae-feature-galaxy-a16-5g-sm-a166-544054223.jpeg"],
  "honor-x6b": ["honor-x6b-purple-spec.png"],

  "honor-x9b": ["honor-x9b-spec-black.png"],
  "infinix-smart-10-plus": ["infinix-smart-10-plus-2-Inovi.jpg.jpeg"],

  "infinix-smart-9": ["infinix-smart-9-wallpapers.jpg.jpeg"],
  "redmi-13c": ["xiaomi-redmi-13c-2.jpg.jpeg"],

  "soundcore-party-speaker": [
    "a3390h11-soundcore-original-imaftqbpyfrurxnv.jpeg",
  ],

  "green-lion-usbc-cable": [
    "Green%20Lion%20Transparent%20Cable%20USB-C%20to%20USB-C%20-%20Black.jpeg",
  ],

  "dji-pocket-camera": ["dji-osmo-pocket-4-standard-combo.jpg.jpeg"],
}

const currentStoreItems = [
  {
    id: "iphone-18-pro-max",
    cat: "mobiles",
    name: "iPhone 18 Pro Max 256GB",
    brand: "Apple",
    blurb:
      "Explore the iPhone Pro Max collection. Confirm the exact model, capacity, condition and included accessories with London Tech.",
    img: "/assets/current/iphone-18-pro.png",
    specs: [
      ["Storage shown", "256GB"],
      ["Category", "Smartphone"],
    ],
  },

  {
    id: "iphone-18-pro-max-burgundy",
    cat: "mobiles",
    name: "iPhone 18 Pro Max Burgundy",
    brand: "Apple",
    blurb:
      "The Burgundy colourway in the iPhone Pro Max collection. Review the selected capacity and configuration before purchase.",
    img: "/assets/current/iphone-18-burgundy.jpg",
    specs: [
      ["Colour shown", "Burgundy"],
      ["Category", "Smartphone"],
    ],
  },

  {
    id: "samsung-galaxy-tablet",
    cat: "tablets",
    name: "Samsung Galaxy Tablet",
    brand: "Samsung",
    blurb:
      "Galaxy tablets for work, entertainment and everyday browsing. Ask about the exact model, screen size and connectivity options.",
    img: "/assets/current/galaxy-tablets.jpg",
    specs: [
      ["Family", "Samsung Galaxy tablets"],
      ["Configuration", "Confirm model and capacity"],
    ],
  },

  {
    id: "apple-ipad-pro",
    cat: "tablets",
    name: "Apple iPad Pro",
    brand: "Apple",
    blurb:
      "Explore the iPad Pro collection for creative work, entertainment and everyday productivity. Confirm generation, capacity and connectivity before ordering.",
    img: "/assets/current/ipad-pro.png",
    specs: [
      ["Family", "Apple iPad Pro"],
      ["Configuration", "Confirm generation and capacity"],
    ],
  },

  {
    id: "soundcore-wireless-earbuds",
    cat: "audio",
    name: "Soundcore Wireless Audio",
    brand: "Soundcore",
    blurb:
      "Discover Soundcore audio. The supplied photo is a reference; ask the store to confirm the exact speaker or earbuds model and package.",
    img: "/assets/current/soundcore-earbuds.jpeg",
    specs: [
      ["Brand", "Soundcore"],
      ["Model", "Confirm with store"],
    ],
  },

  {
    id: "apple-watch-series",
    cat: "watches",
    name: "Apple Watch Series",
    brand: "Apple",
    blurb:
      "Explore Apple Watch options. Confirm the generation, case size, connectivity and strap included in your order.",
    img: "/assets/current/apple-watch.jpeg",
    specs: [
      ["Family", "Apple Watch"],
      ["Configuration", "Confirm generation, size and strap"],
    ],
  },
]

const brandOf = (p) =>
  p.brand ||
  (/iphone|ipad|macbook|airpods|apple watch/i.test(p.name)
    ? "Apple"
    : /galaxy/i.test(p.name)
      ? "Samsung"
      : p.name.split(" ")[0])

const pathOf = (url) =>
  /^https?:/.test(url) || url.startsWith("/") ? url : "/" + url

// Historical tuples are retained only for guarded repairs of untouched seed rows.
export const legacyProducts = [
  ...currentStoreItems,
  ...originalCatalog,
  ...additions,
].map((p, i) => {
  const supplied = suppliedOverrides[p.id] || additionImages[p.id]

  const gallery = supplied
    ? supplied.map(asset)
    : [...new Set([p.img, ...(p.gallery || [])].filter(Boolean))].map(pathOf)

  return {
    id: p.id,
    name: p.name,
    category: p.cat,
    brand: brandOf(p),
    sku: "LT-" + String(i + 1).padStart(4, "0"),

    description: p.blurb,
    gallery,
    image: gallery[0],
    specifications: p.specs || [],

    price: guidePrices[p.id] ?? null,
    priceConfirmed: false,
    comparePrice: null,
    stock: null,
    active: true,
    featured: !!p.spotlight || i < 5,

    condition: "Confirm with store",
    warranty: "",
    inTheBox: "",
    delivery: "",

    options: [],
    colors: [],
    tags: p.tag ? [p.tag] : [],
    createdAt: "2026-10-30T00:00:00Z",
  }
})

export const approvedProducts = legacyProducts.map((product) => {
  const media = productMedia[product.id] || []
  return {
    ...product,
    ...catalogueCorrections[product.id],
    ...launchOffers[product.id],
    ...(media.length
      ? {
          image: media[0].src,
          gallery: media.map((image) => image.src),
        }
      : {}),
  }
})

const previousPhones = new Map(
  approvedProducts.filter(({ category }) => category === "mobiles").map((p) => [p.id, p]),
)
export const retiredPhoneSkus = Object.fromEntries(
  [...previousPhones.values()]
    .filter(({ id }) => !stockedPhoneDetails.has(id))
    .map(({ id, sku }) => [id, sku]),
)

const phoneSkus = {
  "galaxy-s24": "LT-PHONE-011",
  "galaxy-s24-ultra": "LT-PHONE-012",
  "iphone-14-pro-max": "LT-PHONE-013",
  "honor-x9e-pro": "LT-PHONE-015",
  "iphone-duo": "LT-PHONE-014",
  "iphone-17-pro-max-cosmic-orange-512gb": "LT-PHONE-001",
  "iphone-16-pro-max-desert-titanium-512gb": "LT-PHONE-002",
  "iphone-15-pro-max-natural-titanium-256gb": "LT-PHONE-003",
  "galaxy-a57-5g": "LT-PHONE-004",
  "samsung-galaxy-a16": "LT-PHONE-005",
  "galaxy-a17": "LT-PHONE-006",
  "galaxy-a07": "LT-PHONE-007",
  "honor-x9d-5g": "LT-PHONE-008",
  "honor-x9c-5g": "LT-PHONE-009",
  "honor-600-lite-5g": "LT-PHONE-010",
}

export const phoneProducts = stockedPhones.map(({ id }) => {
  const { brand, name, description, specifications, mediaNote, inTheBox, views } =
    stockedPhoneDetails.get(id)
  const previous = previousPhones.get(id)
  return {
    price: phoneGuidePrices[id] ?? null,
    priceConfirmed: false,
    comparePrice: null,
    stock: null,
    featured: false,
    condition: "Confirm with store",
    warranty: "",
    delivery: "",
    options: [],
    colors: [],
    tags: [],
    createdAt: "2026-11-11T00:00:00Z",
    sku: phoneSkus[id],
    ...previous,
    ...(onRequestPhoneIds.has(id)
      ? { stock: null, priceConfirmed: false, comparePrice: null }
      : {}),
    id,
    brand,
    name,
    description,
    specifications,
    category: "mobiles",
    updatedAt: "2026-11-11T00:00:00Z",
    mediaNote: mediaNote || "",
    inTheBox: inTheBox || "",
    active: true,
    image: views[0].src,
    gallery: views.map(({ src }) => src),
  }
})

const knitCaseId = "black-knit-magnetic-case-iphone-17-pro-18-pro"
const knitCaseGallery = productMedia[knitCaseId].map(({ src }) => src)

export const caseProducts = [
  {
    id: knitCaseId,
    sku: "LT-CASE-001",
    name: "Black Knit Magnetic Case for iPhone 17 Pro / 18 Pro",
    category: "accessories",
    brand: "",
    description:
      "A black case with a textured knit finish, a raised camera surround and a built-in magnetic ring. Sized for the 6.3-inch iPhone 17 Pro and iPhone 18 Pro.",
    specifications: [
      ["Fits", "iPhone 17 Pro and iPhone 18 Pro (6.3-inch)"],
      ["Colour", "Black"],
      ["Finish", "Textured knit pattern"],
      ["Material", "TPU"],
      ["Attachment", "Integrated magnetic ring"],
    ],
    image: knitCaseGallery[0],
    gallery: knitCaseGallery,
    mediaNote: "Supplier photos show the black case. Phone sold separately.",
    inTheBox: "One black magnetic case",
    price: null,
    priceConfirmed: false,
    comparePrice: null,
    stock: null,
    active: true,
    featured: false,
    condition: "Confirm with store",
    warranty: "",
    delivery: "",
    options: [],
    colors: [],
    tags: [],
    createdAt: "2026-11-12T00:00:00Z",
  },
]

export const products = [
  ...phoneProducts,
  ...caseProducts,
  ...verifiedInventory,
  ...stockroomProducts,
].map((product) => {
  const price = cataloguePriceDefaults[product.id]
  if (price == null || (product.price != null && product.price !== price)) return product
  return { ...product, price, priceConfirmed: true }
})

export const storeDefaults = {
  name: "London Tech",
  tagline: "London Technology Store",
  country: "Uganda",
  currency: "UGX",

  phone: "0788341111",
  phoneAlt: "0709417273",
  email: "",
  address: "Arua Park, NYUMBA KUBUA building, second floor, shop FN:19",
  hours: "",
  whatsapp: "",
  socials: {
    facebook: "",
    x: "",
    tiktok: "https://www.tiktok.com/@londontech.ug",
    instagram: "",
    snapchat: "",
  },
  deliveryFee: null,

  about:
    "From our shop in Arua Park, Kampala, we bring together phones, audio, watches and everyday technology. Take a closer look online, speak with our team and visit the store to find what works for you. Quality and trust guide the way we serve our customers.",

  returns:
    "Return eligibility, timelines and any applicable warranty are confirmed for each product before purchase. Contact the store with your order reference for help.",

  delivery:
    "Delivery availability, collection arrangements and any applicable fees are confirmed by the store. Check the final order summary before paying.",
}

export const categoryName = (id) =>
  categories.find((c) => c.id === id)?.name || "Technology"

export const money = formatShillings

export const productPath = (p) => "/products/" + encodeURIComponent(p.id) + "/"
