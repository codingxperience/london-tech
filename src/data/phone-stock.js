import media from "./phone-stock-media.json" with { type: "json" }

const appleGuide = "https://support.apple.com/guide/iphone/welcome/ios"
const samsung = "https://www.samsung.com/"
const honor = "https://www.honor.com/"
const appleSpecs = (page) => "https://support.apple.com/" + page

const phone = (id, brand, name, source, description, specifications, options = {}) => ({
  id,
  brand,
  name,
  source,
  description,
  specifications,
  ...options,
})

const apple = (id, name, source, description, model, storage, finish, specs, sim) =>
  phone(id, "Apple", name, source, description, [
    ["Model number", model],
    ["Storage", storage],
    ["Finish", finish],
    ...specs,
    ...(sim ? [["SIM", sim]] : []),
  ], {
    guide: appleGuide,
    inTheBox: "Apple lists the phone and a " +
      (model === "A2643" ? "USB-C to Lightning cable" : "USB-C charge cable") +
      " in the original package. Ask the shop to confirm the contents and condition of this unit.",
  })

const iphone18 = [
  ["Display", "6.9-inch Super Retina XDR OLED with ProMotion up to 120 Hz"],
  ["Chip", "Apple A20 Pro"],
  ["Rear cameras", "48 MP main, ultra wide and telephoto"],
  ["Charging", "USB-C and MagSafe"],
]
const iphone17 = [
  ["Display", "6.9-inch Super Retina XDR OLED with ProMotion up to 120 Hz"],
  ["Chip", "Apple A19 Pro"],
  ["Rear cameras", "48 MP main, ultra wide and telephoto"],
  ["Front camera", "18 MP Center Stage"],
  ["Charging", "USB-C and MagSafe"],
]
const unidentifiedGalaxy = {
  mediaNote: "Samsung shows the LTE model in these photos. Confirm the store unit’s model code, network and storage before ordering.",
}

