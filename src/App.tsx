import { BrandWordmark } from "./components/BrandWordmark.jsx"
import { useStore, navigate } from "./store.jsx"
import { AccountMenu } from "./components/AccountMenu"
import { LocaleSelector } from "./components/LocaleSelector.jsx"
import { useLocale } from "./lib/locale.jsx"
import { WhatsAppIcon } from "./components/WhatsAppIcon.jsx"
import { productImagePlaceholder, showProductImageFallback } from "./lib/product-image.js"
import { ProductPhotoPlaceholder } from "./components/ProductPhotoPlaceholder.jsx"
import { StoreFooter } from "./components/StoreFooter.jsx"
import { CardPrices } from "./components/CardPrices.jsx"
import { UtilityBanner } from "./components/UtilityBanner.jsx"
import { TypewriterText } from "./components/MotionText"
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
  Grid3x3,
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
  Tablet,
  Headphones,
  Speaker,
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
  "phones",
  "tablets",
  "wireless earbuds",
  "wristwatches",
  "premium accessories",
  "perfumes",
]

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
  { name: "Phones · الهواتف", icon: <Smartphone size={14} /> },
  { name: "Tablets · الأجهزة اللوحية", icon: <Tablet size={14} /> },
  { name: "Audio · الصوتيات", icon: <Headphones size={14} /> },
  { name: "Wristwatches · ساعات اليد", icon: <Watch size={14} /> },
  { name: "Accessories · الإكسسوارات", icon: <Cable size={14} /> },
  { name: "Perfumes · العطور", icon: <Sparkles size={14} /> },
]

const NAV_LINKS = [
  "Home",
  "Phones",
  "Tablets",
  "Audio",
  "Accessories",
  "Wristwatches",
  "Perfumes",
  "Hot Deals",
]
const TREND_CATS = [
  "All",
  "Phones",
  "Tablets",
  "Audio",
  "Accessories",
  "Wristwatches",
  "Perfumes",
]

// Product order and merchandising only. Names, photos, prices and stock come
// from the single store catalogue, including merchant changes.
const PRODUCTS: ProductReference[] = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  ...(index < 4 ? { badge: "Spotlight" } : {}),
}))
const LATEST: ProductReference[] = [101, 102, 103, 104].map((id) => ({ id }))

