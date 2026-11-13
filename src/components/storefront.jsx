import React, { useState } from "react"

import {
  Search,
  UserRound,
  ShoppingBag,
  Menu,
  X,
  ArrowRight,
  ArrowUpRight,
  SlidersHorizontal,
  Smartphone,
  Laptop,
  Tablet,
  Headphones,
  Watch,
  Gamepad2,
  Camera,
  Cable,
  Disc3,
  Backpack,
  Luggage,
  PerfumeBottle,
  ShieldCheck,
  PackageCheck,
  MapPin,
  Trash2,
  Heart,
  Plus,
} from "lucide-react"

import { useStore, cartKey, navigate } from "../store.jsx"
import { galleryImages } from "../lib/product-experience.js"
import { productImagePlaceholder, showProductImageFallback } from "../lib/product-image.js"
import { ProductPhotoPlaceholder } from "./ProductPhotoPlaceholder.jsx"
import { CardPrices } from "./CardPrices.jsx"
import { StockAvailability } from "./ProductOffer.jsx"
import { useLocale } from "../lib/locale.jsx"

import {
  categories,
  categoryName,
  money,
  productPath,
} from "../data/catalog.js"

import {
  ActionLink,
  Button,
  IconButton,
  Modal,
  Quantity,
  Empty,
} from "./ui.jsx"

const icons = {
  Smartphone,
  Laptop,
  Tablet,
  Headphones,
  Watch,
  Gamepad2,
  Camera,
  Cable,
  Disc3,
  Backpack,
  Luggage,
  PerfumeBottle,
}

export function CategoryIcon({ category, size = 22 }) {
  const Icon = icons[category?.icon] || Smartphone
  return <Icon size={size} strokeWidth={1.5} />
}

export { PaymentMarks } from "./PaymentMarks.jsx"

export function ProductCard({ product: p, detailed = false, showDiscount = false, list = false }) {
  const { t } = useLocale()
  const { wishlist, toggleWish, addCart, cart } = useStore()
  const image = galleryImages(p).find((media) => media.type !== "video")?.src || p.image
  const href = productPath(p)
  const wished = wishlist.includes(p.id)
  const added = cart.some((line) => line.id === p.id)
  const hasVariants = Boolean(p.options?.length || p.colors?.length)

  return (
    <article className={"product-card pcard home-product-card" + (detailed ? " detailed-product-card" : "")}>
      <button
        className={`home-product-wishlist${wished ? " selected" : ""}`}
        type="button"
        aria-pressed={wished}
        aria-label={t(wished ? "Remove {name} from wishlist" : "Save {name} to wishlist", { name: t(p.name) })}
        onClick={() => toggleWish(p.id)}
      >
        <Heart size={17} fill={wished ? "currentColor" : "none"} aria-hidden="true" />
      </button>
      <div className="product-card-media">
        <a href={href} className="collection-card-media-link" tabIndex={-1} aria-hidden="true">
          {image === productImagePlaceholder ? (
            <ProductPhotoPlaceholder category={p.category} />
          ) : (
            <img src={image} alt="" loading="lazy" decoding="async" onError={showProductImageFallback} />
          )}
        </a>
      </div>
      <div className="product-card-copy home-product-copy">
        <h3><a href={href}>{t(p.name)}</a></h3>
        <div className="product-card-bottom">
          <CardPrices product={p} showDiscount={showDiscount} />
          <IconButton
            label={t(p.stock === 0 ? "{name} is out of stock" : hasVariants ? "Choose options for {name}" : added ? "Add another {name} to cart" : "Add {name} to cart", { name: t(p.name) })}
            onClick={() => hasVariants ? navigate(href) : addCart(p)}
            disabled={p.stock === 0}
            className="card-add-button"
          >
            <Plus size={18} aria-hidden="true" />
            {list && <span>{t(p.stock === 0 ? "Out of stock" : hasVariants ? "Choose options" : "Add")}</span>}
          </IconButton>
        </div>
      </div>
      <div className="card-product-meta">
        {showDiscount && <StockAvailability product={p} />}
        <a className="card-detail-link" href={href}>
          {t("View details")}
          <ArrowRight size={14} aria-hidden="true" />
        </a>
      </div>
    </article>
  )
}

export function ProductGrid({ products, detailed = false, showDiscount = false, list = false }) {
  return (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} detailed={detailed} showDiscount={showDiscount} list={list} />
      ))}
    </div>
  )
}

