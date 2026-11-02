import React, { useEffect, useState } from "react"

import {
  ArrowRight,
  ArrowUpRight,
  Heart,
  GitCompareArrows,
  Search,
  PackageCheck,
  ShieldCheck,
  Truck,
  X,
  Star,
  Copy,
} from "lucide-react"

import { useStore, navigate } from "../store.jsx"
import { ProductGallery } from "../components/product-gallery.jsx"
import { ProductSections } from "../components/product-sections.jsx"
import { ProductOffer } from "../components/ProductOffer.jsx"
import { productInformation } from "../lib/product-experience.js"

import { categoryName, productPath } from "../data/catalog.js"

import { api, post } from "../lib/api.js"

import {
  ActionLink,
  Breadcrumb,
  Button,
  Empty,
  Field,
  IconButton,
  Modal,
  Notice,
  PageHeading,
  Quantity,
} from "../components/ui.jsx"

import {
  PaymentMarks,
  ProductGrid,
  SectionHeading,
} from "../components/storefront.jsx"

export { Collection } from "./collection.jsx"

export function Product({ id }) {
  const {
    products,
    addCart,
    toggleWish,
    wishlist,
    toggleCompare,
    compare,
    recent,
    viewProduct,
    settings,
    user,
    notify,
    openAuth,
    initialReviews,
  } = useStore()
  const p = products.find((p) => p.id === id)

  const [quantity, setQuantity] = useState(1),
    [option, setOption] = useState(""),
    [color, setColor] = useState(""),
    [reviewError, setReviewError] = useState(false),
    [reviews, setReviews] = useState(initialReviews?.[id] || []),
    [reviewForm, setReviewForm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("")

  useEffect(() => {
    let active = true
    if (p) viewProduct(p.id)
    setReviews([])
    setReviewError(false)
    api("products/" + id + "/reviews")
      .then((r) => {
        if (active) setReviews(r.reviews)
      })
      .catch(() => {
        if (active) setReviewError(true)
      })
    return () => {
      active = false
    }
  }, [id])

  if (!p) return <NotFound />

  const availability =
    p.stock === 0
      ? "Out of stock"
      : p.stock == null
        ? "Availability on request"
        : "In stock"

  const add = () => {
    if ((p.options.length && !option) || (p.colors.length && !color)) {
      notify("Choose your preferred options.")
      return false
    }
    addCart(p, quantity, option, color)
    return true
  }

  const rating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(
        1,
      )
    : null

  return (
    <main className="container product-page">
      <Breadcrumb
        items={[
          {
            label: categoryName(p.category),
            href: "/collections/" + p.category + "/",
          },
          { label: p.name },
        ]}
      />
      <div className="product-detail-grid">
        <ProductGallery product={p} />
        <div className="product-purchase">
          <div className="product-overline">
            <a href={"/collections/" + p.category + "/"}>
              {p.brand} / {categoryName(p.category)}
            </a>
            <span>SKU {p.sku}</span>
          </div>
          <h1>{p.name}</h1>
          <div className="product-rating">
            {rating ? (
              <>
                <Star size={14} fill="currentColor" />
                <b>{rating}</b>
                <a href="#product-reviews">
                  {reviews.length} verified review
                  {reviews.length !== 1 ? "s" : ""}
                </a>
              </>
            ) : (
              <a href="#product-reviews">No customer reviews yet</a>
            )}
            <span
              className={"stock-status " + (p.stock > 0 ? "available" : "")}
            >
              {availability}
            </span>
          </div>
          <p className="product-description">
            {productInformation(p).description}
          </p>
          <div className="detail-quick-specs">
            {productInformation(p)
              .specifications.slice(0, 3)
              .map(([label, value]) => (
                <span key={label}>
                  <small>{label}</small>
                  <strong>{value}</strong>
                </span>
              ))}
          </div>
          <div className="product-price">
            <ProductOffer product={p} />
            {(p.price == null || !p.priceConfirmed) && (
              <span>
                {p.price == null
                  ? "Request the current price and configuration before purchase."
                  : "Estimated price. Confirm the selected configuration and current selling price before payment."}
              </span>
            )}
          </div>
          {p.options.length > 0 && (
            <fieldset className="option-selector">
              <legend>
                Configuration <b>{option || "Choose an option"}</b>
              </legend>
              <div>
                {p.options.map((v) => (
                  <button
                    key={v}
                    className={option === v ? "selected" : ""}
                    aria-pressed={option === v}
                    onClick={() => setOption(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {p.colors.length > 0 && (
            <fieldset className="option-selector">
              <legend>
                Colour <b>{color || "Choose a colour"}</b>
              </legend>
              <div>
                {p.colors.map((v) => (
                  <button
                    key={v}
                    className={color === v ? "selected" : ""}
                    aria-pressed={color === v}
                    onClick={() => setColor(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          <div className="purchase-actions">
            <Quantity
              value={quantity}
              max={Math.max(1, Math.min(10, p.stock ?? 10))}
              onChange={setQuantity}
            />
            <Button disabled={p.stock === 0} onClick={add}>
              Add to cart
              <ArrowRight size={17} />
            </Button>
            <IconButton
              label={
                wishlist.includes(id)
                  ? "Remove from wishlist"
                  : "Save to wishlist"
              }
              onClick={() => toggleWish(id)}
              className={wishlist.includes(id) ? "selected" : ""}
            >
              <Heart
                size={19}
                fill={wishlist.includes(id) ? "currentColor" : "none"}
              />
            </IconButton>
          </div>
          <Button
            variant="secondary full-width"
            disabled={p.stock === 0}
            onClick={() => {
              if (add()) navigate("/checkout/")
            }}
          >
            {p.price == null || !p.priceConfirmed || p.stock == null
              ? "Request this item"
              : "Continue to checkout"}
            <ArrowUpRight size={17} />
          </Button>
          <div className="product-auxiliary">
            <button onClick={() => toggleCompare(id)}>
              <GitCompareArrows size={15} />
              {compare.includes(id)
                ? "Remove from comparison"
                : "Add to comparison"}
            </button>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(location.href)
                  notify("Product link copied")
                } catch {
                  notify("Copy the link from your address bar.")
                }
              }}
            >
              <Copy size={14} />
              Share product
            </button>
          </div>
          <div className="product-assurances">
            <p>
              <ShieldCheck size={18} />
              <span>
                <strong>Secure checkout</strong>
                <small>Card and mobile money handled by Flutterwave.</small>
              </span>
            </p>
            <p>
              <Truck size={18} />
              <span>
                <strong>Delivery & collection</strong>
                <small>
                  {p.delivery ||
                    "Confirm availability and delivery details before paying."}
                </small>
              </span>
            </p>
            <p>
              <PackageCheck size={18} />
              <span>
                <strong>Product condition</strong>
                <small>
                  {p.condition}.{" "}
                  {p.warranty || "Ask about the warranty for this item."}
                </small>
              </span>
            </p>
          </div>
          <PaymentMarks />
        </div>
      </div>
      <ProductSections
        product={p}
        products={products}
        settings={settings}
        reviews={reviews}
        reviewError={reviewError}
        onWriteReview={() => {
          if (!user) {
            openAuth("login", location.pathname + location.search)
            return
          }
          setReviewForm(true)
        }}
      />
      {recent.filter((x) => x !== id).length > 0 && (
        <section className="section bottom-section">
          <SectionHeading title="Worth another look." />
          <ProductGrid
            products={recent
              .filter((x) => x !== id)
              .map((id) => products.find((p) => p.id === id))
              .filter(Boolean)
              .slice(0, 4)}
          />
        </section>
      )}
      {reviewForm && (
        <Modal
          title="Share your experience"
          onClose={() => setReviewForm(false)}
        >
          <form
            className="stack-form"
            onSubmit={async (e) => {
              e.preventDefault()
              setBusy(true)
              setError("")
              const fd = new FormData(e.currentTarget)
              try {
                await post("products/" + id + "/reviews", {
                  rating: Number(fd.get("rating")),
                  title: fd.get("title"),
                  body: fd.get("body"),
                })
                const data = await api("products/" + id + "/reviews")
                setReviews(data.reviews)
                setReviewForm(false)
                notify("Thank you. Your review has been saved.")
              } catch (e) {
                setError(e.message)
              } finally {
                setBusy(false)
              }
            }}
          >
            {error && <Notice type="error">{error}</Notice>}
            <Field label="Your rating">
              <select name="rating" required>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} star{n > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Review title"
              name="title"
              minLength={3}
              maxLength={100}
              required
            />
            <Field label="Your experience">
              <textarea
                name="body"
                minLength={10}
                maxLength={2000}
                required
                rows={5}
              />
            </Field>
            <Button type="submit" busy={busy}>
              Publish review
            </Button>
          </form>
        </Modal>
      )}
    </main>
  )
}

export function Wishlist() {
  const { products, wishlist } = useStore()
  const items = wishlist
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean)
  return (
    <main className="container standard-page">
      <Breadcrumb items={[{ label: "Wishlist" }]} />
      <PageHeading
        eyebrow="SAVED FOR ANOTHER DAY"
        title="Your favourites, together."
      >
        {items.length} products saved. A little inspiration for what comes next.
      </PageHeading>
      {items.length ? (
        <ProductGrid products={items} />
      ) : (
        <Empty
          icon={Heart}
          title="Make a little room for favourites."
          action={
            <ActionLink href="/collections/shop/">
              Explore the collection
            </ActionLink>
          }
        >
          Tap the heart on a product to save it here.
        </Empty>
      )}
    </main>
  )
}

export function Compare() {
  const { products, compare, toggleCompare } = useStore()
  const items = compare
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean)
  const specNames = [
    ...new Set(items.flatMap((p) => p.specifications.map(([k]) => k))),
  ]
  return (
    <main className="container standard-page">
      <Breadcrumb items={[{ label: "Compare" }]} />
      <PageHeading
        eyebrow="THE DETAILS, SIDE BY SIDE"
        title="Choose with clarity."
      >
        Compare up to four products. Focus on the features that matter to you.
      </PageHeading>
      {items.length ? (
        <div className="comparison-scroll">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>At a glance</th>
                {items.map((p) => (
                  <th key={p.id}>
                    <IconButton
                      label={"Remove " + p.name}
                      onClick={() => toggleCompare(p.id)}
                    >
                      <X size={15} />
                    </IconButton>
                    <a href={productPath(p)}>
                      <img src={p.image} alt="" />
                      <strong>{p.name}</strong>
                    </a>
                    <ProductOffer product={p} compact />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Brand", (p) => p.brand],
                ["Category", (p) => categoryName(p.category)],
                ["Condition", (p) => p.condition],
                ...specNames.map((key) => [
                  key,
                  (p) => p.specifications.find(([k]) => k === key)?.[1] || "—",
                ]),
              ].map(([name, get]) => (
                <tr key={name}>
                  <th>{name}</th>
                  {items.map((p) => (
                    <td key={p.id}>{get(p)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          icon={GitCompareArrows}
          title="The right choice starts with a comparison."
          action={
            <ActionLink href="/collections/shop/">
              Find products to compare
            </ActionLink>
          }
        >
          Use the comparison icon on a product to put your options side by side.
        </Empty>
      )}
    </main>
  )
}

export function NotFound() {
  return (
    <main className="container standard-page">
      <Empty
        icon={Search}
        title="That page has moved on."
        action={<ActionLink href="/">Back to London Tech</ActionLink>}
      >
        The page or product you are looking for could not be found.
      </Empty>
    </main>
  )
}
