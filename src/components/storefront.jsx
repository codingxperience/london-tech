import React, { useEffect, useState } from "react"

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
  Star,
} from "lucide-react"

import { useStore, cartKey } from "../store.jsx"
import { ProductMotionNote } from "./MotionText"
import { galleryImages, productInformation } from "../lib/product-experience.js"
import { ProductOffer, StockAvailability } from "./ProductOffer.jsx"
import { productOffer } from "../lib/offer-details.js"

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

export { PaymentMarks } from "./PaymentMarks.jsx"

export function ProductCard({ product: p, detailed = false }) {
  const { wishlist, toggleWish, addCart, compare, toggleCompare } = useStore()
  const images = galleryImages(p)
  const [photo, setPhoto] = useState(0)
  useEffect(() => setPhoto(0), [p.id, images.length])
  const facts = productInformation(p).specifications.slice(0, 2)
  const saved = wishlist.includes(p.id)
  const offer = productOffer(p)

  return (
    <article
      className={"product-card" + (detailed ? " detailed-product-card" : "")}
    >
      <div className="product-card-media">
        <a href={productPath(p)} tabIndex={-1} aria-hidden="true">
          <img
            src={images[photo]?.src || p.image}
            alt=""
            loading="lazy"
            decoding="async"
          />
        </a>
        <div className="product-flags">
          {p.stock === 0 ? (
            <Badge type="muted">Out of stock</Badge>
          ) : offer.discounted ? (
            <Badge>−{offer.discountPercent}%</Badge>
          ) : p.featured ? (
            <Badge>Spotlight</Badge>
          ) : null}
        </div>
        {detailed && images.length > 1 && (
          <div
            className="card-photo-options"
            role="group"
            aria-label={p.name + " photos"}
          >
            {images.slice(0, 4).map((image, index) => (
              <button
                type="button"
                key={image.src}
                className={photo === index ? "selected" : ""}
                aria-label={`Preview ${p.name}, photo ${index + 1}`}
                aria-pressed={photo === index}
                onPointerEnter={(event) => {
                  if (event.pointerType !== "touch") setPhoto(index)
                }}
                onFocus={() => setPhoto(index)}
                onClick={() => setPhoto(index)}
              >
                <span />
              </button>
            ))}
            {images.length > 4 && (
              <a
                href={productPath(p)}
                aria-label={`See all ${images.length} photos of ${p.name}`}
              >
                +{images.length - 4}
              </a>
            )}
          </div>
        )}
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
        {detailed && facts.length > 0 && (
          <dl className="card-product-facts">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd title={value}>{value}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="product-card-bottom">
          <ProductOffer
            product={p}
            showStock={!detailed}
            showDiscountBadge={false}
          />
          <IconButton
            label={"Add " + p.name + " to cart"}
            onClick={() => addCart(p)}
            disabled={p.stock === 0}
          >
            <Plus size={18} />
          </IconButton>
        </div>
      </div>
      {detailed && (
        <div className="card-product-meta">
          {p.reviewCount > 0 && Number.isFinite(p.rating) && (
            <a
              className="card-real-rating"
              href={productPath(p) + "#product-reviews"}
              aria-label={`${p.rating.toFixed(1)} out of 5 from ${p.reviewCount} verified reviews`}
            >
              <Star size={13} fill="currentColor" />
              <strong>{p.rating.toFixed(1)}</strong>
              <span>({p.reviewCount})</span>
            </a>
          )}
          <StockAvailability product={p} className="card-availability" />
          {p.condition && !/^confirm with store\.?$/i.test(p.condition) && (
            <small>{p.condition}</small>
          )}
          <a className="card-detail-link" href={productPath(p)}>
            View details
            <ArrowRight size={13} />
          </a>
        </div>
      )}
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