export function SectionHeading({ eyebrow, title, href, link = "Explore all" }) {
  const { t } = useLocale()
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{t(eyebrow)}</p>}
        <h2>{t(title)}</h2>
      </div>
      {href && (
        <a className="text-link" href={href}>
          {t(link)}
          <ArrowRight size={15} />
        </a>
      )}
    </div>
  )
}

export function SearchDialog() {
  const { products, setSearchOpen } = useStore()
  const { t } = useLocale()
  const [query, setQuery] = useState("")
  const results = query.trim()
    ? products
        .filter((p) =>
          [p.name, t(p.name), p.brand, categoryName(p.category), t(categoryName(p.category))].join(" ")
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .slice(0, 8)
    : products.filter((p) => p.featured).slice(0, 5)
  return (
    <Modal title={t("Find your next.")} onClose={() => setSearchOpen(false)} wide>
      <div className="search-box">
        <Search size={21} />
        <input
          aria-label={t("Search products")}
          placeholder={t("Try iPhone, headphones or a laptop…")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <span>{t("{count} results", { count: results.length })}</span>
      </div>
      <div
        className="search-results"
        onClick={(e) => e.target.closest("a") && setSearchOpen(false)}
      >
        <p className="eyebrow">
          {t(query ? "Matching products" : "A few favourites to start with")}
        </p>
        {results.map((p) => (
          <a href={productPath(p)} key={p.id}>
            <img src={p.image} alt="" />
            <span>
              <small>{p.brand}</small>
              <strong>{t(p.name)}</strong>
            </span>
            <CardPrices product={p} />
            <ArrowRight size={15} />
          </a>
        ))}
        {!results.length && (
          <Empty icon={Search} title={t("Nothing here yet.")}>
            {t("Try a different model, brand or product category.")}
          </Empty>
        )}
      </div>
    </Modal>
  )
}

export function CartDrawer() {
  const { lines, subtotal, setCartOpen, updateCart, removeCart } = useStore()
  const { t } = useLocale()
  return (
    <Modal title={t("Your cart")} drawer onClose={() => setCartOpen(false)}>
      <div className="cart-drawer-body">
        {!lines.length ? (
          <Empty
            title={t("A little room for possibility.")}
            action={
              <ActionLink
                href="/collections/shop/"
                onClick={() => setCartOpen(false)}
              >
                {t("Explore the collection")}
              </ActionLink>
            }
          >
            {t("Your next favourite is waiting in the collection.")}
          </Empty>
        ) : (
          <>
            <p className="muted small">
              {lines.reduce((sum, p) => sum + p.quantity, 0)} items,
              {t("thoughtfully chosen.")}
            </p>
            {lines.map((line) => {
              const p = line.product
              return (
                <div className="drawer-cart-line" key={cartKey(line)}>
                  <a
                    href={p ? productPath(p) : "/collections/shop/"}
                    onClick={() => setCartOpen(false)}
                  >
                    <img
                      src={p?.image || "/assets/london-tech-mark.png"}
                      alt=""
                    />
                  </a>
                  <div>
                    <h3>{p?.name || t("Unavailable product")}</h3>
                    <p>
                      {[line.option, line.color].filter(Boolean).join(" · ")}
                    </p>
                    <strong>{money(p?.price)}</strong>
                    <Quantity
                      value={line.quantity}
                      max={Math.max(1, Math.min(10, p?.stock ?? 10))}
                      onChange={(qty) => updateCart(cartKey(line), qty)}
                    />
                  </div>
                  <IconButton
                    label={t("Remove item")}
                    onClick={() => removeCart(cartKey(line))}
                  >
                    <X size={15} />
                  </IconButton>
                </div>
              )
            })}
          </>
        )}
      </div>
      {lines.length > 0 && (
        <div className="drawer-cart-footer">
          <div>
            <span>{t("Subtotal")}</span>
            <strong>
              {subtotal == null ? "To be confirmed" : money(subtotal)}
            </strong>
          </div>
          <p>{t("Delivery and any unlisted prices are confirmed before payment.")}</p>
          <ActionLink href="/cart/" onClick={() => setCartOpen(false)}>
            {t("Review your cart")}
          </ActionLink>
          <a
            href="/checkout/"
            onClick={() => setCartOpen(false)}
            className="text-link"
          >
            {t("Continue to checkout")}
            <ArrowRight size={14} />
          </a>
        </div>
      )}
    </Modal>
  )
}
