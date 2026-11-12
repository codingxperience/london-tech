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
  Sparkles,
  ShieldCheck,
  PackageCheck,
  MapPin,
  Trash2,
} from "lucide-react"

import { useStore, cartKey } from "../store.jsx"
import { galleryImages } from "../lib/product-experience.js"
import { productImagePlaceholder, showProductImageFallback } from "../lib/product-image.js"
import { ProductPhotoPlaceholder } from "./ProductPhotoPlaceholder.jsx"
import { CardPrices } from "./CardPrices.jsx"
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
  Sparkles,
}

export function CategoryIcon({ category, size = 22 }) {
  const Icon = icons[category?.icon] || Smartphone
  return <Icon size={size} strokeWidth={1.5} />
}

export { PaymentMarks } from "./PaymentMarks.jsx"

export function ProductCard({ product: p, detailed = false }) {
  const { t } = useLocale()
  const image = galleryImages(p)[0]?.src || p.image
  const href = productPath(p)

  return (
    <article className={"product-card" + (detailed ? " detailed-product-card" : "")}>
      <div className="product-card-media">
        <a href={href} tabIndex={-1} aria-hidden="true">
          {image === productImagePlaceholder ? (
            <ProductPhotoPlaceholder category={p.category} />
          ) : (
            <img src={image} alt="" loading="lazy" decoding="async" onError={showProductImageFallback} />
          )}
        </a>
      </div>
      <div className="product-card-copy">
        <h3><a href={href}>{p.name}</a></h3>
        <div className="product-card-bottom">
          <CardPrices product={p} />
        </div>
        <a className="product-card-cta" href={href}>
          {t("View details")}
          <ArrowRight size={15} aria-hidden="true" />
        </a>
      </div>
    </article>
  )
}

export function ProductGrid({ products, detailed = false }) {
  return (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} detailed={detailed} />
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
  const [query, setQuery] = useState("")
  const results = query.trim()
    ? products
        .filter((p) =>
          (p.name + " " + p.brand + " " + categoryName(p.category))
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .slice(0, 8)
    : products.filter((p) => p.featured).slice(0, 5)
  return (
    <Modal title="Find your next." onClose={() => setSearchOpen(false)} wide>
      <div className="search-box">
        <Search size={21} />
        <input
          aria-label="Search products"
          placeholder="Try iPhone, headphones or a laptop…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <span>{results.length} results</span>
      </div>
      <div
        className="search-results"
        onClick={(e) => e.target.closest("a") && setSearchOpen(false)}
      >
        <p className="eyebrow">
          {query ? "Matching products" : "A few favourites to start with"}
        </p>
        {results.map((p) => (
          <a href={productPath(p)} key={p.id}>
            <img src={p.image} alt="" />
            <span>
              <small>{p.brand}</small>
              <strong>{p.name}</strong>
            </span>
            <CardPrices product={p} />
            <ArrowRight size={15} />
          </a>
        ))}
        {!results.length && (
          <Empty icon={Search} title="Nothing here yet.">
            Try a different model, brand or product category.
          </Empty>
        )}
      </div>
    </Modal>
  )
}

export function CartDrawer() {
  const { lines, subtotal, setCartOpen, updateCart, removeCart } = useStore()
  return (
    <Modal title="Your cart" drawer onClose={() => setCartOpen(false)}>
      <div className="cart-drawer-body">
        {!lines.length ? (
          <Empty
            title="A little room for possibility."
            action={
              <ActionLink
                href="/collections/shop/"
                onClick={() => setCartOpen(false)}
              >
                Explore the collection
              </ActionLink>
            }
          >
            Your next favourite is waiting in the collection.
          </Empty>
        ) : (
          <>
            <p className="muted small">
              {lines.reduce((sum, p) => sum + p.quantity, 0)} items,
              thoughtfully chosen.
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
                    <h3>{p?.name || "Unavailable product"}</h3>
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
                    label="Remove item"
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
            <span>Subtotal</span>
            <strong>
              {subtotal == null ? "To be confirmed" : money(subtotal)}
            </strong>
          </div>
          <p>Delivery and any unlisted prices are confirmed before payment.</p>
          <ActionLink href="/cart/" onClick={() => setCartOpen(false)}>
            Review your cart
          </ActionLink>
          <a
            href="/checkout/"
            onClick={() => setCartOpen(false)}
            className="text-link"
          >
            Continue to checkout
            <ArrowRight size={14} />
          </a>
        </div>
      )}
    </Modal>
  )
}
