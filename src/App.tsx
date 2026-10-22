import { useState, useEffect, type ReactNode } from "react"
import logoImg from "@/imports/london/london-tech-logo.png"
import iphone18 from "@/imports/london/iphone-18-pro.png"
import iphoneBurgundy from "@/imports/london/iphone-18-burgundy.jpg"
import galaxyS25 from "@/imports/london/galaxy-s25-ultra.jpg"
import galaxyFold from "@/imports/london/galaxy-z-fold-8.png"
import honorX9b from "@/imports/london/honor-x9b.png"
import infinixSmart from "@/imports/london/infinix-smart-10.jpg"
import galaxyTablets from "@/imports/london/galaxy-tablets.jpg"
import ipadPro from "@/imports/london/ipad-pro.png"
import soundcore from "@/imports/london/soundcore-earbuds.jpeg"
import greenLionCable from "@/imports/london/green-lion-cable.jpeg"
import djiOsmo from "@/imports/london/dji-osmo-pocket.jpeg"
import appleWatch from "@/imports/london/apple-watch.jpeg"
import accessoryKit from "@/imports/london/accessory-kit.jpeg"
import {
  Search,
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
  Star,
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
const UTILITY_MESSAGES = [
  "Original technology. Local expertise.",
  "Discover phones, audio & everyday essentials.",
  "Talk to our team on WhatsApp: +256 792 261590",
]

function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.52 3.48A11.86 11.86 0 0 0 12.05 0C5.47 0 .12 5.35.12 11.93c0 2.1.55 4.16 1.6 5.97L.02 24l6.25-1.64a11.9 11.9 0 0 0 5.78 1.48h.01C18.64 23.84 24 18.49 24 11.91c0-3.19-1.24-6.18-3.48-8.43ZM12.06 21.83a9.87 9.87 0 0 1-5.04-1.38l-.36-.21-3.71.97.99-3.62-.24-.37a9.87 9.87 0 0 1-1.51-5.29c0-5.47 4.45-9.92 9.92-9.92a9.85 9.85 0 0 1 7.02 2.91 9.86 9.86 0 0 1 2.9 7.02c0 5.47-4.45 9.92-9.97 9.92Zm5.44-7.43c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.21 3.09c.15.2 2.1 3.21 5.09 4.5.71.3 1.26.48 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35Z" />
    </svg>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Product {
  id: number
  name: string
  arabicName?: string
  price: number
  oldPrice?: number
  image: string
  rating: number
  badge?: string
  badgeColor?: string
  category: string
  sold?: number
  available?: number
}
interface CDTime {
  days: number
  hours: number
  mins: number
  secs: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const ugx = (n: number) => "UGX " + n.toLocaleString("en-UG")
const ugxArabic = (n: number) => n.toLocaleString("ar-UG") + " شلن أوغندي"
const whatsapp = (p: Product) =>
  `https://wa.me/256792261590?text=${encodeURIComponent(`Hello London Tech, I am interested in ${p.name} (${ugx(p.price)}).`)}`

function Stars({ r }: { r: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={10} fill={s <= r ? B_GOLD : "#ddd"} stroke="none" />
      ))}
    </div>
  )
}

function useCountdown(init: number) {
  const [t, setT] = useState<CDTime>({ days: 0, hours: 0, mins: 0, secs: init })
  useEffect(() => {
    let total = init
    const id = setInterval(() => {
      total = Math.max(0, total - 1)
      setT({
        days: Math.floor(total / 86400),
        hours: Math.floor((total % 86400) / 3600),
        mins: Math.floor((total % 3600) / 60),
        secs: total % 60,
      })
    }, 1000)
    return () => clearInterval(id)
  }, [init])
  return t
}

