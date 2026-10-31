import React, { useState } from "react"

import {
  Search,
  UserRound,
  Heart,
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
  GitCompareArrows,
  ShieldCheck,
  PackageCheck,
  MapPin,
  Plus,
  Trash2,
} from "lucide-react"

import { useStore, cartKey } from "../store.jsx"
import { ProductMotionNote } from "./MotionText"
import { galleryImages } from "../lib/product-experience.js"

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
  Badge,
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

export function PaymentMarks() {
  return (
    <div
      className="payment-marks"
      aria-label="Payment methods: MTN Mobile Money, Airtel Money and Visa"
    >
      <span className="mtn-mark">
        MTN <b>MoMo</b>
      </span>
      <span className="airtel-mark">
        airtel <b>money</b>
      </span>
      <span className="visa-mark">VISA</span>
    </div>
  )
}

export function ProductCard({ product: p }) {
  const { wishlist, toggleWish, addCart, compare, toggleCompare } = useStore()

  const saved = wishlist.includes(p.id)

  return (
    <article className="product-card">
      <div className="product-card-media">
        <a href={productPath(p)} tabIndex={-1} aria-hidden="true">
          <img
            src={galleryImages(p)[0]?.src || p.image}
            alt=""
            loading="lazy"
            decoding="async"
          />
        </a>
        <div className="product-flags">
          {p.stock === 0 ? (
            <Badge type="muted">Out of stock</Badge>
          ) : p.comparePrice && p.price ? (
            <Badge>
              Save {Math.round((1 - p.price / p.comparePrice) * 100)}%
            </Badge>
          ) : p.featured ? (
            <Badge>Spotlight</Badge>
          ) : null}
        </div>
        <div className="product-tools">
          <IconButton
            label={saved ? "Remove from wishlist" : "Add to wishlist"}
            onClick={() => toggleWish(p.id)}
            className={saved ? "selected" : ""}
          >
            <Heart size={16} fill={saved ? "currentColor" : "none"} />
          </IconButton>
          <IconButton
            label={
              compare.includes(p.id)
                ? "Remove from comparison"
                : "Compare product"
            }
            onClick={() => toggleCompare(p.id)}
            className={compare.includes(p.id) ? "selected" : ""}
          >
            <GitCompareArrows size={16} />
          </IconButton>
        </div>
      </div>
      <div className="product-card-copy">
        <small>
          {p.brand} <span>·</span> {categoryName(p.category)}
        </small>
        <h3>
          <a href={productPath(p)}>{p.name}</a>
        </h3>
        <ProductMotionNote category={p.category} />
        <div className="product-card-bottom">
          <div>
            <strong className={p.price == null ? "request-price" : ""}>
              {money(p.price)}
            </strong>
            {p.price != null && !p.priceConfirmed && (
              <small className="guide-label">Guide price</small>
            )}
            {p.comparePrice > p.price && p.price != null && (
              <del>{money(p.comparePrice)}</del>
            )}
          </div>
          <IconButton
            label={"Add " + p.name + " to cart"}
            onClick={() => addCart(p)}
            disabled={p.stock === 0}
          >
            <Plus size={18} />
          </IconButton>
        </div>
      </div>
    </article>
  )
}

export function ProductGrid({ products }) {
  return (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}

export function SectionHeading({ eyebrow, title, href, link = "Explore all" }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      {href && (
        <a className="text-link" href={href}>
          {link}
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
            <b>{money(p.price)}</b>
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
