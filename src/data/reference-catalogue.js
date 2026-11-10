import screenshotListings from "./screenshot-catalogue.json" with { type: "json" }

export const retiredReferenceSkus = {
  "phone-chargers-by-brand": "LT-ACC-003",
  "arabian-perfumes": "LT-LIFE-001",
  "feature-phone-batteries": "LT-ACC-004",
}

const listings = [
  {
    id: "multi-connector-usb-cable",
    sku: "LT-ACC-001",
    name: "Multi-Connector USB Charging Cable",
    category: "accessories",
    description:
      "Ask about multi-connector charging cables for USB-C, Micro-USB and Lightning devices. Confirm the connector combination, length and charging support before ordering.",
    specifications: [["Connector", "Confirm the plugs your devices use"]],
  },
  {
    id: "universal-usb-wall-charger",
    sku: "LT-ACC-002",
    name: "Universal USB Wall Charger",
    category: "accessories",
    description:
      "Ask about a USB wall charger for your phone or other compatible device. Confirm the wall plug, USB ports, power rating and whether a cable is included.",
    specifications: [["Compatibility", "Match the port, plug and power rating"]],
  },
  {
    id: "wired-headsets",
    sku: "LT-AUDIO-001",
    name: "Wired Headsets with Microphone",
    category: "audio",
    description:
      "Ask about wired headsets for calls and listening. Share your device model and whether it uses a 3.5 mm jack or USB so the store can check connector and microphone compatibility.",
    specifications: [["Connector", "Confirm the headset plug for your device"]],
  },
  {
    id: "bluetooth-hands-free-headsets",
    sku: "LT-AUDIO-002",
    name: "Bluetooth Hands-Free Headsets",
    category: "audio",
    description:
      "Ask about Bluetooth headsets for hands-free calls. Confirm the fit, charging connector and call controls for the model available at the store.",
    specifications: [["Connection", "Bluetooth"]],
  },
  {
    id: "phone-screen-guards",
    sku: "LT-ACC-005",
    name: "Phone Screen Guards & Protectors",
    category: "accessories",
    description:
      "Send your exact model to check for a screen guard for iPhone, Samsung, TECNO, itel, Infinix or another phone. Ask which protector finishes and fitting options are available for your model.",
    specifications: [["Fit", "Confirm the phone model and screen shape"]],
  },
  {
    id: "smartphone-cases",
    sku: "LT-ACC-006",
    name: "Smartphone Cases & Covers",
    category: "accessories",
    description:
      "Ask for a case for your exact iPhone, Samsung Galaxy or other smartphone model. Confirm the size, camera cutout, finish and colour with the store.",
    specifications: [["Fit", "Confirm the full model name, including any Plus, Pro or Ultra suffix"]],
  },
]

export const referenceProducts = [...listings, ...screenshotListings].map(({ id, ...listing }) => {
  const image = `/assets/catalogue-references/${id}.webp`
  return {
    id,
    brand: "",
    price: null,
    priceConfirmed: Number.isSafeInteger(listing.price) && listing.price > 0,
    comparePrice: null,
    stock: null,
    active: true,
    featured: false,
    condition: "Confirm with store",
    warranty: "",
    inTheBox: "",
    delivery: "",
    options: [],
    colors: [],
    tags: [],
    createdAt: "2026-11-10T00:00:00Z",
    mediaNote:
      "Reference photo. Confirm the exact item, packaging and compatibility with the store.",
    ...listing,
    image,
    gallery: [image],
  }
})
