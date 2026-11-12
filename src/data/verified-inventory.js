import productMedia from "./product-media.json" with { type: "json" }

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
].map((product) => {
  const gallery = productMedia[product.id].map(({ src }) => src)
  return {
    inTheBox: "",
    ...product,
    image: gallery[0],
    gallery,
    priceConfirmed: true,
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
})