function CDBox({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${B_BLUE_LIGHT}`,
        borderRadius: 4,
        minWidth: 44,
        textAlign: "center",
        padding: "4px 6px",
      }}
    >
      <div
        style={{
          fontFamily: "Nunito,sans-serif",
          fontWeight: 800,
          fontSize: 18,
          color: B_BLUE,
          lineHeight: 1,
        }}
      >
        {String(value).padStart(2, "0")}
      </div>
      <div
        style={{
          fontSize: 9,
          color: "#999",
          textTransform: "uppercase",
          letterSpacing: 1,
          marginTop: 2,
        }}
      >
        {label}
      </div>
    </div>
  )
}

// ── Btn helper ────────────────────────────────────────────────────────────────
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
const CATS: { name: string; icon: ReactNode }[] = [
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
  "About Us",
]
const TREND_CATS = [
  "All",
  "Smartphones",
  "Tablets",
  "Audio",
  "Accessories",
  "Cameras",
]

const PRODUCTS: Product[] = [
  {
    id: 1,
    name: "iPhone 18 Pro Max 256GB",
    arabicName: "آيفون 18 برو ماكس 256 جيجا",
    price: 5_650_000,
    oldPrice: 6_100_000,
    image: iphone18,
    rating: 5,
    badge: "HOT",
    badgeColor: B_GOLD,
    category: "Smartphones",
  },
  {
    id: 2,
    name: "iPhone 18 Pro Max Burgundy",
    arabicName: "آيفون 18 برو ماكس عنابي",
    price: 6_580_000,
    image: iphoneBurgundy,
    rating: 5,
    badge: "NEW",
    badgeColor: B_GOLD,
    category: "Smartphones",
  },
  {
    id: 3,
    name: "Samsung Galaxy S25 Ultra",
    arabicName: "سامسونج جالكسي إس 25 ألترا",
    price: 4_850_000,
    oldPrice: 5_200_000,
    image: galaxyS25,
    rating: 5,
    badge: "-7%",
    badgeColor: B_BLUE,
    category: "Smartphones",
  },
  {
    id: 4,
    name: "Samsung Galaxy Z Fold 8",
    arabicName: "سامسونج جالكسي زد فولد 8",
    price: 7_240_000,
    image: galaxyFold,
    rating: 5,
    badge: "NEW",
    badgeColor: B_GOLD,
    category: "Smartphones",
  },
  {
    id: 5,
    name: "Honor X9b 5G",
    arabicName: "هونر إكس 9 بي فايف جي",
    price: 1_320_000,
    oldPrice: 1_480_000,
    image: honorX9b,
    rating: 4,
    badge: "DEAL",
    badgeColor: B_GOLD,
    category: "Smartphones",
  },
  {
    id: 6,
    name: "Infinix Smart 10 Plus",
    arabicName: "إنفينيكس سمارت 10 بلس",
    price: 590_000,
    image: infinixSmart,
    rating: 4,
    category: "Smartphones",
  },
  {
    id: 7,
    name: "Samsung Galaxy Tablet",
    arabicName: "تابلت سامسونج جالكسي",
    price: 2_450_000,
    image: galaxyTablets,
    rating: 4,
    badge: "HOT",
    badgeColor: B_GOLD,
    category: "Tablets",
  },
  {
    id: 8,
    name: "Apple iPad Pro",
    arabicName: "آبل آيباد برو",
    price: 4_200_000,
    oldPrice: 4_550_000,
    image: ipadPro,
    rating: 5,
    category: "Tablets",
  },
  {
    id: 9,
    name: "Soundcore Wireless Earbuds",
    arabicName: "سماعات ساوندكور لاسلكية",
    price: 265_000,
    image: soundcore,
    rating: 4,
    badge: "HOT",
    badgeColor: B_GOLD,
    category: "Audio",
  },
  {
    id: 10,
    name: "Green Lion USB-C Cable",
    arabicName: "كيبل جرين ليون يو إس بي سي",
    price: 85_000,
    image: greenLionCable,
    rating: 4,
    category: "Accessories",
  },
  {
    id: 11,
    name: "DJI Osmo Pocket Camera",
    arabicName: "كاميرا دي جي آي أوسمو بوكيت",
    price: 2_780_000,
    image: djiOsmo,
    rating: 5,
    badge: "NEW",
    badgeColor: B_GOLD,
    category: "Cameras",
  },
  {
    id: 12,
    name: "Apple Watch Series",
    arabicName: "ساعة آبل الذكية",
    price: 1_190_000,
    oldPrice: 1_350_000,
    image: appleWatch,
    rating: 4,
    category: "Accessories",
  },
]

const LATEST: Product[] = [
  {
    id: 101,
    name: "iPhone 18 Pro Max",
    price: 5_650_000,
    image: iphone18,
    rating: 5,
    category: "Smartphones",
  },
  {
    id: 102,
    name: "Galaxy Z Fold 8",
    price: 7_240_000,
    image: galaxyFold,
    rating: 5,
    category: "Smartphones",
  },
  {
    id: 103,
    name: "Apple iPad Pro",
    price: 4_200_000,
    image: ipadPro,
    rating: 5,
    category: "Tablets",
  },
  {
    id: 104,
    name: "DJI Osmo Pocket",
    price: 2_780_000,
    image: djiOsmo,
    rating: 4,
    category: "Cameras",
  },
]

const DEALS: Product[] = [
  {
    id: 201,
    name: "Samsung Galaxy S25 Ultra",
    arabicName: "سامسونج جالكسي إس 25 ألترا",
    price: 4_850_000,
    oldPrice: 5_200_000,
    image: galaxyS25,
    rating: 5,
    badge: "-7%",
    badgeColor: B_GOLD,
    category: "Smartphones",
    available: 60,
    sold: 32,
  },
  {
    id: 202,
    name: "Soundcore Wireless Earbuds",
    arabicName: "سماعات ساوندكور لاسلكية",
    price: 265_000,
    oldPrice: 320_000,
    image: soundcore,
    rating: 4,
    badge: "-17%",
    badgeColor: B_GOLD,
    category: "Audio",
    available: 100,
    sold: 61,
  },
]

const HERO_SLIDES = [
  {
    tag: "LONDON TECH",
    headline: "New week.",
    hl: "New tech.",
    bg: "/promotions/gadget-collection.webp",
    category: "All",
  },
  {
    tag: "LONDON TECH",
    headline: "Think bigger.",
    hl: "Create more.",
    bg: ipadPro,
    category: "Tablets",
  },
  {
    tag: "LONDON TECH",
    headline: "Tune in.",
    hl: "Go wireless.",
    bg: soundcore,
    category: "Audio",
  },
]

// ── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({ p }: { p: Product }) {
  const [wished, setWished] = useState(false)
  const [added, setAdded] = useState(false)
  const disc = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0
  return (
    <div
      className="pcard"
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
        {p.badge && (
          <span
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              background: p.badgeColor || B_BLUE,
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 3,
              fontFamily: "Nunito,sans-serif",
            }}
          >
            {p.badge}
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
            onClick={() => setAdded(!added)}
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
            onClick={() => setWished(!wished)}
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
            fontSize: 10.5,
            color: "#aaa",
            marginBottom: 2,
            fontFamily: "Nunito Sans,sans-serif",
          }}
        >
          {p.category}
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#333",
            marginBottom: 4,
            lineHeight: 1.3,
            fontFamily: "Nunito,sans-serif",
          }}
        >
          {p.name}
        </div>
        {p.arabicName && (
          <div
            dir="rtl"
            lang="ar"
            style={{
              fontSize: 10.5,
              color: "#777",
              marginBottom: 4,
              textAlign: "left",
            }}
          >
            {p.arabicName}
          </div>
        )}
        <Stars r={p.rating} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 5,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontWeight: 800,
              fontSize: 12,
              color: B_BLUE,
              fontFamily: "Nunito,sans-serif",
            }}
          >
            {ugx(p.price)}
          </span>
          {p.oldPrice && (
            <span
              style={{
                fontSize: 11,
                color: "#bbb",
                textDecoration: "line-through",
              }}
            >
              {ugx(p.oldPrice)}
            </span>
          )}
          {disc > 0 && (
            <span
              style={{
                fontSize: 10,
                background: B_GOLD,
                color: "#fff",
                padding: "1px 5px",
                borderRadius: 2,
                fontFamily: "Nunito,sans-serif",
              }}
            >
              -{disc}%
            </span>
          )}
        </div>
        <div
          dir="rtl"
          lang="ar"
          style={{
            fontSize: 9.5,
            color: "#888",
            textAlign: "left",
            marginTop: 2,
          }}
        >
          {ugxArabic(p.price)}
        </div>
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
              fontSize: 10,
              fontWeight: 700,
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
            onClick={() => setAdded(!added)}
            style={{
              background: added ? B_GOLD : B_BLUE,
              color: "#fff",
              border: 0,
              borderRadius: 3,
              padding: "6px 4px",
              fontSize: 10,
              fontWeight: 700,
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
export default function App() {
  const [slide, setSlide] = useState(0)
  const [tcat, setTcat] = useState("All")
  const [q, setQ] = useState("")
  const [cart, setCart] = useState(0)
  const [navOpen, setNavOpen] = useState(false)
  const [utility, setUtility] = useState(0)
  const [word, setWord] = useState(0)
  const [searchCategory, setSearchCategory] = useState("All Categories")
  const [heroHovered, setHeroHovered] = useState(false)
  const c1 = useCountdown(7 * 3600 + 41 * 60 + 36)
  const c2 = useCountdown(3 * 86400 + 7 * 3600 + 41 * 60 + 36)

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
  useEffect(() => {
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return
    const t = setInterval(() => {
      setWord((w) => (w + 1) % SEARCH_WORDS.length)
      setUtility((u) => (u + 1) % UTILITY_MESSAGES.length)
    }, 3600)
    return () => clearInterval(t)
  }, [])

  const hero = HERO_SLIDES[slide]
  const filtered = PRODUCTS.filter(
    (p) =>
      (tcat === "All" || p.category === tcat) &&
      p.name.toLowerCase().includes(q.toLowerCase()) &&
      (searchCategory === "All Categories" ||
        p.category === searchCategory.split(" · ")[0] ||
        (searchCategory.startsWith("Earbuds") && p.category === "Audio")),
  )
  const shopCategory = (category: string) => {
    setTcat(category)
    document
      .getElementById("trending")
      ?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      })
  }

  return (
    <div
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
        .header-hotline { display:block; }

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
          .header-hotline { display:none !important; }
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
      <div className="utility-bar">
        <span className="utility-welcome">LONDON TECH</span>
        <span className="utility-feature">ORIGINAL TECH</span>
        <span className="utility-message">
          <span className="utility-landing" key={utility}>{UTILITY_MESSAGES[utility]}</span>
        </span>
      </div>

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
          <a href="#" style={{ flexShrink: 0 }}>
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
                  Search <strong key={word}>{SEARCH_WORDS[word]}</strong>
                  <span className="search-caret" />
                </div>
              )}
              <input
                aria-label="Search products"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") shopCategory("All")
                }}
              />
            </div>
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
            {[
              { icon: <User size={20} />, label: "Account" },
              { icon: <Heart size={20} />, label: "Wishlist" },
            ].map((u) => (
              <button
                key={u.label}
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
                  fontFamily: "Nunito,sans-serif",
                  fontWeight: 600,
                }}
              >
                {u.icon}
                {u.label}
              </button>
            ))}
            <button
              onClick={() => setCart((c) => c + 1)}
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
            <div
              className="header-hotline"
              style={{
                paddingLeft: 10,
                borderLeft: "1px solid #e0e8f5",
                marginLeft: 4,
                lineHeight: 1.5,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: "#999",
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <Phone size={10} /> Hotline
              </div>
              <div
                style={{
                  fontFamily: "Nunito,sans-serif",
                  fontWeight: 800,
                  fontSize: 13,
                  color: "#333",
                  whiteSpace: "nowrap",
                }}
              >
                +256 792 261590
              </div>
            </div>
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
            style={{ alignItems: "center", overflowX: "auto", overflowY: "hidden" }}
          >
            {NAV_LINKS.map((lnk, i) => (
              <a
                key={lnk}
                href="#"
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
              href="#"
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

      {/* ── Page body ─────────────────────────────────────────────────── */}
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
                <span style={{ color: B_BLUE, display: "flex", flexShrink: 0 }}>
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
              <Sparkles size={13} /> More Categories
            </div>
          </div>

          {/* Featured banner */}
          <div
            style={{
              borderRadius: 4,
              overflow: "hidden",
              position: "relative",
              minHeight: 170,
              marginBottom: 14,
              cursor: "pointer",
            }}
          >
            <img
              src={iphone18}
              alt="iPhone 18 Pro Max"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                padding: 10,
                background: "#fff",
                display: "block",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(0deg,rgba(0,0,0,.75) 55%,transparent)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                padding: "12px 14px",
              }}
            >
              <div
                style={{
                  fontFamily: "Nunito,sans-serif",
                  fontWeight: 900,
                  fontSize: 20,
                  color: "#fff",
                  lineHeight: 1,
                }}
              >
                UGX 5,650,000
              </div>
              <div
                style={{
                  fontFamily: "Nunito,sans-serif",
                  fontWeight: 700,
                  fontSize: 11,
                  color: "#dde",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  margin: "4px 0 8px",
                }}
              >
                iPhone 18 Pro Max
              </div>
              <Btn small>Shop now →</Btn>
            </div>
          </div>

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
            {LATEST.map((p) => (
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
                    {p.name}
                  </div>
                  <Stars r={p.rating} />
                  <div
                    style={{
                      marginTop: 3,
                      display: "flex",
                      gap: 6,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 11,
                        color: B_BLUE,
                        fontFamily: "Nunito,sans-serif",
                      }}
                    >
                      {ugx(p.price)}
                    </span>
                    {p.oldPrice && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "#bbb",
                          textDecoration: "line-through",
                        }}
                      >
                        {ugx(p.oldPrice)}
                      </span>
                    )}
                  </div>
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
                title: "FREE DELIVERY",
                sub: "On orders over UGX 180,000",
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
                  {hero.tag}
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
                <img
                  key={hero.bg}
                  src={hero.bg}
                  alt={
                    slide === 0
                      ? "Collection of phones, headphones, watches, tablets and gaming accessories"
                      : slide === 1
                        ? "Apple iPad Pro"
                        : "Soundcore wireless earbuds"
                  }
                />
              </div>
              <span className="hero-brand">LONDON TECH / THE EDIT</span>
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
                      (s) => (s - 1 + HERO_SLIDES.length) % HERO_SLIDES.length,
                    )
                  }
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  aria-label="Next promotion"
                  onClick={() => setSlide((s) => (s + 1) % HERO_SLIDES.length)}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </section>

            <div className="hero-side" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                {
                  src: appleWatch,
                  label: "Smart Watches",
                  price: "From UGX 1,190,000",
                },
                {
                  src: soundcore,
                  label: "Audio & Earbuds",
                  price: "From UGX 265,000",
                },
              ].map((b) => (
                <div
                  key={b.label}
                  style={{
                    flex: 1,
                    borderRadius: 4,
                    overflow: "hidden",
                    position: "relative",
                    cursor: "pointer",
                    minHeight: 126,
                  }}
                >
                  <img
                    src={b.src}
                    alt={b.label}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      padding: 14,
                      background: "#fff",
                      display: "block",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(0deg,rgba(4,29,58,.95),transparent 80%)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                      padding: "8px 10px",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "Nunito,sans-serif",
                        fontWeight: 800,
                        fontSize: 10.5,
                        color: "#fff",
                        textTransform: "uppercase",
                      }}
                    >
                      {b.label}
                    </div>
                    <div
                      style={{
                        fontFamily: "Nunito,sans-serif",
                        fontWeight: 900,
                        fontSize: 13,
                        color: "#fff",
                      }}
                    >
                      {b.price}
                    </div>
                    <a
                      href="#"
                      style={{
                        color: "#fff",
                        fontSize: 10,
                        textDecoration: "underline",
                        marginTop: 3,
                      }}
                    >
                      Shop Now
                    </a>
                  </div>
                </div>
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
              London Tech Special
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
            <Btn small>Shop Offers</Btn>
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
              {DEALS.map((p, i) => (
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
                    {p.badge && (
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
                        {p.badge}
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
                      {p.name}
                    </div>
                    {p.arabicName && (
                      <div
                        dir="rtl"
                        lang="ar"
                        style={{
                          fontSize: 10,
                          color: "#888",
                          textAlign: "left",
                          marginBottom: 4,
                        }}
                      >
                        {p.arabicName}
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginBottom: 5,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "Nunito,sans-serif",
                          fontWeight: 900,
                          fontSize: 15,
                          color: B_BLUE,
                        }}
                      >
                        {ugx(p.price)}
                      </span>
                      {p.oldPrice && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "#bbb",
                            textDecoration: "line-through",
                          }}
                        >
                          {ugx(p.oldPrice)}
                        </span>
                      )}
                    </div>
                    <div
                      dir="rtl"
                      lang="ar"
                      style={{
                        fontSize: 9.5,
                        color: "#888",
                        textAlign: "left",
                        marginBottom: 5,
                      }}
                    >
                      {ugxArabic(p.price)}
                    </div>
                    <div
                      style={{ fontSize: 11, color: "#888", marginBottom: 8 }}
                    >
                      Available: <strong>{p.available}</strong> &nbsp;|&nbsp;
                      Sold: <strong>{p.sold}</strong>
                    </div>
                    <div
                      style={{
                        height: 4,
                        background: "#e8eef8",
                        borderRadius: 2,
                        marginBottom: 12,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          background: B_BLUE,
                          width: `${((p.sold || 0) / (p.available || 1)) * 100}%`,
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <CDBox label="Days" value={i === 0 ? c1.days : c2.days} />
                      <CDBox
                        label="Hours"
                        value={i === 0 ? c1.hours : c2.hours}
                      />
                      <CDBox label="Mins" value={i === 0 ? c1.mins : c2.mins} />
                      <CDBox label="Secs" value={i === 0 ? c1.secs : c2.secs} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <section className="company-promo">
            <div className="promo-copy">
              <span className="promo-kicker">LONDON TECH</span>
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

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="site-footer">
        <div className="store-container footer-shell">
          <div className="footer-invitation">
            <div>
              <span className="footer-eyebrow">GREAT TECH. A PERSONAL TOUCH.</span>
              <h2>Your next upgrade.<br /><span>Let’s make it yours.</span></h2>
            </div>
            <div className="footer-conversation">
              <p>A little advice makes all the difference.<br />Talk tech with our team.</p>
              <a className="footer-whatsapp whatsapp-cta" href="https://wa.me/256792261590" target="_blank" rel="noreferrer">
                <WhatsAppIcon size={20} /> Let’s talk on WhatsApp <ArrowUpRight size={17} />
              </a>
            </div>
          </div>

          <div className="footer-grid">
            <div className="footer-brand">
              <a href="#" aria-label="London Tech home" className="footer-logo"><img src={logoImg} alt="London Tech" /></a>
              <p>Original technology.<br />Thoughtfully chosen. Locally trusted.</p>
              <span className="footer-arabic" lang="ar" dir="rtl">متجرك الموثوق للتكنولوجيا الأصلية</span>
            </div>
            <div className="footer-column">
              <h3>Explore</h3>
              <ul>
                {[
                  ["Smartphones", "Smartphones"],
                  ["Tablets", "Tablets"],
                  ["Audio & earbuds", "Audio"],
                  ["Accessories", "Accessories"],
                ].map(([label, category]) => (
                  <li key={label}><button onClick={() => shopCategory(category)}>{label}</button></li>
                ))}
              </ul>
            </div>
            <div className="footer-column">
              <h3>Here to help</h3>
              <ul>
                <li><a href="tel:+256792261590">+256 792 261590</a></li>
                <li><a href="mailto:sales@londontech.store">sales@londontech.store</a></li>
                <li><a href="https://wa.me/256792261590?text=Hello%20London%20Tech%2C%20I%20have%20a%20question%20about%20an%20order." target="_blank" rel="noreferrer">Order enquiries <ArrowUpRight size={13} /></a></li>
              </ul>
            </div>
            <div className="footer-column footer-visit">
              <h3>Find us</h3>
              <p>Kampala, Uganda</p>
              <p>Monday – Saturday<br /><span>8:00 am – 8:00 pm</span></p>
              <span className="footer-local"><MapPin size={13} /> Your local tech people.</span>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} London Tech. All rights reserved.</span>
            <span>Kampala, Uganda <span className="footer-bottom-dot" /> Built around you.</span>
          </div>
        </div>
      </footer>
      <a
        className="floating-whatsapp whatsapp-cta"
        href="https://wa.me/256792261590"
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with London Tech on WhatsApp"
      >
        <WhatsAppIcon size={23} />
        <span>Chat on WhatsApp</span>
      </a>
    </div>
  )
}