export const stockedPhones = [
  apple("iphone-18-pro-max", "iPhone 18 Pro Max 256GB · Glacier", appleSpecs("en-asia/148591"),
    "The Glacier iPhone 18 Pro Max pairs a 6.9-inch ProMotion display with the A20 Pro chip and three 48 MP rear cameras.",
    "A3716", "256 GB", "Glacier", iphone18, "eSIM required on this package"),
  apple("iphone-18-pro-max-burgundy", "iPhone 18 Pro Max 256GB · Burgundy", appleSpecs("en-asia/148591"),
    "The Burgundy iPhone 18 Pro Max has 256 GB of storage, a 6.9-inch ProMotion display and Apple’s A20 Pro chip.",
    "A3717", "256 GB", "Burgundy", iphone18, "Confirm SIM support for the regional model"),
  apple("iphone-17-pro-max", "iPhone 17 Pro Max 256GB · Silver", appleSpecs("en-us/125091"),
    "The Silver iPhone 17 Pro Max combines a large ProMotion display with a 48 MP Fusion camera system and an 18 MP Center Stage front camera.",
    "A3525", "256 GB", "Silver", iphone17, "eSIM required on this Japanese package"),
  apple("iphone-17-pro-max-cosmic-orange-512gb", "iPhone 17 Pro Max 512GB · Cosmic Orange", appleSpecs("en-hk/125091"),
    "The 512 GB Cosmic Orange iPhone 17 Pro Max gives you extra room for photos and video, with a 6.9-inch ProMotion display and A19 Pro.",
    "A3526", "512 GB", "Cosmic Orange", iphone17, "Confirm SIM support for the regional model"),
  apple("iphone-16-pro-max-desert-titanium-512gb", "iPhone 16 Pro Max 512GB · Desert Titanium", appleSpecs("en-us/121032"),
    "The Desert Titanium iPhone 16 Pro Max features Camera Control, a 5× telephoto lens and 512 GB of storage.",
    "A3297", "512 GB", "Desert Titanium", [
      ["Display", "6.9-inch Super Retina XDR OLED with ProMotion up to 120 Hz"],
      ["Chip", "Apple A18 Pro"],
      ["Rear cameras", "48 MP main, 48 MP ultra wide and 12 MP 5× telephoto"],
      ["Video", "Up to 4K Dolby Vision at 120 fps on the Fusion camera"],
      ["Charging", "USB-C and MagSafe"],
    ], "Confirm SIM support for the regional model"),
  apple("iphone-15-pro-max-natural-titanium-256gb", "iPhone 15 Pro Max 256GB · Natural Titanium", appleSpecs("en-us/111828"),
    "The Natural Titanium iPhone 15 Pro Max combines an A17 Pro chip, a customisable Action button and a 5× telephoto lens.",
    "A3108", "256 GB", "Natural Titanium", [
      ["Display", "6.7-inch Super Retina XDR OLED with ProMotion up to 120 Hz"],
      ["Chip", "Apple A17 Pro"],
      ["Rear cameras", "48 MP main, 12 MP ultra wide and 12 MP 5× telephoto"],
      ["Charging", "USB-C and MagSafe"],
    ], "Confirm SIM support for the regional model"),
  apple("iphone-13-pro-max", "iPhone 13 Pro Max 256GB · Graphite", appleSpecs("en-us/111870"),
    "The Graphite iPhone 13 Pro Max has a 6.7-inch ProMotion screen, an A15 Bionic chip and a triple camera system with 3× optical telephoto.",
    "A2643", "256 GB", "Graphite", [
      ["Display", "6.7-inch Super Retina XDR OLED with ProMotion up to 120 Hz"],
      ["Chip", "Apple A15 Bionic"],
      ["Rear cameras", "12 MP wide, ultra wide and 3× telephoto"],
      ["Charging", "Lightning and MagSafe"],
    ], "Confirm the model and SIM support in Settings before purchase"),
  phone("iphone-air", "Apple", "iPhone Air", "https://www.apple.com/iphone-air/specs/",
    "The iPhone Air has a 5.64 mm titanium body, a 6.5-inch ProMotion display and Apple’s A19 Pro chip.",
    [
      ["Display", "6.5-inch Super Retina XDR OLED, up to 120 Hz"],
      ["Chip", "Apple A19 Pro"],
      ["Rear camera", "48 MP Fusion Main"],
      ["Depth and weight", "5.64 mm and 165 g"],
      ["SIM", "eSIM; check your carrier’s compatibility"],
      ["Manufacturer finishes", "Space Black, Cloud White, Light Gold and Sky Blue"],
      ["Manufacturer capacities", "256 GB, 512 GB and 1 TB"],
      ["Store configuration", "Confirm the finish and storage with London Tech"],
    ], {
      guide: appleGuide,
      mediaNote: "Apple’s photos illustrate the design and finishes. Ask London Tech which configuration is available.",
      inTheBox: "Apple lists iPhone Air and a USB-C charge cable. The power adapter is sold separately.",
    }),
  phone("galaxy-z-fold8", "Samsung", "Samsung Galaxy Z Fold8",
    "https://news.samsung.com/global/samsung-galaxy-z-fold8-ultra-fold8-and-flip8foldables-perfected-for-every-way-of-living",
    "Samsung’s Galaxy Z Fold8 opens to a 7.6-inch AMOLED display and has two 50 MP rear cameras in a 201 g foldable body.",
    [
      ["Main display", "7.6-inch Dynamic AMOLED 2X, up to 120 Hz"],
      ["Cover display", "5.5-inch Dynamic AMOLED 2X, up to 120 Hz"],
      ["Chip", "Snapdragon 8 Elite Gen 5 for Galaxy"],
      ["Rear cameras", "50 MP wide with OIS and 50 MP ultra wide"],
      ["Battery", "4,800 mAh typical"],
      ["Connectivity", "5G and Wi-Fi 7"],
      ["Manufacturer finishes", "Lavender, Graphite, Cream and Pistachio"],
      ["Store configuration", "Confirm the finish, RAM and storage with London Tech"],
    ], { mediaNote: "Samsung’s photos illustrate the design and finishes. Ask London Tech which configuration is available." }),
  phone("galaxy-s26-ultra", "Samsung", "Samsung Galaxy S26 Ultra",
    samsung + "africa_en/smartphones/galaxy-s26-ultra/",
    "Samsung’s Galaxy S26 Ultra combines a 6.9-inch display, an integrated S Pen and a 200 MP main camera.",
    [
      ["Display", "6.9-inch Dynamic AMOLED 2X, up to 120 Hz"],
      ["Rear cameras", "200 MP wide, 50 MP ultra wide, 50 MP 5× and 10 MP 3× telephoto"],
      ["Connectivity", "5G"],
      ["Stylus", "Integrated S Pen"],
      ["Configuration", "Confirm finish, RAM and storage with the store"],
    ], {
      mediaNote: "Samsung’s Sky Blue reference is shown. Confirm the actual finish and storage with London Tech.",
      inTheBox: "Samsung lists the phone, data cable and SIM eject tool. The travel adapter is sold separately.",
    }),
  phone("galaxy-a57-5g", "Samsung", "Samsung Galaxy A57 5G",
    samsung + "id/smartphones/galaxy-a/galaxy-a57-5g-awesome-navy-256gb-sm-a576bdbsxid/",
    "The Galaxy A57 5G features a 120 Hz AMOLED screen, an optically stabilised main camera and a slim design.",
    [
      ["Display", "6.7-inch FHD+ Super AMOLED Plus, up to 120 Hz"],
      ["Rear cameras", "50 MP main with OIS, 12 MP ultra wide and 5 MP macro"],
      ["Connectivity", "5G"],
      ["Battery", "5,000 mAh typical"],
      ["Configuration", "Awesome Navy reference shown. Confirm RAM and storage with the store"],
    ]),
  phone("samsung-galaxy-a16", "Samsung", "Samsung Galaxy A16",
    samsung + "africa_en/smartphones/galaxy-a/galaxy-a16-black-256gb-sm-a165fzkiafb/",
    "The Galaxy A16 pairs a 6.7-inch Super AMOLED screen with a 50 MP main camera for everyday use.",
    [
      ["Display", "6.7-inch FHD+ Super AMOLED, up to 90 Hz"],
      ["Rear cameras", "50 MP main, 5 MP ultra wide and 2 MP macro"],
      ["Battery", "5,000 mAh typical"],
      ["Configuration", "Confirm model code, network, RAM and storage with the store"],
    ], unidentifiedGalaxy),
  phone("galaxy-a17", "Samsung", "Samsung Galaxy A17",
    samsung + "africa_fr/smartphones/galaxy-a/galaxy-a17-light-blue-256gb-sm-a175flboafb/",
    "The Galaxy A17 has a 90 Hz Super AMOLED display and optical image stabilisation on its 50 MP main camera.",
    [
      ["Display", "6.7-inch FHD+ Super AMOLED, up to 90 Hz"],
      ["Rear cameras", "50 MP main with OIS, 5 MP ultra wide and 2 MP macro"],
      ["Battery", "5,000 mAh typical"],
      ["Configuration", "Confirm model code, network, RAM and storage with the store"],
    ], unidentifiedGalaxy),
  phone("galaxy-a07", "Samsung", "Samsung Galaxy A07",
    samsung + "za/smartphones/galaxy-a/galaxy-a07-black-128gb-sm-a075fzkgafa/",
    "The Galaxy A07 has a large 90 Hz screen, a 50 MP main camera and a 5,000 mAh battery.",
    [
      ["Display", "6.7-inch HD+ LCD, up to 90 Hz"],
      ["Chip", "MediaTek Helio G99"],
      ["Rear cameras", "50 MP main and 2 MP depth"],
      ["Battery", "5,000 mAh typical"],
      ["Connectivity", "4G LTE on Samsung’s pictured model"],
      ["Configuration", "Confirm RAM and storage with the store"],
    ]),
  phone("honor-x9d-5g", "HONOR", "HONOR X9d 5G",
    honor + "my/phones/honor-x9d/spec/",
    "The HONOR X9d 5G combines a 120 Hz AMOLED display with a high-capacity battery and an optically stabilised 108 MP main camera.",
    [
      ["Display", "6.79-inch AMOLED, up to 120 Hz"],
      ["Chip", "Snapdragon 6 Gen 4"],
      ["Main camera", "108 MP with optical image stabilisation"],
      ["Battery", "8,300 mAh typical, up to 66 W wired charging"],
      ["Connectivity", "5G"],
      ["Configuration", "Reddish Brown reference shown. Confirm RAM and storage with the store"],
    ]),
  phone("honor-x9c-5g", "HONOR", "HONOR X9c 5G",
    honor + "levant/phones/honor-x9c/spec/",
    "The HONOR X9c 5G features a curved 120 Hz AMOLED display and a 108 MP camera with optical image stabilisation.",
    [
      ["Display", "6.78-inch AMOLED, up to 120 Hz"],
      ["Chip", "Snapdragon 6 Gen 1"],
      ["Main camera", "108 MP with optical image stabilisation"],
      ["Battery", "6,600 mAh typical, up to 66 W wired charging"],
      ["Connectivity", "5G"],
      ["Configuration", "Titanium Purple reference shown. Confirm RAM and storage with the store"],
    ]),
  phone("honor-600-lite-5g", "HONOR", "HONOR 600 Lite 5G",
    honor + "my/phones/honor-600-lite/spec/",
    "The HONOR 600 Lite 5G pairs a 120 Hz AMOLED screen with a dedicated camera button and a 108 MP main camera.",
    [
      ["Display", "6.6-inch AMOLED, 1200 × 2600, up to 120 Hz"],
      ["Chip", "MediaTek Dimensity 7100 Elite"],
      ["Main camera", "108 MP"],
      ["Battery", "6,520 mAh typical, up to 45 W wired charging"],
      ["Connectivity", "5G"],
      ["Configuration", "256 GB indicated on packaging. Confirm storage, RAM and finish with the store"],
    ], { mediaNote: "HONOR’s green reference is shown. Confirm the store unit’s finish before ordering." }),
]

export const stockedPhoneDetails = new Map(stockedPhones.map((entry) => [
  entry.id,
  { ...entry, ...media[entry.id] },
]))
