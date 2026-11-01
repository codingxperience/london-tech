import { BrandWordmark } from "./components/BrandWordmark.jsx"
import { useStore, navigate } from "./store.jsx"
import { AccountMenu } from "./components/AccountMenu"
import { StoreFooter } from "./components/StoreFooter.jsx"
import { ProductOffer } from "./components/ProductOffer.jsx"
import { productOffer } from "./lib/offer-details.js"
import { UtilityBanner } from "./components/UtilityBanner.jsx"
import { ProductMotionNote, TypewriterText } from "./components/MotionText"
import { useState, useEffect, type ReactNode } from "react"
import logoImg from "@/imports/london/london-tech-logo.png"
import {
  Search,
  ScanSearch,
  ShoppingCart,
  Heart,
  User,
  Phone,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  Truck,
  ShieldCheck,
  Gift,
  MapPin,
  Flame,
  Sparkles,
  LayoutGrid,
  Cpu,
  Shirt,
  ShoppingBag,
  Zap,
  Bath,
  HeartPulse,
  Lightbulb,
  Wrench,
  BedDouble,
  Sofa,
  Palette,
  Smartphone,
  Watch,
  Laptop,
  Tablet,
  Headphones,
  Speaker,
  Camera,
  Gamepad2,
  Cable,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react"

// ── Brand ─────────────────────────────────────────────────────────────────────
const B_BLUE = "#082A52"
const B_GOLD = "#E32738"
const B_BLUE_LIGHT = "#EEF3F8"
const B_BLUE_DARK = "#041D3A"
const SEARCH_WORDS = [
  "smartphones",
  "laptops & tablets",
  "wireless earbuds",
  "smart watches",
  "premium accessories",
]

function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.52 3.48A11.86 11.86 0 0 0 12.05 0C5.47 0 .12 5.35.12 11.93c0 2.1.55 4.16 1.6 5.97L.02 24l6.25-1.64a11.9 11.9 0 0 0 5.78 1.48h.01C18.64 23.84 24 18.49 24 11.91c0-3.19-1.24-6.18-3.48-8.43ZM12.06 21.83a9.87 9.87 0 0 1-5.04-1.38l-.36-.21-3.71.97.99-3.62-.24-.37a9.87 9.87 0 0 1-1.51-5.29c0-5.47 4.45-9.92 9.92-9.92a9.85 9.85 0 0 1 7.02 2.91 9.86 9.86 0 0 1 2.9 7.02c0 5.47-4.45 9.92-9.97 9.92Zm5.44-7.43c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.21 3.09c.15.2 2.1 3.21 5.09 4.5.71.3 1.26.48 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35Z" />
    </svg>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface ProductReference {
  id: number
  badge?: string
  badgeColor?: string
}
interface CategoryEntry {
  name: string
  icon: ReactNode
}
interface CatalogueProductIdentity {
  id: string
  active: boolean
}
interface Product {
  id: number
  name: string
  arabicName?: string
  price: number | null
  oldPrice?: number
  image: string
  rating: number
  badge?: string
  badgeColor?: string
  category: string
  sold?: number
  available?: number
}
// ── Helpers ───────────────────────────────────────────────────────────────────
const ugx = (n: number | null) =>
  n == null ? "Price on request" : "UGX " + n.toLocaleString("en-UG")
const whatsapp = (p: Product) =>
  `https://wa.me/256788341111?text=${encodeURIComponent(`Hello London Tech, I am interested in ${p.name} (guide price ${ugx(p.price)}). Please confirm the configuration and availability.`)}`

function Btn({
  children,
  small,
  outline,
  onClick,
}: {
  children: ReactNode
  small?: boolean
  outline?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: outline ? "#fff" : B_BLUE,
        color: outline ? B_BLUE : "#fff",
        border: `1.5px solid ${B_BLUE}`,
        borderRadius: 3,
        padding: small ? "5px 12px" : "8px 20px",
        fontWeight: 700,
        fontFamily: "Nunito,sans-serif",
        fontSize: small ? 11 : 13,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all .15s",
      }}
    >
      {children}
    </button>
  )
}

// ── Data ──────────────────────────────────────────────────────────────────────
const CATS: CategoryEntry[] = [
  { name: "Smartphones · الهواتف", icon: <Smartphone size={14} /> },
  { name: "Smart Watches · الساعات", icon: <Watch size={14} /> },
  { name: "Laptops & PC · الحواسيب", icon: <Laptop size={14} /> },
  { name: "Tablets · الأجهزة اللوحية", icon: <Tablet size={14} /> },
  { name: "Earbuds · سماعات الأذن", icon: <Headphones size={14} /> },
  { name: "Speakers · مكبرات الصوت", icon: <Speaker size={14} /> },
  { name: "Headphones · سماعات الرأس", icon: <Headphones size={14} /> },
  { name: "Cameras · الكاميرات", icon: <Camera size={14} /> },
  { name: "Gaming · الألعاب", icon: <Gamepad2 size={14} /> },
  { name: "Accessories · الإكسسوارات", icon: <Cable size={14} /> },
]

