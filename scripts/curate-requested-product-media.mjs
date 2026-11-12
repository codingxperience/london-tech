import fs from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

const root = process.cwd()
const publicRoot = path.join(root, "public")
const productMediaPath = path.join(root, "src/data/product-media.json")
const phoneMediaPath = path.join(root, "src/data/phone-stock-media.json")
const productMedia = JSON.parse(await fs.readFile(productMediaPath, "utf8"))
const phoneMedia = JSON.parse(await fs.readFile(phoneMediaPath, "utf8"))

const mediaPlan = {
  "aideepo-pro-pd100-power-bank": [
    {
      url: "https://pictures-uganda.jijistatic.com/27048816_NjIwLTYyMC03YzdjZjNhZTNhLTE.webp",
      source: "https://jiji.ug/sw/central-division/cell-phones-tablets-accessories/power-bank-10000mah-22-5w-aldeepo-portable-power-bank-22-5w-hHpHDextk4HXN5x33oFV3CHw.html",
      alt: "Aldeepo 10,000 mAh 22.5 W power bank — front view",
    },
    {
      url: "https://pictures-uganda.jijistatic.com/27048819_NjIwLTYyMC05YWE0OTg0ZGFhLTE.webp",
      source: "https://jiji.ug/sw/central-division/cell-phones-tablets-accessories/power-bank-10000mah-22-5w-aldeepo-portable-power-bank-22-5w-hHpHDextk4HXN5x33oFV3CHw.html",
      alt: "Aldeepo 10,000 mAh 22.5 W power bank — alternate view",
    },
  ],
  "aideepo-usbc-lightning-braided-cable": [
    {
      url: "https://ke.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/98/8368923/1.jpg?3627=",
      source: "https://www.jumia.co.ke/aldeepo-ad-ipd777-usb-type-c-to-lightning-fast-charging-cable-1m-white-329863889.html",
      alt: "Aldeepo AD-IPD777 1 m braided USB-C to Lightning cable with its retail box",
    },
  ],
  "anker-25w-compact-usbc-charger": [
    {
      url: "https://cdn.shopify.com/s/files/1/0493/9834/9974/files/A2656111_Rich-image_TD01_US_V1.png?v=1744639046&width=3840",
      source: "https://www.anker.com/products/a2656",
      alt: "Anker 25 W Compact USB-C Charger in black — front view",
    },
  ],
  "anker-20w-usbc-charger-black": [
    {
      url: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/e88305f2-c773-45ae-9350-482413833a86.jpg;maxHeight=1200;maxWidth=1200?format=webp",
      source: "https://www.bestbuy.com/product/anker-usb-c-charger-block-20w-nano-pro-black/JJ858RP328",
      alt: "Anker 511 Nano Pro A2637 20 W USB-C Charger — black product view",
    },
  ],
  "anker-maggo-10k-slim-black": [
    {
      url: "https://cdn.shopify.com/s/files/1/0493/9834/9974/files/A1664H11_Richimage_US_TD01_V2_3840x.png?v=1766390722",
      source: "https://www.anker.com/products/a1664-maggo-10000mah-power-bank",
      alt: "Anker MagGo A1664 10,000 mAh magnetic power bank — product view",
    },
    {
      url: "https://cdn.shopify.com/s/files/1/0493/9834/9974/files/A1664H11_Richimage_Richimage_US_TD02_V1_3840x.jpg?v=1766390722",
      source: "https://www.anker.com/products/a1664-maggo-10000mah-power-bank",
      alt: "Anker MagGo A1664 10,000 mAh magnetic power bank — alternate product view",
    },
  ],
  "apple-20w-usbc-power-adapter-type-g": [
    {
      url: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/MUVT3?wid=1200&hei=1200&fmt=jpeg&qlt=95&.v=1751998599725",
      source: "https://www.apple.com/uk/shop/product/muvt3b/a/20w-usb-c-power-adapter",
      alt: "Apple 20 W USB-C Power Adapter — UK Type G plug",
    },
  ],
  "apple-240w-usbc-charge-cable-2m": [
    {
      url: "https://www.lab9.be/cdn/shop/files/240w-usb-c-charge-cable-2-m_MU2G3.png?v=1723051565&width=1445",
      source: "https://www.apple.com/shop/product/myqt3am/a/240w-usb-c-charge-cable-2-m",
      alt: "Apple 240 W USB-C Charge Cable — 2 m coiled cable",
    },
  ],
  "apple-usbc-lightning-cable-1m": [
    {
      url: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/MM0A3?wid=1200&hei=1200&fmt=jpeg&qlt=95&.v=1632956386000",
      source: "https://www.apple.com/shop/product/muq93am/a/usb-c-to-lightning-cable-1-m",
      alt: "Apple USB-C to Lightning Cable — 1 m",
    },
  ],
  "oraimo-powerflow-b11-10000": [
    {
      url: "https://www.ryans.com/storage/products/main/oraimo-powerflow-b11-10000mah-15w-black-power-11773376628.webp",
      source: "https://www.ryans.com/oraimo-powerflow-b11-10000mah-power-bank",
      alt: "Oraimo PowerFlow B11 OPB-1102 10,000 mAh power bank — product view",
    },
  ],
  "oraimo-traveler-15-20000": [
    {
      url: "https://ug.jumia.is/cms/external/pet/OR212EA3HK4AVNAFAMZ/e671969499ec09c1e4449fc89e82c2bb.jpg",
      source: "https://www.jumia.ug/oraimo-traveler-15-power-bank-20000mah-15w-type-c-fast-charging-with-led-torch-259609801.html",
      alt: "Oraimo Traveler 15 OPB-1201P 20,000 mAh power bank — product view",
    },
  ],
  "vidvie-car-air-vent-gravity-holder": [
    {
      url: "https://www.vidvie.hk/Uploads/20230208/1675838919113356.jpg",
      source: "https://www.vidvie.hk/products/view.html?id=239",
      alt: "Vidvie HC1509 gravity phone holder — air-vent mount",
    },
    {
      url: "https://www.vidvie.hk/Uploads/20230208/1675838921624835.jpg",
      source: "https://www.vidvie.hk/products/view.html?id=239",
      alt: "Vidvie HC1509 gravity phone holder — rear and vent clip",
    },
  ],
  "excellent-p26-20000-power-bank": [
    {
      url: "https://ci.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/68/006223/1.jpg?5543",
      source: "https://www.jumia.ci/generic-power-bank-p26-batterie-externe-20000mah-charge-rapide-avec-ecran-led-32260086.html",
      alt: "P26 20,000 mAh power bank — front view and digital display",
    },
    {
      url: "https://ci.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/68/006223/2.jpg?5543",
      source: "https://www.jumia.ci/generic-power-bank-p26-batterie-externe-20000mah-charge-rapide-avec-ecran-led-32260086.html",
      alt: "P26 20,000 mAh power bank — alternate view",
    },
    {
      url: "https://ci.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/68/006223/3.jpg?5543",
      source: "https://www.jumia.ci/generic-power-bank-p26-batterie-externe-20000mah-charge-rapide-avec-ecran-led-32260086.html",
      alt: "P26 20,000 mAh power bank — ports and side view",
    },
  ],
  "fs09-phone-cooler": [
    {
      url: "https://cdn2.blanxer.com/uploads/63c973af179af50e6707eb64/product_image-fs09-phone-radiator-cooler-rozai-nepal-7634.webp",
      source: "https://rozai.com.np/product/fs09-semiconductor-mobile-phone-radiator-cooler-cooling-back-clip-quiet-lightweight-digital-display-fast-cooling",
      alt: "FS09 semiconductor smartphone cooler — front view with cooling fan and digital display",
    },
  ],
  "samsung-45w-usbc-charger": [
    {
      url: "https://images.samsung.com/is/image/samsung/p6pim/uk/ep-t4511xbeggb/gallery/uk-45w-power-adapter-ep-t4511-ep-t4511xbeggb-541439919?$1164_776_PNG$",
      source: "https://www.samsung.com/uk/mobile-accessories/45w-power-adapter-black-usb-c-ep-t4511xbeggb/",
      alt: "Samsung EP-T4511 45 W USB-C Power Adapter — black",
    },
  ],
  "samsung-65w-three-port-charger": [
    {
      url: "https://images.samsung.com/is/image/samsung/p6pim/uk/ep-t6530nbeggb/gallery/uk-65w-power-adapter-trio-ep-t6530-ep-t6530nbeggb-532813621?$1164_776_PNG$",
      source: "https://www.samsung.com/uk/mobile-accessories/65w-power-adapter-trio-black-ep-t6530nbeggb/",
      alt: "Samsung EP-T6530 65 W Power Adapter Trio — three-port charger",
    },
  ],
  "usb-c-8a-charge-cable": [
    {
      url: "https://img.drz.lazcdn.com/g/kf/Sa29590c7ebfb46e7afa8b95f3354afbfs.jpg_720x720q80.jpg",
      source: "https://www.daraz.com.bd/products/premium-8a-type-c-cable-pd-usb-c-quick-charge-for-samsung-mobile-i534665539.html",
      alt: "USB-C to USB-C cable — 8 A charging label and connectors",
    },
  ],
  "vidvie-cb4038c-usbc-cable": [
    {
      url: "https://tienvir.co/cdn/shop/files/c3cm78o3.png?v=1742846938",
      source: "https://www.vidvie.hk/products/view.html?id=352",
      alt: "Vidvie CB4038C&C 60 W braided USB-C to USB-C data cable",
    },
  ],
  "vidvie-three-in-one-charging-cable": [
    {
      url: "https://www.vidvie.hk/Uploads/2024-06-07/6662b084a82bb.png?eo-img.format=webp",
      source: "https://www.vidvie.hk/products/view.html?id=567",
      alt: "Vidvie CB4003 three-in-one charging cable — product view",
    },
    {
      url: "https://www.vidvie.hk/Uploads/20240607/1717743935809619.png?eo-img.format=webp",
      source: "https://www.vidvie.hk/products/view.html?id=567",
      alt: "Vidvie CB4003 three-in-one charging cable — connector detail",
    },
  ],
  "flat-wire-2-to-2-charging-cable": [
    {
      url: "https://static.wixstatic.com/media/695b2a_0d825b48e3164bdf840b6dd5f9ed4c82~mv2.jpg/v1/fit/w_1406,h_1599,q_90,enc_avif,quality_auto/695b2a_0d825b48e3164bdf840b6dd5f9ed4c82~mv2.jpg",
      source: "https://www.cable-technology.com/product-page-1/usb-c-4-in-1-flat-braided-cable",
      alt: "Flat braided 4-in-1 charge cable — connector set and cable view",
    },
    {
      url: "https://static.wixstatic.com/media/695b2a_008212c0c0e14a7da115adbe09e24818~mv2.png/v1/fit/w_1875,h_2132,q_90,enc_avif,quality_auto/695b2a_008212c0c0e14a7da115adbe09e24818~mv2.png",
      source: "https://www.cable-technology.com/product-page-1/usb-c-4-in-1-flat-braided-cable",
      alt: "Flat braided 4-in-1 charge cable — additional view",
    },
  ],
  "usb-a-to-usbc-1-5m-two-pack": [
    {
      url: "https://c1.neweggimages.com/ProductImageCompressAll1280/BDNNS2307280GRC6H92.jpg",
      source: "https://www.newegg.com/p/pl?d=usb-a+to+usb-c+cable+1.5m+2+pack",
      alt: "USB-A to USB-C charging cables — two black 1.5 m cables",
    },
  ],
  "wireless-power-bank-20000-black": [
    {
      url: "https://image.made-in-china.com/202f0j00jGpYAoDKfckv/20000mAh-External-Battery-Charging-Pack-Portable-Charger-Battery-Pack-Portable-Wireless-Charger-Power-Bank-for-iPhone-X-IPhone-8-Samsung-Galaxy-S.webp",
      source: "https://www.made-in-china.com/showroom/isunbom/product-detailyGvRCkSvXnpH/China-20000mAh-External-Battery-Charging-Pack-Portable-Wireless-Charger-Power-Bank.html",
      alt: "Black 20,000 mAh wireless power bank — front face and wireless charging pad",
    },
  ],
  "kh-740-fascial-massage-gun": [
    {
      url: "https://hamzasurgical.com/wp-content/uploads/2025/04/item_5874870_667.jpg",
      source: "https://hamzasurgical.com/product/blueidea-kh-740-fascial-massager-gun",
      alt: "KH-740 fascial massage gun with four interchangeable massage heads",
    },
  ],
  "shoulder-neck-wrap-massager": [
    {
      url: "https://assets.zipper.com.bd/uploads/products/1200/s15fxhbg-shoulder-neck-massager-2-d444b31fc2.webp",
      source: "https://www.zipper.com.bd/shoulder-neck-massager-fh-670",
      alt: "FH-670 shoulder and neck massager — front view",
    },
    {
      url: "https://assets.zipper.com.bd/uploads/products/600/s15fxhbg-shoulder-neck-massager-5-f6a2b71d1d.webp",
      source: "https://www.zipper.com.bd/shoulder-neck-massager-fh-670",
      alt: "FH-670 shoulder and neck massager — alternate product view",
    },
    {
      url: "https://assets.zipper.com.bd/uploads/products/600/s15fxhbg-shoulder-neck-massager-4-f734c1837c.webp",
      source: "https://www.zipper.com.bd/shoulder-neck-massager-fh-670",
      alt: "FH-670 shoulder and neck massager — controls and fabric detail",
    },
  ],
  "malika-eau-de-parfum": [
    {
      url: "https://uae.emperperfumes.com/cdn/shop/files/malikawtbox.jpg?v=1773733335&width=1946",
      source: "https://uae.emperperfumes.com/products/malika",
      alt: "Al Fares Malika Eau de Parfum — bottle and presentation box",
    },
  ],
  "reyane-paris-for-men-edt-100ml": [
    {
      url: "https://cdn2.jomashop.com/media/catalog/product/r/e/reyane-tradition-mens-reyane-paris-edt-34-oz-fragrances-0697051001775.jpg",
      source: "https://www.jomashop.com/reyane-tradition-mens-reyane-paris-edt-3-4-oz-fragrances-0697051001775.html",
      alt: "Reyane Tradition for Men Eau de Toilette — bottle and presentation box",
    },
  ],
  "le-chameau-save-elixir-edp-85ml": [
    {
      url: "https://dubaiperfumeshop.us/cdn/shop/files/2save_elixir.png?v=1775535666&width=1445",
      source: "https://dubaiperfumeshop.us/en/products/le-chameau-save-elixir-men-3-4-oz-edp-sp",
      alt: "Le Chameau Save Elixir Eau de Parfum — bottle and box",
    },
  ],
  "banafa-sparky-white-edp-100ml": [
    {
      url: "https://buabedbanafa.com/sites/default/files/styles/product_details/public/UNIL8019.jpg?itok=iHAgtElx",
      source: "https://buabedbanafa.com/product/sparky-white-100ml-perfume",
      alt: "Banafa Sparky White Eau de Parfum — bottle and packaging",
    },
  ],
  "smo-al-oud-edp-100ml": [
    {
      url: "https://buabedbanafa.com/sites/default/files/styles/product_details/public/SMO%20OUD_0.jpg?itok=0jh0bHXE",
      source: "https://buabedbanafa.com/product/sumo-al-oud-100ml-perfume",
      alt: "Banafa Sumo Al Oud Eau de Parfum — bottle and packaging",
    },
  ],
  "le-chameau-arabia-haya-gift-set": [
    {
      url: "https://www.elizondoenlinea.com/images/thumbs/21735195_set-perfume-dama-le-chameau-arabia-haya-edp-2pzs-mlecahset2.jpg",
      source: "https://www.elizondoenlinea.com/Set-Perfume-Dama-Le-Chameau-Arabia-Haya-Edp-2pzs-Mlecahset2-31803",
      alt: "Le Chameau Arabia Haya gift set — perfume and body spray",
    },
  ],
  "al-ezz-oud-hersh-55-edp-100ml": [
    {
      url: "https://fairnesscosmetics.com/cdn/shop/files/al-ezz-oud-hersh-55-100ml-2048.jpg?v=1790014321&width=1200",
      source: "https://fairnesscosmetics.com/products/al-ezz-oud-hersh-55-degree-celsius-100ml",
      alt: "Al Ezz Oud Hersh 55 Eau de Parfum — 100 ml bottle and box",
    },
  ],
  "lattafa-maahir-black-edition-edp-100ml": [
    {
      url: "https://lookalyfe.com/cdn/shop/files/Look-Alyfe-Lattafa-Maahir-Black-Eau-de-Parfum-100m-0.png?crop=center&height=1200&v=1737421377&width=1200",
      source: "https://lookalyfe.com/products/lattafa-maahir-black-eau-de-parfum-100ml",
      alt: "Lattafa Maahir Black Edition Eau de Parfum — bottle and box",
    },
  ],
  "lattafa-eclaire-edp-100ml": [
    {
      url: "https://static.wixstatic.com/media/2d75da_e97718741ab14bbc9e5b7b59162a8591~mv2.png/v1/fill/w_1080%2Ch_1080%2Cal_c%2Cq_90%2Cenc_avif%2Cquality_auto/2d75da_e97718741ab14bbc9e5b7b59162a8591~mv2.png",
      source: "https://www.yurysfreeshop.com/product-page/lattafa-eclaire-100ml-edp",
      alt: "Lattafa Eclaire Eau de Parfum — bottle and presentation box",
    },
  ],
  "afnan-9am-dive-edp-100ml": [
    {
      url: "https://www.at.afnan.com/cdn/shop/files/9AM-Dive-01_d4bc61ac-c620-48b5-984b-c18d267d8e82.jpg?v=1727787464&width=2048",
      source: "https://www.at.afnan.com/en/products/9-am-dive",
      alt: "Afnan 9 AM Dive Eau de Parfum — bottle and presentation box",
    },
  ],
  "emper-presidente-fragrance": [
    {
      url: "https://cosmeticholic.pk/cdn/shop/files/emper-presidente-official-edition-for-men-edt-100ml-cosmetic-holic-4.jpg?v=1720830776&width=1090",
      source: "https://cosmeticholic.pk/products/emper-presidente-official-edition-for-men-edt-100ml",
      alt: "Emper Presidente Eau de Toilette — bottle and presentation box",
    },
  ],
  "apple-20w-usbc-power-adapter-eu": [
    {
      url: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/MD3J4?wid=1200&hei=1200&fmt=jpeg&qlt=95",
      source: "https://www.apple.com/de/shop/product/md3j4zm/a/20w-usb%E2%80%91c-power-adapter",
      alt: "Apple 20 W USB-C Power Adapter — EU two-pin plug",
    },
  ],
}

