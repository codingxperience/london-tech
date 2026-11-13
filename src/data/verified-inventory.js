import productMedia from "./product-media.json" with { type: "json" }
import stockroomInventory from "./stockroom-inventory.json" with { type: "json" }
import missingInventory from "./stockroom-missing.json" with { type: "json" }
import { productImagePlaceholder } from "../lib/product-image.js"

export const verifiedInventory = [
  {
    id: "samsung-galaxy-tab-a11-plus-5g-128gb-gray",
    sku: "LT-TAB-001",
    name: "Samsung Galaxy Tab A11+ 5G 128GB · Gray",
    category: "tablets",
    brand: "Samsung",
    price: 1200000,
    description:
      "An 11-inch tablet with a 90 Hz display, 5G connectivity and 128 GB of storage. The gray model has 6 GB of RAM and a microSD slot for extra storage.",
    specifications: [
      ["Model code", "SM-X236BZAAINS"],
      ["Display", "11-inch TFT, 1920 × 1200, up to 90 Hz"],
      ["Memory and storage", "6 GB RAM and 128 GB storage"],
      ["Connectivity", "5G and Wi-Fi"],
      ["Battery", "7,040 mAh typical, up to 25 W charging"],
    ],
    inTheBox: "Tablet, data cable, SIM eject tool and documentation. Travel adapter sold separately.",
  },
  {
    id: "bebe-tab-b88-master-red",
    sku: "LT-TAB-002",
    name: "Bébé-Tab B88 Master Kids Tablet · Red",
    category: "tablets",
    brand: "Bébé-Tab",
    price: 235000,
    description:
      "An 8-inch kids’ tablet with a red carry-handle case and fold-out feet for tabletop use. Check the available storage and included accessories with the store.",
    specifications: [
      ["Model", "B88 Master’s"],
      ["Display size", "8 inches"],
      ["Case", "Red carry-handle case with fold-out feet"],
    ],
  },
  {
    id: "bebe-tab-b2060-pro-max-blue",
    sku: "LT-TAB-003",
    name: "Bébé-Tab B2060 Pro Max Kids Tablet · Blue",
    category: "tablets",
    brand: "Bébé-Tab",
    price: 290000,
    description:
      "A 10-inch kids’ tablet with a blue-edged protective case and a rotating ring stand for tabletop use. Ask the store to confirm storage and the controller bundle.",
    specifications: [
      ["Model", "B2060 Pro Max"],
      ["Display size", "10 inches"],
      ["Case", "Blue-edged case with rotating ring stand"],
    ],
  },
  {
    id: "naviforce-nf8076-silver-black",
    sku: "LT-WATCH-001",
    name: "Naviforce NF8076 Chronograph · Silver / Black",
    category: "wristwatches",
    brand: "Naviforce",
    price: 150000,
    description:
      "A quartz chronograph with a black dial, three silver subdials and a stainless steel bracelet. The date window sits between the four and five o’clock markers.",
    specifications: [
      ["Model", "NF8076 · Silver / Black"],
      ["Case width", "42 mm"],
      ["Movement", "Quartz chronograph"],
      ["Bracelet", "Stainless steel"],
      ["Water resistance", "3 ATM, suitable for splashes"],
    ],
  },
  {
    id: "discover-tab-x1",
    sku: "LT-TAB-004",
    name: "Discover Tab X1 10-inch Tablet with Keyboard",
    category: "tablets",
    brand: "Discover",
    price: 340000,
    description:
      "A Discover Tab X1 tablet with a 10-inch IPS display and a keyboard. See the tablet set up with its keyboard and check the packaging for the model name. Ask the store to confirm the colour, usable storage, SIM compatibility and included accessories.",
    specifications: [
      ["Model", "Discover Tab X1"],
      ["Display on packaging", "10-inch IPS"],
      ["Memory on packaging", "16 GB / 512 GB as labelled; ask the store to verify"],
      ["Bundle", "Tablet, keyboard and protective case"],
    ],
  },
  {
    id: "skmei-1712-silver-white",
    sku: "LT-WATCH-002",
    name: "SKMEI 1712 Digital Watch · Silver / White",
    category: "wristwatches",
    brand: "SKMEI",
    price: 85000,
    description:
      "A silver digital watch with dark digits on a light display and a stainless steel bracelet. It includes dual time, a stopwatch, a countdown timer and a backlight.",
    specifications: [
      ["Model", "1712 · Silver / White"],
      ["Display", "Light LCD with dark digits"],
      ["Case", "45 mm diameter, 11 mm thick, zinc alloy"],
      ["Bracelet", "Stainless steel"],
      ["Functions", "Dual time, stopwatch, alarm, countdown, date, weekday and backlight"],
      ["Water resistance", "30 m manufacturer rating; avoid swimming and showering"],
    ],
  },
  {
    id: "naviforce-nf8042-silver-white",
    sku: "LT-WATCH-003",
    name: "Naviforce NF8042 Chronograph · Silver / White",
    category: "wristwatches",
    brand: "Naviforce",
    price: 160000,
    description:
      "A quartz chronograph with a textured silver-white dial and a stainless steel bracelet. The claw-shaped bezel frames three stopwatch subdials and an angled date window.",
    specifications: [
      ["Model", "NF8042 · S/W/S"],
      ["Case width", "43 mm"],
      ["Movement", "Quartz chronograph"],
      ["Crystal", "Hardened mineral glass"],
      ["Bracelet", "Stainless steel"],
      ["Water resistance", "3 ATM, suitable for splashes"],
    ],
  },
  ...[
    { id: "naviforce-nf9230-silver-white", sku: "LT-WATCH-004", dial: "White", code: "S/W/S" },
    { id: "naviforce-nf9230-silver-black", sku: "LT-WATCH-005", dial: "Black", code: "S/B/S" },
  ].map(({ id, sku, dial, code }) => ({
    id,
    sku,
    name: `Naviforce NF9230 Quartz Watch · Silver / ${dial}`,
    category: "wristwatches",
    brand: "Naviforce",
    price: 100000,
    description: `A ${dial.toLowerCase()} sunray dial with slim baton markers and a date window at three o’clock, paired with a silver stainless steel bracelet.`,
    specifications: [
      ["Model", `NF9230 · ${code}`],
      ["Case", "42 mm wide, 11 mm thick, zinc alloy"],
      ["Movement", "Quartz with date"],
      ["Crystal", "Hardened mineral glass"],
      ["Bracelet", "Stainless steel"],
      ["Water resistance", "3 ATM, suitable for splashes"],
    ],
  })),
  ...[
    { id: "naviforce-nf9248l-silver-brown", sku: "LT-WATCH-006", finish: "Silver / Brown", code: "S/B/DBN", strap: "Dark brown leather", dial: "black dial with a silver-tone case" },
    { id: "naviforce-nf9248l-black-green", sku: "LT-WATCH-007", finish: "Black / Green", code: "B/GN/B", strap: "Black leather", dial: "black dial with a green minute ring and orange markings" },
  ].map(({ id, sku, finish, code, strap, dial }) => ({
    id,
    sku,
    name: `Naviforce NF9248L Quartz Watch · ${finish}`,
    category: "wristwatches",
    brand: "Naviforce",
    price: 95000,
    description: `A ${dial}, a date window at three o’clock and a ${strap.toLowerCase()} strap. The outer track marks the minutes in five-minute steps.`,
    specifications: [
      ["Model", `NF9248L · ${code}`],
      ["Case", "46 mm wide, 12 mm thick"],
      ["Movement", "Quartz with date"],
      ["Strap", strap],
      ["Water resistance", "3 ATM, suitable for splashes"],
    ],
  })),
  {
    id: "naviforce-nf9226-black-rose-gold",
    sku: "LT-WATCH-008",
    name: "Naviforce NF9226 Quartz Watch · Black / Rose Gold",
    category: "wristwatches",
    brand: "Naviforce",
    price: 115000,
    description: "A black sunray dial with rose gold-tone hands, a matching crown and a date window at three o’clock. The angular black case meets a stainless steel bracelet.",
    specifications: [
      ["Model", "NF9226 · B/B/RG"],
      ["Movement", "Quartz with date"],
      ["Dial", "Black sunray with rose gold-tone hands and markers"],
      ["Bracelet", "Black stainless steel"],
      ["Water resistance", "3 ATM, suitable for splashes"],
    ],
  },
].map(withCatalogueDefaults)

export const stockroomProducts = [...stockroomInventory, ...missingInventory].map(withCatalogueDefaults)

function withCatalogueDefaults(product) {
  const gallery = (productMedia[product.id] || []).map(({ src }) => src)
  return {
    inTheBox: "",
    specifications: [],
    ...product,
    image: gallery[0] || productImagePlaceholder,
    gallery,
    priceConfirmed: product.priceConfirmed ?? (product.price != null),
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
  }
}