const HERO_SLIDES = [
  {
    tag: "LONDON TECH",
    headline: "New week.",
    hl: "New tech.",
    bg: "/promotions/gadget-collection.webp",
    alt: "London Tech collection of phones, headphones, watches, tablets and accessories",
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
  1: "iphone-17-pro-max-cosmic-orange-512gb",
  2: "samsung-galaxy-a16",
  3: "galaxy-s26-ultra",
  4: "honor-x9d-5g",
  5: "iphone-16-pro-max-desert-titanium-512gb",
  6: "galaxy-a17",
  7: "bebe-tab-b88-master-red",
  8: "discover-tab-x1",
  9: "jbl-tune-530bt-black",
  10: "anker-25w-compact-usbc-charger",
  11: "naviforce-nf8076-silver-black",
  12: "skmei-1712-silver-white",
  101: "iphone-air",
  102: "galaxy-a17",
  103: "s-color-s-kids4-max",
  104: "soundcore-liberty-5-white",
}
const commerceId = (p: Product) => COMMERCE_IDS[p.id] || String(p.id)
const categoryId = (name: string) =>
  (({
    All: "shop",
    "All Categories": "shop",
    Phones: "mobiles",
    Smartphones: "mobiles",
    Tablets: "tablets",
    Earbuds: "audio",
    Speakers: "audio",
    Headphones: "audio",
    Audio: "audio",
    "Audio & Earbuds": "audio",
    Accessories: "accessories",
    Perfumes: "perfumes",
    Wristwatches: "wristwatches",
    "Hot Deals": "hot-deals",
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
      mobiles: "Phones",
      tablets: "Tablets",
      audio: "Audio",
      wristwatches: "Wristwatches",
      accessories: "Accessories",
      perfumes: "Perfumes",
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
function ProductCard({ p }: { p: Product }) {
  const { products, wishlist, toggleWish, addCart, cart } = useStore()
  const { t } = useLocale()
  const id = commerceId(p)
  const item = products.find((product: { id: string }) => product.id === id)
  if (!item) return null
  const wished = wishlist.includes(id)
  const added = cart.some((line: { id: string }) => line.id === id)
  const hasVariants = Boolean(item.options?.length || item.colors?.length)
  const message = encodeURIComponent(
    `Hello London Tech, I’m interested in ${item.name}.`,
  )

  return (
    <article className="pcard home-product-card">
      <a className="home-product-link" href={"/products/" + id + "/"}>
        <div className="home-product-image">
          {item.image === productImagePlaceholder ? (
            <ProductPhotoPlaceholder category={item.category} />
          ) : (
            <img src={item.image} loading="lazy" decoding="async" alt="" onError={showProductImageFallback} />
          )}
        </div>
        <div className="home-product-copy">
          <h3>{item.name}</h3>
          <CardPrices product={item} />
        </div>
      </a>
      <button
        className={`home-product-wishlist${wished ? " selected" : ""}`}
        type="button"
        aria-pressed={wished}
        aria-label={t(
          wished ? "Remove {name} from wishlist" : "Save {name} to wishlist",
          { name: item.name },
        )}
        onClick={() => toggleWish(id)}
      >
        <Heart size={17} fill={wished ? "currentColor" : "none"} />
      </button>
      <div className="home-product-actions">
        <a
          className="home-product-chat"
          href={`https://wa.me/256788341111?text=${message}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("Ask about {name} on WhatsApp", { name: item.name })}
        >
          <WhatsAppIcon size={16} />
          <span>{t("Chat")}</span>
        </a>
        <button
          className="home-product-add"
          type="button"
          disabled={item.stock === 0}
          onClick={() =>
            hasVariants ? navigate("/products/" + id + "/") : addCart(item)
          }
          aria-label={t(
            item.stock === 0
              ? "{name} is out of stock"
              : hasVariants
                ? "Choose options for {name}"
                : added
                  ? "Add another {name} to cart"
                  : "Add {name} to cart",
            { name: item.name },
          )}
        >
          <ShoppingCart size={15} aria-hidden="true" />
          <span>
            {item.stock === 0
              ? t("Out of stock")
              : hasVariants
                ? t("Choose options")
                : added
                  ? t("Added")
                  : t("Add to cart")}
          </span>
        </button>
      </div>
    </article>
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
  const { t } = useLocale()
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
        {icon} {t(label)}
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
  currentPath?: string
}
export default function App({
  children,
  quiet = false,
  currentPath = typeof window === "undefined" ? "/" : window.location.pathname,
}: StorefrontProps) {
  const { t } = useLocale()
  const normalizedPath = currentPath.split(/[?#]/, 1)[0].replace(/\/+$/, "") + "/"
  const isNavigationActive = (label: string) => {
    const targetPath = navigationPath(label)
    return normalizedPath === targetPath
  }
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
    (product: { id: string }) => product.id === "iphone-17-pro-max-cosmic-orange-512gb",
  )
  const dealProducts = catalogue.filter(
    (product: any) =>
      product.active !== false &&
      product.price != null &&
      product.comparePrice != null &&
      product.comparePrice > product.price,
  )
  const visibleDeals =
    dealProducts.length > 0
      ? [...dealProducts.slice(dealOffset), ...dealProducts.slice(0, dealOffset)].slice(0, 2)
      : []
  const filtered = catalogueProducts(PRODUCTS, catalogue).filter(
    (p) =>
      (tcat === "All" || p.category === tcat) &&
      p.name.toLowerCase().includes(q.toLowerCase()) &&
      (searchCategory === "All Categories" ||
        p.category === searchCategory.split(" · ")[0] ||
        (searchCategory.startsWith("Earbuds") && p.category === "Audio")),
  )
  const categorySearch = q.trim() ? "?q=" + encodeURIComponent(q.trim()) : ""
  const shopCategory = (category: string) => {
    navigate("/collections/" + categoryId(category) + "/" + categorySearch)
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
              aria-label={t("Search category")}
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
              <option value="All Categories">{t("All Categories")}</option>
              {CATS.map((c) => (
                <option key={c.name} value={c.name}>
                  {t(c.name)}
                </option>
              ))}
            </select>
            <div className="search-field">
              {!q && (
                <div className="search-suggestion" aria-hidden="true">
                  {t("Search")}{" "}
                  <TypewriterText
                    words={SEARCH_WORDS.map((word) => t(word))}
                    active={!searchFocused}
                  />
                </div>
              )}
              <input
                aria-label={t("Search products")}
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
              aria-label={t("Search by image")}
              title={t("Search by image")}
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
              aria-label={t("Search")}
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
            <LocaleSelector />
            <AccountMenu />
            <button
              onClick={() => setCartOpen(true)}
              aria-label={t("Open shopping cart")}
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
              {t("My Cart")}
            </button>
          </div>
        </div>
      </header>

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav className="store-primary-nav" aria-label={t("Explore categories")} style={{ background: "#fff", borderBottom: `2px solid ${B_BLUE}` }}>
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
          <a
            className="nav-all-categories"
            href={"/collections/shop/" + categorySearch}
            aria-label={t("ALL CATEGORIES")}
            aria-current={normalizedPath === "/collections/shop/" ? "page" : undefined}
            onClick={() => setNavOpen(false)}
          >
            <Grid3x3 size={15} strokeWidth={2.1} />{" "}
            <span className="nav-cat-label">{t("ALL CATEGORIES")}</span>
          </a>

          {/* Desktop links */}
          <div
            className="nav-desktop"
            style={{
              alignItems: "center",
              overflowX: "auto",
              overflowY: "hidden",
            }}
          >
            {NAV_LINKS.map((lnk) => {
              const targetPath = navigationPath(lnk)
              const isActive = isNavigationActive(lnk)
              return (
                <a
                  key={lnk}
                  href={targetPath}
                  className={`nav-link${isActive ? " active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                  onClick={(event) => {
                    if (
                      event.button !== 0 ||
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    )
                      return
                    event.preventDefault()
                    navigate(targetPath)
                  }}
                >
                  {t(lnk)}
                </a>
              )
            })}
          </div>

          {/* Mobile hamburger */}
          <button
            className="nav-toggle"
            onClick={() => setNavOpen((v) => !v)}
            style={{
              marginLeft: "auto",
              border: "none",
              cursor: "pointer",
              padding: 8,
            }}
            aria-label={t("Menu")}
            aria-expanded={navOpen}
            aria-controls="store-primary-nav-drawer"
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
          id="store-primary-nav-drawer"
          className={`nav-drawer${navOpen ? " open" : ""}`}
          style={{ borderTop: `1px solid ${B_BLUE_LIGHT}` }}
        >
          {NAV_LINKS.map((lnk) => {
            const targetPath = navigationPath(lnk)
            const isActive = isNavigationActive(lnk)
            return (
              <a
                key={lnk}
                href={targetPath}
                className={`nav-link mobile-nav-link${isActive ? " active" : ""}`}
                aria-current={isActive ? "page" : undefined}
                onClick={(event) => {
                  if (
                    event.button !== 0 ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey
                  )
                    return
                  event.preventDefault()
                  setNavOpen(false)
                  navigate(targetPath)
                }}
              >
                {t(lnk)}
                <ChevronRight size={14} aria-hidden="true" />
              </a>
            )
          })}
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
                <a
                  key={cat.name}
                  className="home-category-link"
                  href={navigationPath(cat.name) + categorySearch}
                >
                  <span
                    style={{ color: B_BLUE, display: "flex", flexShrink: 0 }}
                  >
                    {cat.icon}
                  </span>
                  <span style={{ flex: 1, fontWeight: 500 }}>
                    {t(cat.name)}
                  </span>
                  <ChevronRight size={14} aria-hidden="true" />
                </a>
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
                  onClick={(event) => {
                    if (
                      event.button !== 0 ||
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    )
                      return
                    event.preventDefault()
                    navigate("/collections/shop/")
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <LayoutGrid size={17} strokeWidth={1.8} /> {t("More Categories")}
                </a>
              </div>
            </div>

            {/* Featured product uses the same catalogue data as its detail page. */}
            {featuredPhone && (
              <a
                className="sidebar-featured-product"
                href={"/products/" + featuredPhone.id + "/"}
              >
                <img src={featuredPhone.image} alt={featuredPhone.name} onError={showProductImageFallback} />
                <span>{t("In focus")}</span>
                <h3>{featuredPhone.name}</h3>
                <CardPrices product={featuredPhone} />
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
                <Flame size={13} color={B_GOLD} /> {t("Latest Products")}
                <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                  <button
                    onClick={() =>
                      setLatestOffset(
                        (i) => (i + LATEST.length - 1) % LATEST.length,
                      )
                    }
                    aria-label={t("Previous latest products")}
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
                    aria-label={t("Next latest products")}
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
                    onError={showProductImageFallback}
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
                    <CardPrices
                      product={catalogue.find(
                        (item: { id: string }) => item.id === commerceId(p),
                      )}
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
                      {t(b.title)}
                    </div>
                    <div style={{ fontSize: 10.5, color: "#999" }}>
                      {t(b.sub)}
                    </div>
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
                aria-label={t("London Tech promotions")}
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
                    {t(hero.headline)}
                    <br />
                    <span>{t(hero.hl)}</span>
                  </h1>
                  <button
                    className="hero-shop"
                    onClick={() => shopCategory(hero.category)}
                  >
                    {t("Shop now")} <ArrowUpRight size={16} />
                  </button>
                </div>
                <div className="hero-art">
                  <img
                    key={hero.bg}
                    src={hero.bg}
                    alt={hero.alt}
                    fetchPriority="high"
                    decoding="async"
                  />
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
                        aria-label={t("Go to promotion {number}", { number: i + 1 })}
                        aria-pressed={slide === i}
                        className={slide === i ? "active" : ""}
                        onClick={() => setSlide(i)}
                      />
                    ))}
                  </div>
                  <button
                    aria-label={t("Previous promotion")}
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
                    aria-label={t("Next promotion")}
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
                    id: "skmei-1712-silver-white",
                    label: "Wristwatches",
                    category: "wristwatches",
                  },
                  {
                    id: "jbl-tune-530bt-black",
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
                        onError={showProductImageFallback}
                        alt={feature.product.name}
                      />
                      <div>
                        <small>{t("THE TECH EDIT")}</small>
                        <strong>
                          {t(feature.label)}
                          <ArrowUpRight size={16} />
                        </strong>
                        <span>{t("Explore the collection")}</span>
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
                {t("Store specials")}
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
                {t("Original technology, reliable service")} ·{" "}
                <strong style={{ color: B_BLUE }}>
                  تقنية أصلية، خدمة موثوقة
                </strong>
              </span>
              <Btn small onClick={() => shopCategory("All")}>
                {t("Shop Offers")}
              </Btn>
            </div>

            {/* Show sale pricing only when the merchant has set a real compare price. */}
            {dealProducts.length > 0 && <div
              style={{
                background: "#fff",
                border: "1px solid #e0e8f5",
                borderRadius: 4,
                marginBottom: 14,
              }}
            >
              <SectionHeader
                label="Hot Deals"
                icon={<Flame size={16} color={B_BLUE} />}
                controls={
                  <>
                    {dealProducts.length > 2 && (
                      <>
                        <button
                          onClick={() =>
                            setDealOffset((i) =>
                              (i + dealProducts.length - 1) % dealProducts.length,
                            )
                          }
                          aria-label={t("Previous hot deals")}
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
                            setDealOffset((i) => (i + 1) % dealProducts.length)
                          }
                          aria-label={t("Next hot deals")}
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
                    )}
                    <Btn small onClick={() => shopCategory("Hot Deals")}>
                      {t("View hot deals")}
                    </Btn>
                  </>
                }
              />
              <div className="deals-grid">
                {visibleDeals.map((item: any, i: number) => {
                  return (
                    <div
                      key={item.id}
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
                          src={item.image}
                          onError={showProductImageFallback}
                          alt={item.name}
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
                          <a href={"/products/" + item.id + "/"}>
                            {item.name}
                          </a>
                        </div>
                        <CardPrices product={item} showDiscount />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>}

            <section className="company-promo">
              <div className="promo-copy">
                <span className="promo-kicker">
                  <BrandWordmark width={130} />
                </span>
                <h2>{t("Everyday essentials.")}</h2>
                <button
                  className="hero-shop"
                  onClick={() => shopCategory("Accessories")}
                >
                  {t("Shop accessories")} <ArrowUpRight size={15} />
                </button>
              </div>
              <img
                src="/promotions/accessories.jpg"
                alt="London Tech selection of chargers, earbuds and phone accessories"
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
                        type="button"
                        className="home-category-filter"
                        aria-pressed={tcat === cat}
                        onClick={() => setTcat(cat)}
                      >
                        {t(cat)}
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
                    {t("No products in this category yet.")}
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
          aria-label={t("Chat with London Tech on WhatsApp")}
        >
          <WhatsAppIcon size={23} />
          <span>{t("Chat on WhatsApp")}</span>
        </a>
      )}
    </div>
  )
}