const preservedIds = new Set([
  "black-knit-magnetic-case-iphone-17-pro-18-pro",
  "le-falcone-majestic-edp-100ml",
  "al-ezz-oud-hersh-mehwar-edp-100ml",
  "lattafa-al-areeq-silver-edp-100ml",
])
const oldAssets = new Set()
for (const [id, images] of Object.entries(productMedia)) {
  if (mediaPlan[id] || preservedIds.has(id)) {
    for (const { src } of images) oldAssets.add(src)
  }
}

const fetchBuffer = async (url) => {
  let failure
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; LondonTechCatalog/1.0)",
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(60000),
      })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`)
      const buffer = Buffer.from(await response.arrayBuffer())
      const metadata = await sharp(buffer).metadata()
      if (!metadata.width || !metadata.height)
        throw new Error(`Not a decodable image: ${url}`)
      return buffer
    } catch (error) {
      failure = error
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)))
    }
  }
  throw failure
}

for (const [id, entries] of Object.entries(mediaPlan)) {
  const images = []
  for (let index = 0; index < entries.length; index += 1) {
    const item = entries[index]
    const filename = `london-tech-${id}-${index + 1}.webp`
    const relative = `/assets/product-gallery/${filename}`
    const destination = path.join(publicRoot, relative.slice(1))
    await fs.mkdir(path.dirname(destination), { recursive: true })
    try {
      const existing = await fs.stat(destination)
      if (existing.size > 1000) {
        images.push({ src: relative, alt: item.alt, source: item.source })
        console.log(`Image ${id} ${index + 1}/${entries.length}: cached ${relative}`)
        continue
      }
    } catch {}
    const buffer = await fetchBuffer(item.url)
    await sharp(buffer)
      .rotate()
      .resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85, effort: 5 })
      .toFile(destination)
    images.push({ src: relative, alt: item.alt, source: item.source })
    console.log(`Image ${id} ${index + 1}/${entries.length}: ${relative}`)
  }
  productMedia[id] = images
}

// For fragrance entries with already researched product photography, retain
// only images with a traceable source. The remaining store photos came from
// catalogue reference uploads and must never be published as product images.
for (const id of preservedIds) {
  if (id === "black-knit-magnetic-case-iphone-17-pro-18-pro") continue
  productMedia[id] = (productMedia[id] || []).filter(({ source }) => source)
}

// The existing local photos for these stock products were supplied as
// catalogue references. Remove them from the public build once no products
// refer to them, so they cannot be shipped or selected from the public URL.
await fs.writeFile(productMediaPath, `${JSON.stringify(productMedia, null, 2)}\n`)
const mediaText = JSON.stringify(productMedia)
for (const asset of oldAssets) {
  if (!asset.startsWith("/assets/")) continue
  const filename = path.join(publicRoot, asset.slice(1))
  const basename = path.basename(filename)
  if (!basename.includes("-store-") && !basename.endsWith("-retail-packaging.webp")) continue
  const referenced = mediaText.includes(asset)
  if (!referenced) await fs.rm(filename, { force: true })
}

const videos = {
  "iphone-air": {
    url: "https://www.apple.com/newsroom/videos/2025/autoplay/09/apple-iphone-air-plateau/large_2x.mp4",
    label: "Watch Apple’s iPhone Air design video",
  },
  "galaxy-z-fold8": {
    url: "https://images.samsung.com/us/smartphones/galaxy-z-fold8/videos/galaxy-z-fold8-features-design-intro.mp4",
    label: "Watch Samsung’s Galaxy Z Fold8 design video",
  },
  "iphone-18-pro-max": {
    url: "https://www.apple.com/newsroom/videos/2026/autoplay/09/apple-debuts-iphone-18-pro-and-iphone-18-pro-max/apple-iphone-18-pro-camera-close-up/large_2x.mp4",
    label: "Watch Apple’s iPhone 18 Pro camera video",
  },
  "iphone-17-pro-max": {
    url: "https://www.apple.com/newsroom/videos/2025/autoplay/09/apple-iphone-17-pro-forged-plateau/large_2x.mp4",
    label: "Watch Apple’s iPhone 17 Pro design video",
  },
  "iphone-16-pro-max-desert-titanium-512gb": {
    url: "https://www.apple.com/newsroom/videos/videos-2024/autoplay/2024/09/apple-iphone-16-pro-light-and-durable-upgraded-design/large_2x.mp4",
    label: "Watch Apple’s iPhone 16 Pro design video",
  },
  "iphone-15-pro-max-natural-titanium-256gb": {
    url: "https://www.apple.com/newsroom/videos/iphone-15-pro-camera-optical-zoom/large_2x.mp4",
    label: "Watch Apple’s iPhone 15 Pro camera video",
  },
  "iphone-13-pro-max": {
    url: "https://www.apple.com/newsroom/videos/iphone-13-pro-promotion/large_2x.mp4",
    label: "Watch Apple’s iPhone 13 Pro video",
  },
  "galaxy-a57-5g": {
    url: "https://images.samsung.com/is/content/samsung/p6pim/id/feature/167029494/id-feature---x20-551656412.mp4",
    label: "Watch Samsung’s Galaxy A57 5G video",
  },
  "galaxy-s26-ultra": {
    url: "https://www.youtube.com/watch?v=oO2i0yuEek8",
    label: "Watch Samsung’s Galaxy S26 Ultra overview",
    embedUrl: "https://www.youtube-nocookie.com/embed/oO2i0yuEek8?autoplay=1&mute=1&playsinline=1&rel=0",
    source: "https://www.youtube.com/watch?v=oO2i0yuEek8",
  },
}

const downloadVideo = async ([id, video]) => {
  if (video.embedUrl) {
    phoneMedia[id].video = video
    console.log(`Video ${id}: using Samsung’s official embedded film`)
    return
  }
  const filename = `${id}.mp4`
  const relative = `/assets/product-gallery/videos/${filename}`
  const destination = path.join(publicRoot, relative.slice(1))
  await fs.mkdir(path.dirname(destination), { recursive: true })
  try {
    const existing = await fs.stat(destination)
    if (existing.size > 1000) {
      phoneMedia[id].video = { ...video, url: relative, source: video.url }
      console.log(`Video ${id}: cached ${relative}`)
      return
    }
  } catch {}
  const response = await fetch(video.url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; LondonTechStore/1.0)" },
    signal: AbortSignal.timeout(120000),
  })
  if (!response.ok) throw new Error(`${id}: ${response.status} ${response.statusText}`)
  const contentType = response.headers.get("content-type") || ""
  if (!contentType.includes("video/mp4")) throw new Error(`${id}: unexpected content type ${contentType}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  await fs.writeFile(destination, buffer)
  phoneMedia[id].video = { ...video, url: relative, source: video.url }
  console.log(`Video ${id}: ${relative} (${Math.round(buffer.length / 1024 / 1024)} MiB)`)
}

for (const entry of Object.entries(videos)) await downloadVideo(entry)
// Variants that use the same official design film share its local asset.
const localVideoBySource = new Map(
  Object.values(phoneMedia)
    .filter((phone) => phone.video?.source && phone.video.url.startsWith("/assets/"))
    .map((phone) => [phone.video.source, phone.video.url]),
)
for (const phone of Object.values(phoneMedia)) {
  const video = phone.video
  if (!video || video.url.startsWith("/assets/")) continue
  const local = localVideoBySource.get(video.url) || localVideoBySource.get(video.source)
  if (local) phone.video = { ...video, url: local, source: video.source || video.url }
}
await fs.writeFile(phoneMediaPath, `${JSON.stringify(phoneMedia, null, 2)}\n`)

