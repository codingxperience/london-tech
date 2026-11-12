import { useLocale } from "../lib/locale.jsx"
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
  const { t } = useLocale()
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
  const p = products.find((p) => p.id === id && p.active !== false)

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
        if (!Array.isArray(r.reviews)) throw new Error("Reviews are unavailable")
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
        notify(t("Choose your preferred options."))
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
            label: t(categoryName(p.category)),
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
              {p.brand} / {t(categoryName(p.category))}
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
                  {t(reviews.length === 1 ? "{count} verified review" : "{count} verified reviews", { count: reviews.length })}
                </a>
              </>
            ) : (
              <a href="#product-reviews">{t("No customer reviews yet")}</a>
            )}
            <span
              className={"stock-status " + (p.stock > 0 ? "available" : "")}
            >
              {t(availability)}
            </span>
          </div>
          <p className="product-description">
            {t(productInformation(p).description)}
          </p>
          <div className="detail-quick-specs">
            {productInformation(p)
              .specifications.slice(0, 3)
              .map(([label, value]) => (
                <span key={label}>
                  <small>{t(label)}</small>
                  <strong>{t(value)}</strong>
                </span>
              ))}
          </div>
          <div className="product-price">
            <ProductOffer product={p} />
            {(p.price == null || !p.priceConfirmed) && (
              <span>
                  {p.price == null
                  ? t("Request the current price and configuration before purchase.")
                  : t("Estimated price. Confirm the selected configuration and current selling price before payment.")}
              </span>
            )}
          </div>
          {p.options.length > 0 && (
            <fieldset className="option-selector">
              <legend>
                {t("Configuration")} <b>{option || t("Choose an option")}</b>
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
                {t("Colour")} <b>{color || t("Choose a colour")}</b>
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
              {t("Add to cart")}
              <ArrowRight size={17} />
            </Button>
            <IconButton
              label={
                wishlist.includes(id)
                  ? t("Remove from wishlist")
                  : t("Save to wishlist")
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
              ? t("Request this item")
              : t("Continue to checkout")}
            <ArrowUpRight size={17} />
          </Button>
          <div className="product-auxiliary">
            <button onClick={() => toggleCompare(id)}>
              <GitCompareArrows size={15} />
              {compare.includes(id)
                ? t("Remove from comparison")
                : t("Add to comparison")}
            </button>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(location.href)
                  notify(t("Product link copied"))
                } catch {
                  notify(t("Copy the link from your address bar."))
                }
              }}
            >
              <Copy size={14} />
              {t("Share product")}
            </button>
          </div>
          <div className="product-assurances">
            <p>
              <ShieldCheck size={18} />
              <span>
                <strong>{t("Secure checkout")}</strong>
                <small>
                  {t("Card and mobile money handled by Flutterwave.")}
                </small>
              </span>
            </p>
            <p>
              <Truck size={18} />
              <span>
                <strong>{t("Delivery & collection")}</strong>
                <small>
                  {p.delivery ||
                    t("Confirm availability and delivery details before paying.")}
                </small>
              </span>
            </p>
            <p>
              <PackageCheck size={18} />
              <span>
                <strong>{t("Product condition")}</strong>
                <small>
                  {t(p.condition)}. {" "}
                  {t(p.warranty || "Ask about the warranty for this item.")}
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
          <SectionHeading title={t("Worth another look.")} />
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
          title={t("Share your experience")}
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
                notify(t("Thank you. Your review has been saved."))
              } catch (e) {
                setError(e.message)
              } finally {
                setBusy(false)
              }
            }}
          >
            {error && <Notice type="error">{error}</Notice>}
            <Field label={t("Your rating")}>
              <select name="rating" required>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {t(n === 1 ? "{count} star" : "{count} stars", { count: n })}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label={t("Review title")}
              name="title"
              minLength={3}
              maxLength={100}
              required
            />
            <Field label={t("Your experience")}>
              <textarea
                name="body"
                minLength={10}
                maxLength={2000}
                required
                rows={5}
              />
            </Field>
            <Button type="submit" busy={busy}>
              {t("Publish review")}
            </Button>
          </form>
        </Modal>
      )}
    </main>
  )
}

export function Wishlist() {
  const { t } = useLocale()
  const { products, wishlist } = useStore()
  const items = wishlist
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean)
  return (
    <main className="container standard-page">
      <Breadcrumb items={[{ label: t("Wishlist") }]} />
      <PageHeading
        eyebrow={t("SAVED FOR ANOTHER DAY")}
        title={t("Your favourites, together.")}
      >
        {t("{count} products saved. A little inspiration for what comes next.", { count: items.length })}
      </PageHeading>
      {items.length ? (
        <ProductGrid products={items} />
      ) : (
        <Empty
          icon={Heart}
          title={t("Make a little room for favourites.")}
          action={
            <ActionLink href="/collections/shop/">
              {t("Explore the collection")}
            </ActionLink>
          }
        >
          {t("Tap the heart on a product to save it here.")}
        </Empty>
      )}
    </main>
  )
}

export function Compare() {
  const { t } = useLocale()
  const { products, compare, toggleCompare } = useStore()
  const items = compare
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean)
  const specNames = [
    ...new Set(items.flatMap((p) => p.specifications.map(([k]) => k))),
  ]
  return (
    <main className="container standard-page">
      <Breadcrumb items={[{ label: t("Compare") }]} />
      <PageHeading
        eyebrow={t("THE DETAILS, SIDE BY SIDE")}
        title={t("Choose with clarity.")}
      >
        {t("Compare up to four products. Focus on the features that matter to you.")}
      </PageHeading>
      {items.length ? (
        <div className="comparison-scroll">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>{t("At a glance")}</th>
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
          title={t("The right choice starts with a comparison.")}
          action={
            <ActionLink href="/collections/shop/">
              {t("Find products to compare")}
            </ActionLink>
          }
        >
          {t("Use the comparison icon on a product to put your options side by side.")}
        </Empty>
      )}
    </main>
  )
}

export function NotFound() {
  const { t } = useLocale()
  return (
    <main className="container standard-page">
      <Empty
        icon={Search}
        title={t("That page has moved on.")}
        action={<ActionLink href="/">{t("Back to London Tech")}</ActionLink>}
      >
        {t("The page or product you are looking for could not be found.")}
      </Empty>
    </main>
  )
}