const NAV_LINKS = [
  "Home",
  "Smartphones",
  "Laptops",
  "Tablets",
  "Accessories",
  "Smart Watches",
  "Hot Deals",
]
const TREND_CATS = [
  "All",
  "Smartphones",
  "Tablets",
  "Audio",
  "Accessories",
  "Cameras",
]

// Product order and merchandising only. Names, photos, prices and stock come
// from the single store catalogue, including merchant changes.
const PRODUCTS: ProductReference[] = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  ...(index < 4 ? { badge: "Spotlight" } : {}),
}))
const LATEST: ProductReference[] = [101, 102, 103, 104].map((id) => ({ id }))
const DEALS: ProductReference[] = [201, 202].map((id) => ({ id }))

const HERO_SLIDES = [
  {
    tag: "LONDON TECH",
    headline: "New week.",
    hl: "New tech.",
    bg: "/promotions/gadget-collection.webp",
    alt: "Collection of phones, headphones, watches, tablets and gaming accessories",
    category: "All",
  },
  {
    tag: "LONDON TECH",
    headline: "Your next",
    hl: "upgrade.",
    bg: "/assets/current/ipad-pro.png",
    alt: "Slim black smartphone, rear and side views",
    category: "Smartphones",
  },
  {
    tag: "LONDON TECH",
    headline: "Turn up",
    hl: "the music.",
    bg: "/assets/current/soundcore-earbuds.jpeg",
    alt: "Soundcore portable party speaker with illuminated drivers",
    category: "Audio",
  },
]

const COMMERCE_IDS: Record<number, string> = {
  1: "iphone-18-pro-max",
  2: "iphone-18-pro-max-burgundy",
  3: "galaxy-s25-ultra",
  4: "galaxy-z-fold8",
  5: "honor-x9b",
  6: "infinix-smart-10-plus",
  7: "samsung-galaxy-tablet",
  8: "apple-ipad-pro",
  9: "soundcore-wireless-earbuds",
  10: "green-lion-usbc-cable",
  11: "dji-pocket-camera",
  12: "apple-watch-series",
  101: "iphone-18-pro-max",
  102: "galaxy-z-fold8",
  103: "apple-ipad-pro",
  104: "dji-pocket-camera",
  201: "galaxy-s25-ultra",
  202: "soundcore-wireless-earbuds",
}
const commerceId = (p: Product) => COMMERCE_IDS[p.id] || String(p.id)
const categoryId = (name: string) =>
  (({
    All: "shop",
    "All Categories": "shop",
    Smartphones: "mobiles",
    "Smart Watches": "watches",
    "Laptops & PC": "laptops",
    Laptops: "laptops",
    Tablets: "tablets",
    Earbuds: "audio",
    Speakers: "audio",
    Headphones: "audio",
    Audio: "audio",
    "Audio & Earbuds": "audio",
    Cameras: "cameras",
    Gaming: "gaming",
    Accessories: "accessories",
  }) as Record<string, string>)[name.split(" · ")[0]] || "shop"
const navigationPath = (label: string) =>
  label === "Home" ? "/" : "/collections/" + categoryId(label) + "/"
function hydrateProduct(p: ProductReference, catalogue: any[]): Product | null {
  const live = catalogue.find(
    (product) =>
      product.id === (COMMERCE_IDS[p.id] || String(p.id)) &&
      product.active !== false,
  )
  if (!live) return null
  const category =
    ({
      mobiles: "Smartphones",
      laptops: "Laptops",
      tablets: "Tablets",
      audio: "Audio",
      watches: "Smart Watches",
      gaming: "Gaming",
      cameras: "Cameras",
      accessories: "Accessories",
    } as Record<string, string>)[live.category] || "Accessories"
  return {
    ...p,
    name: live.name,
    arabicName: live.arabicName,
    category,
    image: live.image,
    price: live.price,
    oldPrice: live.priceConfirmed
      ? (live.comparePrice ?? undefined)
      : undefined,
    rating: live.reviewCount > 0 ? live.rating : 0,
    available: live.stock ?? undefined,
  }
}
function catalogueProducts(
  items: ProductReference[],
  catalogue: any[],
): Product[] {
  return items.flatMap((item) => {
    const product = hydrateProduct(item, catalogue)
    return product ? [product] : []
  })
}
function cardBadge(p: Product, catalogue: any[]) {
  const product = catalogue.find((item) => item.id === commerceId(p))
  const offer = product && productOffer(product)
  return offer?.discounted ? "−" + offer.discountPercent + "%" : p.badge
}

// ── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({ p }: { p: Product }) {
  const { products, wishlist, toggleWish, addCart, cart } = useStore()
  const item = products.find(
    (item: { id: string }) => item.id === commerceId(p),
  )
  const wished = wishlist.includes(commerceId(p))
  const added = cart.some((line: { id: string }) => line.id === commerceId(p))
  const badge = cardBadge(p, products)
  if (!item) return null
  return (
    <div
      className="pcard"
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("button,a"))
          navigate("/products/" + commerceId(p) + "/")
      }}
      style={{
        background: "#fff",
        border: "1px solid #eee",
        borderRadius: 4,
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          background: "#f9f9f9",
          height: 170,
        }}
      >
        <img
          src={p.image}
          loading="lazy"
          decoding="async"
          alt={p.name}
          className="pimg"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            padding: 10,
            transition: "transform .3s",
          }}
        />
        {badge && (
          <span
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              background: p.badgeColor || B_BLUE,
              color: "#fff",
              fontSize: 12,
              fontWeight: 800,
              padding: "2px 7px",
              borderRadius: 3,
              fontFamily: "Nunito,sans-serif",
            }}
          >
            {badge}
          </span>
        )}
        <div
          className="pover"
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(8,42,82,.04)",
            opacity: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingBottom: 12,
            gap: 6,
            transition: "opacity .2s",
          }}
        >
          <button
            disabled={item.stock === 0}
            onClick={() => addCart(item)}
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "5px 14px",
              borderRadius: 3,
              border: `1.5px solid ${added ? B_BLUE : "#ddd"}`,
              background: added ? B_BLUE : "#fff",
              color: added ? "#fff" : "#333",
              cursor: "pointer",
              fontFamily: "Nunito,sans-serif",
            }}
          >
            {added ? "✓ Added" : "+ Add to Cart"}
          </button>
          <button
            onClick={() => toggleWish(commerceId(p))}
            aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              lineHeight: 0,
            }}
          >
            <Heart
              size={16}
              fill={wished ? B_BLUE : "none"}
              stroke={wished ? B_BLUE : "#aaa"}
            />
          </button>
        </div>
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div
          style={{
            fontSize: 12,
            color: "#64748b",
            marginBottom: 2,
            fontFamily: "Nunito Sans,sans-serif",
          }}
        >
          {p.category}
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "#333",
            marginBottom: 4,
            lineHeight: 1.3,
            fontFamily: "Nunito,sans-serif",
          }}
        >
          <a href={"/products/" + commerceId(p) + "/"}>{p.name}</a>
        </div>
        <ProductMotionNote category={p.category} />
        {p.arabicName && (
          <div
            dir="rtl"
            lang="ar"
            style={{
              fontSize: 12,
              color: "#64748b",
              marginBottom: 4,
              textAlign: "left",
            }}
          >
            {p.arabicName}
          </div>
        )}
        <ProductOffer product={item} showDiscountBadge={false} />
        <div
          className="product-actions"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
            marginTop: 9,
          }}
        >
          <a
            className="whatsapp-cta"
            href={whatsapp(p)}
            target="_blank"
            rel="noreferrer"
            style={{
              color: "#fff",
              borderRadius: 3,
              padding: "6px 4px",
              fontSize: 12,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              textDecoration: "none",
            }}
          >
            <WhatsAppIcon size={15} /> Chat
          </a>
          <button
            disabled={item.stock === 0}
            onClick={() => addCart(item)}
            style={{
              background: added ? B_GOLD : B_BLUE,
              color: "#fff",
              border: 0,
              borderRadius: 3,
              padding: "6px 4px",
              fontSize: 12,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <ShoppingCart size={13} /> {added ? "Added" : "Add"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({
  label,
  icon,
  controls,
}: {
  label: string
  icon: ReactNode
  controls?: ReactNode
}) {
  return (
    <div
      style={{
        padding: "10px 14px",
        borderBottom: "1px solid #eee",
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <div
        style={{ width: 4, height: 18, background: B_BLUE, borderRadius: 2 }}
      />
      <span
        style={{
          fontFamily: "Nunito,sans-serif",
          fontWeight: 900,
          fontSize: 14,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: "#333",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {icon} {label}
      </span>
      {controls && (
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 5,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {controls}
        </div>
      )}
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
interface StorefrontProps {
  children?: ReactNode
  quiet?: boolean
}
export default function App({ children, quiet = false }: StorefrontProps) {
  const {
    products: catalogue,
    cart: cartItems,
    setCartOpen,
    openImageSearch,
  } = useStore()
  const cart = cartItems.reduce(
    (sum: number, line: { quantity: number }) => sum + line.quantity,
    0,
  )
  const [slide, setSlide] = useState(0)
  const [latestOffset, setLatestOffset] = useState(0)
  const [dealOffset, setDealOffset] = useState(0)
  const [tcat, setTcat] = useState("All")
  const [q, setQ] = useState("")
  const [navOpen, setNavOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchCategory, setSearchCategory] = useState("All Categories")
  const [heroHovered, setHeroHovered] = useState(false)

  useEffect(() => {
    if (
      heroHovered ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return
    const t = setInterval(
      () => setSlide((s) => (s + 1) % HERO_SLIDES.length),
      6500,
    )
    return () => clearInterval(t)
  }, [heroHovered])

  const hero = HERO_SLIDES[slide]
  const featuredPhone = catalogue.find(
    (product: { id: string }) => product.id === "iphone-18-pro-max",
  )
  const filtered = catalogueProducts(PRODUCTS, catalogue).filter(
    (p) =>
      (tcat === "All" || p.category === tcat) &&
      p.name.toLowerCase().includes(q.toLowerCase()) &&
      (searchCategory === "All Categories" ||
        p.category === searchCategory.split(" · ")[0] ||
        (searchCategory.startsWith("Earbuds") && p.category === "Audio")),
  )
  const shopCategory = (category: string) => {
    navigate(
      "/collections/" +
        categoryId(category) +
        "/" +
        (q.trim() ? "?q=" + encodeURIComponent(q.trim()) : ""),
    )
  }

  return (
    <div
      className="reference-storefront"
      style={{
        background: "#f2f4f8",
        minHeight: "100vh",
        fontFamily: "Nunito Sans,sans-serif",
      }}
    >
      {/* ── Responsive styles ──────────────────────────────────────────────── */}
      <style>{`
        .pcard:hover .pover { opacity:1 !important; }
        .pcard:hover .pimg { transform:scale(1.05); }

        /* Nav */
        .nav-desktop { display:flex !important; }
        .nav-toggle  { display:none  !important; }
        .nav-drawer  { display:none; }
        .nav-drawer.open { display:block; }

        /* Layout */
        .page-wrap    { display:flex; gap:24px; align-items:flex-start; max-width:1600px; margin:0 auto; padding:24px clamp(16px,3vw,48px); }
        .sidebar-col  { width:200px; flex-shrink:0; }
        .hero-grid    { display:grid; grid-template-columns:minmax(0,1fr) minmax(160px,22%); gap:16px; margin-bottom:20px; }
        .deals-grid   { display:grid; grid-template-columns:1fr 1fr; }
        .products-grid{ display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:16px; padding:20px; }
        .search-cat   { display:block; }

        @media (max-width:1024px) {
          .sidebar-col  { display:none; }
          .products-grid{ grid-template-columns:repeat(3,1fr) !important; }
        }
        @media (max-width:768px) {
          .sidebar-col  { display:none !important; }
          .hero-grid    { grid-template-columns:1fr !important; }
          .deals-grid   { grid-template-columns:1fr !important; }
          .products-grid{ grid-template-columns:repeat(2,1fr) !important; }
          .search-cat   { display:none !important; }
          .nav-desktop  { display:none !important; }
          .nav-toggle   { display:flex !important; }
        }
        @media (max-width:480px) {
          .products-grid { grid-template-columns:repeat(2,1fr) !important; gap:8px !important; }
          .ann-extra     { display:none; }
          .nav-cat-label { display:none; }
        }
        @media (max-width:768px) {
          .ann-extra       { display:none; }
          .nav-cat-label   { display:none; }
          /* Deal cards: stack image above text, image goes full width */
          .deal-item       { flex-direction:column !important; border-right:none !important; border-bottom:1px solid #eee; }
          .deal-img-wrap   { width:100% !important; flex-shrink:unset !important; }
          .deal-img        { width:100% !important; height:200px !important; }
        }
      `}</style>

      {/* ── Announcement bar ──────────────────────────────────────────── */}
      {!quiet && <UtilityBanner />}

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid #e0e8f5",
          padding: "10px 0",
        }}
      >
        <div
          className="store-container header-inner"
          style={{
            margin: "0 auto",
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          {/* Supplied London Tech logo */}
          <a href="/" style={{ flexShrink: 0 }}>
            <img
              src={logoImg}
              alt="London Tech"
              style={{
                height: 62,
                width: "auto",
                objectFit: "contain",
                display: "block",
              }}
            />
          </a>

          {/* Search */}
          <div
            className="header-search"
            style={{
              flex: 1,
              display: "flex",
              borderRadius: 4,
              overflow: "hidden",
              border: `2px solid ${B_BLUE}`,
              minWidth: 180,
            }}
          >
            <select
              aria-label="Search category"
              value={searchCategory}
              onChange={(e) => setSearchCategory(e.target.value)}
              className="search-cat"
              style={{
                padding: "8px 10px",
                border: "none",
                borderRight: "1px solid #dde4ef",
                background: "#f5f8ff",
                fontSize: 12,
                color: "#666",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option>All Categories</option>
              {CATS.map((c) => (
                <option key={c.name}>{c.name}</option>
              ))}
            </select>
            <div className="search-field">
              {!q && (
                <div className="search-suggestion" aria-hidden="true">
                  Search{" "}
                  <TypewriterText
                    words={SEARCH_WORDS}
                    active={!searchFocused}
                  />
                </div>
              )}
              <input
                aria-label="Search products"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") shopCategory("All")
                }}
              />
            </div>
            <button
              type="button"
              className="image-search-trigger"
              aria-label="Search by image"
              title="Search by image"
              onClick={openImageSearch}
            >
              <ScanSearch size={20} strokeWidth={1.7} />
            </button>
            <button
              onClick={() => shopCategory("All")}
              style={{
                background: B_BLUE,
                color: "#fff",
                border: "none",
                padding: "0 14px",
                cursor: "pointer",
              }}
              aria-label="Search"
            >
              <Search size={16} />
            </button>
          </div>

          {/* Utility icons */}
          <div
            className="header-actions"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              marginLeft: "auto",
            }}
          >
            <AccountMenu />
            <button
              onClick={() => setCartOpen(true)}
              aria-label="Open shopping cart"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                fontSize: 10,
                color: "#555",
                padding: "4px 8px",
                position: "relative",
                fontFamily: "Nunito,sans-serif",
                fontWeight: 600,
              }}
            >
              <div style={{ position: "relative" }}>
                <ShoppingCart size={20} />
                {cart > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      background: B_BLUE,
                      color: "#fff",
                      borderRadius: "50%",
                      width: 15,
                      height: 15,
                      fontSize: 9,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                    }}
                  >
                    {cart}
                  </span>
                )}
              </div>
              My Cart
            </button>
          </div>
        </div>
      </header>

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav style={{ background: "#fff", borderBottom: `2px solid ${B_BLUE}` }}>
        <div
          className="store-container"
          style={{
            margin: "0 auto",
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
          }}
        >
          {/* ALL CATEGORIES pill */}
          <button
            onClick={() => shopCategory("All")}
            style={{
              background: B_BLUE,
              color: "#fff",
              border: "none",
              padding: "10px 16px",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "Nunito,sans-serif",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            <LayoutGrid size={15} />{" "}
            <span className="nav-cat-label">ALL CATEGORIES</span>
          </button>

          {/* Desktop links */}
          <div
            className="nav-desktop"
            style={{
              alignItems: "center",
              overflowX: "auto",
              overflowY: "hidden",
            }}
          >
            {NAV_LINKS.map((lnk, i) => (
              <a
                key={lnk}
                href={navigationPath(lnk)}
                style={{
                  padding: "10px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: i === 0 ? B_BLUE : "#555",
                  textDecoration: "none",
                  fontFamily: "Nunito,sans-serif",
                  whiteSpace: "nowrap",
                  borderBottom:
                    i === 0 ? `2px solid ${B_BLUE}` : "2px solid transparent",
                  marginBottom: -2,
                  display: "inline-block",
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLAnchorElement).style.color = B_BLUE
                }}
                onMouseLeave={(e) => {
                  if (i !== 0)
                    (e.currentTarget as HTMLAnchorElement).style.color = "#555"
                }}
              >
                {lnk}
              </a>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            className="nav-toggle"
            onClick={() => setNavOpen((v) => !v)}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 8,
            }}
            aria-label="Menu"
          >
            {navOpen ? (
              <X size={22} color={B_BLUE} />
            ) : (
              <Menu size={22} color={B_BLUE} />
            )}
          </button>
        </div>

        {/* Mobile dropdown */}
        <div
          className={`nav-drawer${navOpen ? " open" : ""}`}
          style={{ borderTop: `1px solid ${B_BLUE_LIGHT}` }}
        >
          {NAV_LINKS.map((lnk, i) => (
            <a
              key={lnk}
              href={navigationPath(lnk)}
              onClick={() => setNavOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "11px 20px",
                borderBottom: "1px solid #f0f0f0",
                fontSize: 14,
                fontWeight: 600,
                color: i === 0 ? B_BLUE : "#444",
                textDecoration: "none",
                fontFamily: "Nunito,sans-serif",
              }}
            >
              {lnk}
              <ChevronRight size={14} color="#ccc" />
            </a>
          ))}
        </div>
      </nav>

      {/* The current repository storefront is the visual source of truth. */}
      {children ? (
        <div className="commerce-surface">{children}</div>
      ) : (
        <div className="page-wrap">
          {/* ── Sidebar ── */}
          <aside className="sidebar-col">
            {/* Category list */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #e0e8f5",
                borderRadius: 4,
                overflow: "hidden",
                marginBottom: 14,
              }}
            >
              {CATS.map((cat) => (
                <div
                  key={cat.name}
                  role="link"
                  tabIndex={0}
                  onClick={() => shopCategory(cat.name)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") shopCategory(cat.name)
                  }}
                  style={{
                    padding: "9px 12px",
                    borderBottom: "1px solid #f5f5f5",
                    fontSize: 12.5,
                    color: "#555",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontFamily: "Nunito Sans,sans-serif",
                    transition: "all .15s",
                  }}
                  onMouseEnter={(e) => {
                    const d = e.currentTarget as HTMLDivElement
                    d.style.background = B_BLUE_LIGHT
                    d.style.color = B_BLUE
                  }}
                  onMouseLeave={(e) => {
                    const d = e.currentTarget as HTMLDivElement
                    d.style.background = ""
                    d.style.color = "#555"
                  }}
                >
                  <span
                    style={{ color: B_BLUE, display: "flex", flexShrink: 0 }}
                  >
                    {cat.icon}
                  </span>
                  <span style={{ flex: 1, fontWeight: 500 }}>{cat.name}</span>
                  <ChevronRight size={12} color="#ccc" />
                </div>
              ))}
              <div
                style={{
                  padding: "9px 12px",
                  fontSize: 12.5,
                  color: B_BLUE,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontFamily: "Nunito,sans-serif",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <a
                  href="/collections/shop/"
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Sparkles size={13} /> More Categories
                </a>
              </div>
            </div>

            {/* Featured product uses the same catalogue data as its detail page. */}
            {featuredPhone && (
              <a
                className="sidebar-featured-product"
                href={"/products/" + featuredPhone.id + "/"}
              >
                <img src={featuredPhone.image} alt={featuredPhone.name} />
                <span>In focus</span>
                <h3>{featuredPhone.name}</h3>
                <ProductOffer product={featuredPhone} compact />
              </a>
            )}

            {/* Latest products */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #e0e8f5",
                borderRadius: 4,
                overflow: "hidden",
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  background: B_BLUE_DARK,
                  color: "#fff",
                  padding: "8px 12px",
                  fontFamily: "Nunito,sans-serif",
                  fontWeight: 800,
                  fontSize: 11.5,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Flame size={13} color={B_GOLD} /> Latest Products
                <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                  <button
                    onClick={() =>
                      setLatestOffset(
                        (i) => (i + LATEST.length - 1) % LATEST.length,
                      )
                    }
                    aria-label="Previous latest products"
                    style={{
                      background: "#345888",
                      border: "none",
                      color: "#fff",
                      width: 18,
                      height: 18,
                      borderRadius: 2,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <button
                    onClick={() =>
                      setLatestOffset((i) => (i + 1) % LATEST.length)
                    }
                    aria-label="Next latest products"
                    style={{
                      background: B_GOLD,
                      border: "none",
                      color: "#fff",
                      width: 18,
                      height: 18,
                      borderRadius: 2,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
              {catalogueProducts(
                [
                  ...LATEST.slice(latestOffset),
                  ...LATEST.slice(0, latestOffset),
                ],
                catalogue,
              ).map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid #f5f5f5",
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <img
                    src={p.image}
                    alt={p.name}
                    style={{
                      width: 54,
                      height: 54,
                      objectFit: "contain",
                      padding: 3,
                      borderRadius: 3,
                      border: "1px solid #eee",
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: "#444",
                        lineHeight: 1.3,
                        fontFamily: "Nunito,sans-serif",
                        marginBottom: 3,
                      }}
                    >
                      <a href={"/products/" + commerceId(p) + "/"}>{p.name}</a>
                    </div>
                    <ProductOffer
                      product={catalogue.find(
                        (item: { id: string }) => item.id === commerceId(p),
                      )}
                      compact
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Trust badges */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #e0e8f5",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              {[
                {
                  icon: <Truck size={20} color={B_BLUE} />,
                  title: "DELIVERY & COLLECTION",
                  sub: "Confirm arrangements with the store",
                },
                {
                  icon: <ShieldCheck size={20} color={B_BLUE} />,
                  title: "ORDER PROTECTION",
                  sub: "Secured information",
                },
                {
                  icon: <Gift size={20} color={B_GOLD} />,
                  title: "GENUINE PRODUCTS",
                  sub: "Original technology",
                },
              ].map((b) => (
                <div
                  key={b.title}
                  style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid #f5f5f5",
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  {b.icon}
                  <div>
                    <div
                      style={{
                        fontFamily: "Nunito,sans-serif",
                        fontWeight: 800,
                        fontSize: 10.5,
                        color: "#333",
                        textTransform: "uppercase",
                        letterSpacing: 0.3,
                      }}
                    >
                      {b.title}
                    </div>
                    <div style={{ fontSize: 10.5, color: "#999" }}>{b.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* ── Main content ── */}
          <main style={{ flex: 1, minWidth: 0 }}>
            {/* Hero + side banners */}
            <div className="hero-grid">
              <section
                className="hero-stage"
                aria-roledescription="carousel"
                aria-label="London Tech promotions"
                onMouseEnter={() => setHeroHovered(true)}
                onMouseLeave={() => setHeroHovered(false)}
                onFocusCapture={() => setHeroHovered(true)}
                onBlurCapture={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget))
                    setHeroHovered(false)
                }}
              >
                <div className="hero-copy" key={slide}>
                  <div className="hero-eyebrow">
                    <span />
                    <BrandWordmark width={130} />
                  </div>
                  <h1>
                    {hero.headline}
                    <br />
                    <span>{hero.hl}</span>
                  </h1>
                  <button
                    className="hero-shop"
                    onClick={() => shopCategory(hero.category)}
                  >
                    Shop now <ArrowUpRight size={16} />
                  </button>
                </div>
                <div className="hero-art">
                  <img key={hero.bg} src={hero.bg} alt={hero.alt} />
                </div>
                <span className="hero-brand">
                  <BrandWordmark width={112} />
                  <span> / THE EDIT</span>
                </span>
                <div className="hero-controls">
                  <span className="hero-count">
                    0{slide + 1}
                    <span> / 0{HERO_SLIDES.length}</span>
                  </span>
                  <div className="hero-dots">
                    {HERO_SLIDES.map((_, i) => (
                      <button
                        key={i}
                        aria-label={`Go to promotion ${i + 1}`}
                        aria-pressed={slide === i}
                        className={slide === i ? "active" : ""}
                        onClick={() => setSlide(i)}
                      />
                    ))}
                  </div>
                  <button
                    aria-label="Previous promotion"
                    onClick={() =>
                      setSlide(
                        (s) =>
                          (s - 1 + HERO_SLIDES.length) % HERO_SLIDES.length,
                      )
                    }
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    aria-label="Next promotion"
                    onClick={() =>
                      setSlide((s) => (s + 1) % HERO_SLIDES.length)
                    }
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </section>

              <div className="hero-side hero-category-features">
                {[
                  {
                    id: "apple-watch-series",
                    label: "Smart watches",
                    category: "watches",
                  },
                  {
                    id: "bose-qc-ultra",
                    label: "Personal audio",
                    category: "audio",
                  },
                ]
                  .map((feature) => ({
                    ...feature,
                    product: catalogue.find(
                      (product: CatalogueProductIdentity) =>
                        product.id === feature.id && product.active !== false,
                    ),
                  }))
                  .filter((feature) => feature.product)
                  .map((feature) => (
                    <a
                      key={feature.id}
                      className="hero-category-feature"
                      href={"/collections/" + feature.category + "/"}
                    >
                      <img
                        src={feature.product.image}
                        alt={feature.product.name}
                      />
                      <div>
                        <small>THE TECH EDIT</small>
                        <strong>
                          {feature.label}
                          <ArrowUpRight size={16} />
                        </strong>
                        <span>Explore the collection</span>
                      </div>
                    </a>
                  ))}
              </div>
            </div>

            {/* Gift Special */}
            <div
              className="gift-special"
              style={{
                background: B_BLUE_LIGHT,
                border: `1px solid #c5d8f0`,
                borderRadius: 4,
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 14,
                flexWrap: "wrap",
              }}
            >
              <Gift size={20} color={B_BLUE} style={{ flexShrink: 0 }} />
              <strong
                style={{
                  fontFamily: "Nunito,sans-serif",
                  fontSize: 12.5,
                  color: B_BLUE,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  flexShrink: 0,
                }}
              >
                Store specials
              </strong>
              <span
                style={{
                  fontSize: 12,
                  color: "#555",
                  flex: 1,
                  minWidth: 0,
                  wordBreak: "break-word",
                }}
              >
                Original technology, reliable service ·{" "}
                <strong style={{ color: B_BLUE }}>
                  تقنية أصلية، خدمة موثوقة
                </strong>
              </span>
              <Btn small onClick={() => shopCategory("All")}>
                Shop Offers
              </Btn>
            </div>

            {/* Daily Deals */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #e0e8f5",
                borderRadius: 4,
                marginBottom: 14,
              }}
            >
              <SectionHeader
                label="Daily Deals"
                icon={<Flame size={16} color={B_BLUE} />}
                controls={
                  <>
                    <button
                      onClick={() =>
                        setDealOffset(
                          (i) => (i + DEALS.length - 1) % DEALS.length,
                        )
                      }
                      aria-label="Previous featured products"
                      style={{
                        background: "#f5f5f5",
                        border: "1px solid #ddd",
                        color: "#666",
                        width: 26,
                        height: 26,
                        borderRadius: 3,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() =>
                        setDealOffset((i) => (i + 1) % DEALS.length)
                      }
                      aria-label="Next featured products"
                      style={{
                        background: B_BLUE,
                        border: "none",
                        color: "#fff",
                        width: 26,
                        height: 26,
                        borderRadius: 3,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </>
                }
              />
              <div className="deals-grid">
                {catalogueProducts(
                  [...DEALS.slice(dealOffset), ...DEALS.slice(0, dealOffset)],
                  catalogue,
                ).map((p, i) => (
                  <div
                    key={p.id}
                    className="deal-item"
                    style={{
                      padding: "16px 18px",
                      borderRight: i === 0 ? "1px solid #eee" : "none",
                      display: "flex",
                      gap: 14,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      className="deal-img-wrap"
                      style={{ position: "relative", flexShrink: 0 }}
                    >
                      <img
                        src={p.image}
                        alt={p.name}
                        className="deal-img"
                        style={{
                          width: 150,
                          height: 120,
                          objectFit: "contain",
                          padding: 8,
                          borderRadius: 4,
                          display: "block",
                        }}
                      />
                      {cardBadge(p, catalogue) && (
                        <span
                          style={{
                            position: "absolute",
                            top: 6,
                            left: 6,
                            background: p.badgeColor || B_BLUE,
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 3,
                            fontFamily: "Nunito,sans-serif",
                          }}
                        >
                          {cardBadge(p, catalogue)}
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div
                        style={{
                          fontFamily: "Nunito,sans-serif",
                          fontWeight: 700,
                          fontSize: 13.5,
                          color: "#333",
                          marginBottom: 4,
                        }}
                      >
                        <a href={"/products/" + commerceId(p) + "/"}>
                          {p.name}
                        </a>
                      </div>
                      <ProductMotionNote category={p.category} />
                      <ProductOffer
                        product={catalogue.find(
                          (item: { id: string }) => item.id === commerceId(p),
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <section className="company-promo">
              <div className="promo-copy">
                <span className="promo-kicker">
                  <BrandWordmark width={130} />
                </span>
                <h2>Everyday essentials.</h2>
                <button
                  className="hero-shop"
                  onClick={() => shopCategory("Accessories")}
                >
                  Shop accessories <ArrowUpRight size={15} />
                </button>
              </div>
              <img
                src="/promotions/accessories.jpg"
                alt="London Tech selection of chargers, smart watches, earbuds and phone accessories"
              />
            </section>

            {/* Trending Items */}
            <div
              id="trending"
              style={{
                background: "#fff",
                border: "1px solid #e0e8f5",
                borderRadius: 4,
              }}
            >
              <SectionHeader
                label="Trending Items"
                icon={<TrendingUp size={18} color={B_GOLD} />}
                controls={
                  <div style={{ display: "flex", gap: 0, flexWrap: "wrap" }}>
                    {TREND_CATS.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setTcat(cat)}
                        style={{
                          padding: "4px 11px",
                          fontSize: 11.5,
                          fontFamily: "Nunito,sans-serif",
                          fontWeight: 600,
                          background: tcat === cat ? B_BLUE : "none",
                          color: tcat === cat ? "#fff" : "#666",
                          border: "none",
                          cursor: "pointer",
                          borderRadius: tcat === cat ? 3 : 0,
                          transition: "all .15s",
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                }
              />
              <div className="products-grid">
                {filtered.slice(0, 12).map((p) => (
                  <ProductCard key={p.id} p={p} />
                ))}
                {filtered.length === 0 && (
                  <div
                    style={{
                      gridColumn: "1/-1",
                      textAlign: "center",
                      padding: "40px 0",
                      color: "#aaa",
                      fontFamily: "Nunito,sans-serif",
                    }}
                  >
                    No products in this category yet.
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <StoreFooter logo={logoImg} quiet={quiet} />
      {!quiet && (
        <a
          className="floating-whatsapp whatsapp-cta"
          href="https://wa.me/256788341111"
          target="_blank"
          rel="noreferrer"
          aria-label="Chat with London Tech on WhatsApp"
        >
          <WhatsAppIcon size={23} />
          <span>Chat on WhatsApp</span>
        </a>
      )}
    </div>
  )
}
