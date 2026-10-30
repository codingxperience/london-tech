import React, { useEffect, useMemo, useState } from "react"

import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Heart,
  GitCompareArrows,
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  PackageCheck,
  ShieldCheck,
  Truck,
  ZoomIn,
  X,
  Star,
  MapPin,
  Copy,
} from "lucide-react"

import { useStore, navigate } from "../store.jsx"

import {
  asset,
  categories,
  categoryName,
  money,
  productPath,
} from "../data/catalog.js"

import { api, post, dateLabel } from "../lib/api.js"

import {
  ActionLink,
  Badge,
  Breadcrumb,
  Button,
  CheckList,
  Empty,
  Field,
  IconButton,
  Modal,
  Notice,
  PageHeading,
  Quantity,
} from "../components/ui.jsx"

import {
  CategoryIcon,
  PaymentMarks,
  ProductCard,
  ProductGrid,
  SectionHeading,
} from "../components/storefront.jsx"

export function Collection({ category = "shop" }) {
  const { products } = useStore()
  const initial = new URLSearchParams(location.search)

  const [query, setQuery] = useState(initial.get("q") || ""),
    [brands, setBrands] = useState([]),
    [inStock, setInStock] = useState(false),
    [maxPrice, setMaxPrice] = useState(""),
    [sort, setSort] = useState("featured"),
    [view, setView] = useState("grid"),
    [page, setPage] = useState(1),
    [filterOpen, setFilterOpen] = useState(false)

  const all =
    category === "shop"
      ? products
      : category === "apple-products-london"
        ? products.filter((p) => p.brand === "Apple")
        : category === "iphones-london"
          ? products.filter((p) => /iphone/i.test(p.name))
          : category === "samsung-galaxy-ultra-london"
            ? products.filter((p) => /Galaxy.*Ultra/i.test(p.name))
            : products.filter((p) => p.category === category)

  const availableBrands = [...new Set(all.map((p) => p.brand))].sort()

  const filtered = all
    .filter(
      (p) =>
        (!query ||
          (p.name + " " + p.brand + " " + p.sku)
            .toLowerCase()
            .includes(query.toLowerCase())) &&
        (!brands.length || brands.includes(p.brand)) &&
        (!inStock || p.stock > 0) &&
        (!maxPrice || (p.price != null && p.price <= Number(maxPrice))),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "price-low"
          ? (a.price ?? Infinity) - (b.price ?? Infinity)
          : sort === "price-high"
            ? (b.price ?? -Infinity) - (a.price ?? -Infinity)
            : Number(b.featured) - Number(a.featured),
    )

  const pageSize = 12,
    totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const shown = filtered.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => setPage(1), [query, brands, inStock, maxPrice, sort])

  const clear = () => {
    setBrands([])
    setInStock(false)
    setMaxPrice("")
    setQuery("")
  }

  const title =
    category === "shop"
      ? "Everything in shop."
      : category === "apple-products-london"
        ? "The Apple collection."
        : category === "iphones-london"
          ? "Find your next iPhone."
          : category === "samsung-galaxy-ultra-london"
            ? "The Galaxy Ultra collection."
            : categoryName(category) + "."

  const filters = (
    <div className="filter-content">
      <div className="filter-section">
        <h3>Categories</h3>
        <a
          className={category === "shop" ? "active" : ""}
          href="/collections/shop/"
        >
          All products <span>{products.length}</span>
        </a>
        {categories.map((c) => (
          <a
            key={c.id}
            href={"/collections/" + c.id + "/"}
            className={category === c.id ? "active" : ""}
          >
            <span>{c.name}</span>
            <span>{products.filter((p) => p.category === c.id).length}</span>
          </a>
        ))}
      </div>
      <div className="filter-section">
        <h3>Brand</h3>
        {availableBrands.map((b) => (
          <label className="checkbox-label" key={b}>
            <input
              type="checkbox"
              checked={brands.includes(b)}
              onChange={() =>
                setBrands(
                  brands.includes(b)
                    ? brands.filter((x) => x !== b)
                    : [...brands, b],
                )
              }
            />
            <span>{b}</span>
          </label>
        ))}
      </div>
      <div className="filter-section">
        <h3>Price & availability</h3>
        <Field
          label="Maximum price (UGX)"
          type="number"
          min="0"
          placeholder="Any price"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => setInStock(e.target.checked)}
          />
          Confirmed in stock
        </label>
        <small className="muted">
          Unlisted prices can be requested from the store.
        </small>
      </div>
      <button className="text-link" onClick={clear}>
        Clear all filters
        <X size={12} />
      </button>
    </div>
  )

  return (
    <main className="container collection-page">
      <Breadcrumb
        items={[
          {
            label: "Shop",
            href: category === "shop" ? undefined : "/collections/shop/",
          },
          ...(category !== "shop" ? [{ label: title.replace(/\.$/, "") }] : []),
        ]}
      />
      <PageHeading eyebrow="THE COLLECTION" title={title}>
        {categories.find((c) => c.id === category)?.description ||
          "Find the technology that fits your life. Explore the details and compare your favourites."}
      </PageHeading>
      <div className="collection-layout">
        <aside className="collection-sidebar">{filters}</aside>
        <div>
          <div className="collection-toolbar">
            <div className="catalog-search">
              <Search size={16} />
              <input
                placeholder="Search this collection"
                aria-label="Search this collection"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <span className="results-count">{filtered.length} products</span>
            <select
              aria-label="Sort products"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="featured">Featured first</option>
              <option value="name">Name: A–Z</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
            </select>
            <div className="view-toggle">
              <IconButton
                label="Grid view"
                aria-pressed={view === "grid"}
                onClick={() => setView("grid")}
              >
                <LayoutGrid size={17} />
              </IconButton>
              <IconButton
                label="List view"
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
              >
                <List size={17} />
              </IconButton>
            </div>
            <Button
              variant="secondary mobile-filter"
              onClick={() => setFilterOpen(true)}
            >
              <SlidersHorizontal size={15} />
              Filter
            </Button>
          </div>
          {(brands.length > 0 || inStock || maxPrice) && (
            <div className="filter-chips">
              {brands.map((b) => (
                <button
                  key={b}
                  onClick={() => setBrands(brands.filter((x) => x !== b))}
                >
                  {b}
                  <X size={11} />
                </button>
              ))}
              {inStock && (
                <button onClick={() => setInStock(false)}>
                  In stock
                  <X size={11} />
                </button>
              )}
              {maxPrice && (
                <button onClick={() => setMaxPrice("")}>
                  Up to {money(Number(maxPrice))}
                  <X size={11} />
                </button>
              )}
            </div>
          )}
          {shown.length ? (
            <div className={view === "list" ? "catalog-list" : ""}>
              <ProductGrid products={shown} />
            </div>
          ) : (
            <Empty
              icon={Search}
              title="Nothing matches just yet."
              action={<Button onClick={clear}>Clear filters</Button>}
            >
              Try a different brand, category or price range.
            </Empty>
          )}
          {totalPages > 1 && (
            <nav className="pagination" aria-label="Product pages">
              <IconButton
                label="Previous page"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft size={17} />
              </IconButton>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  className={page === i + 1 ? "active" : ""}
                  onClick={() => {
                    setPage(i + 1)
                    window.scrollTo({ top: 250, behavior: "smooth" })
                  }}
                  aria-current={page === i + 1 ? "page" : undefined}
                >
                  {i + 1}
                </button>
              ))}
              <IconButton
                label="Next page"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight size={17} />
              </IconButton>
            </nav>
          )}
        </div>
      </div>
      {filterOpen && (
        <Modal
          title="Refine your collection"
          drawer
          onClose={() => setFilterOpen(false)}
        >
          {filters}
          <Button onClick={() => setFilterOpen(false)}>
            Show {filtered.length} products
            <ArrowRight size={16} />
          </Button>
        </Modal>
      )}
    </main>
  )
}

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
  } = useStore()
  const p = products.find((p) => p.id === id)

  const [image, setImage] = useState(0),
    [zoom, setZoom] = useState(false),
    [quantity, setQuantity] = useState(1),
    [option, setOption] = useState(""),
    [color, setColor] = useState(""),
    [tab, setTab] = useState("details"),
    [reviews, setReviews] = useState([]),
    [reviewForm, setReviewForm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("")

  useEffect(() => {
    if (p) viewProduct(p.id)
    api("products/" + id + "/reviews")
      .then((r) => setReviews(r.reviews))
      .catch(() => {})
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
        <div className="product-gallery">
          <button
            className="product-main-image"
            aria-label="Enlarge product image"
            onClick={() => setZoom(true)}
          >
            <img
              src={p.gallery[image]}
              alt={p.name + " — image " + (image + 1)}
              fetchPriority="high"
            />
            <span>
              <ZoomIn size={17} />
            </span>
          </button>
          <div className="product-thumbnails">
            {p.gallery.map((src, i) => (
              <button
                key={src}
                className={image === i ? "selected" : ""}
                aria-label={"View image " + (i + 1)}
                aria-pressed={image === i}
                onClick={() => setImage(i)}
              >
                <img src={src} alt="" />
              </button>
            ))}
          </div>
          <span className="gallery-note">
            Product images are for reference. Confirm the selected colour and
            configuration.
          </span>
        </div>
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
                <button onClick={() => setTab("reviews")}>
                  {reviews.length} verified review
                  {reviews.length !== 1 ? "s" : ""}
                </button>
              </>
            ) : (
              <button onClick={() => setTab("reviews")}>
                No customer reviews yet
              </button>
            )}
            <span
              className={"stock-status " + (p.stock > 0 ? "available" : "")}
            >
              {availability}
            </span>
          </div>
          <p className="product-description">{p.description}</p>
          <div className="product-price">
            <strong>{money(p.price)}</strong>
            {p.price != null && !p.priceConfirmed && (
              <Badge type="warning">Guide price</Badge>
            )}
            {p.comparePrice && p.price && p.comparePrice > p.price && (
              <del>{money(p.comparePrice)}</del>
            )}
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
      <section className="product-information">
        <div
          className="product-tabs"
          role="tablist"
          aria-label="Product information"
        >
          {[
            ["details", "Product details"],
            ["specs", "Specifications"],
            ["delivery", "Delivery & returns"],
            ["reviews", "Reviews (" + reviews.length + ")"],
          ].map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              id={"tab-" + id}
              aria-controls={"panel-" + id}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          className="product-tab-panel"
          role="tabpanel"
          id={"panel-" + tab}
          aria-labelledby={"tab-" + tab}
        >
          {tab === "details" ? (
            <div className="detail-copy-columns">
              <div>
                <p className="eyebrow">A CLOSER LOOK</p>
                <h2>{p.name}</h2>
                <p>{p.description}</p>
                <h3>Designed around your everyday.</h3>
                <p>
                  Take a moment to compare the features with what you need.
                  Check the selected model, storage, colour and compatibility
                  before completing your order.
                </p>
              </div>
              <div className="detail-card">
                <h3>Before you choose</h3>
                <CheckList
                  items={[
                    "Review the listed specifications and available options.",
                    "Confirm the product condition and included accessories.",
                    "Check delivery, collection and warranty information.",
                  ]}
                />
                <h4>What’s in the box</h4>
                <p>
                  {p.inTheBox ||
                    "Package contents depend on the selected configuration. Ask the store to confirm the included accessories before purchase."}
                </p>
              </div>
            </div>
          ) : tab === "specs" ? (
            <div>
              <h2>The details that matter.</h2>
              <div className="spec-table">
                {[
                  ["Brand", p.brand],
                  ["Product", p.name],
                  ["SKU", p.sku],
                  ["Category", categoryName(p.category)],
                  ...p.specifications,
                  ["Condition", p.condition],
                  ...(p.warranty ? [["Warranty", p.warranty]] : []),
                ].map(([k, v], i) => (
                  <div key={i}>
                    <span>{k}</span>
                    <strong>{v}</strong>
                  </div>
                ))}
              </div>
              <p className="muted small">
                Specifications describe the listed model. Regional versions,
                software features and available configurations may vary.
              </p>
            </div>
          ) : tab === "delivery" ? (
            <div className="detail-copy-columns">
              <div>
                <Truck size={25} />
                <h2>From our store to your day.</h2>
                <p>{p.delivery || settings.delivery}</p>
                <a href="/delivery/" className="text-link">
                  Delivery information
                  <ArrowRight size={15} />
                </a>
              </div>
              <div>
                <PackageCheck size={25} />
                <h2>A little peace of mind.</h2>
                <p>{p.warranty || settings.returns}</p>
                <a href="/returns/" className="text-link">
                  Returns & warranty
                  <ArrowRight size={15} />
                </a>
              </div>
            </div>
          ) : (
            <div>
              <div className="section-heading">
                <div>
                  <h2>What customers are saying.</h2>
                  <p className="muted">
                    Reviews come from customers with a verified purchase.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (!user) {
                      navigate(
                        "/login/?next=" + encodeURIComponent(productPath(p)),
                      )
                      return
                    }
                    setReviewForm(true)
                  }}
                >
                  Write a review
                </Button>
              </div>
              {reviews.length ? (
                <div className="review-list">
                  {reviews.map((r) => (
                    <article key={r.id}>
                      <div>
                        <span className="review-stars">
                          {"★".repeat(r.rating)}
                          {"☆".repeat(5 - r.rating)}
                        </span>
                        <Badge type="success">Verified purchase</Badge>
                        <small>{dateLabel(r.created_at)}</small>
                      </div>
                      <h3>{r.title}</h3>
                      <p>{r.body}</p>
                      <strong>{r.name}</strong>
                    </article>
                  ))}
                </div>
              ) : (
                <Empty icon={Star} title="Your experience belongs here.">
                  There are no reviews yet. Customers can share a review after
                  purchasing this product.
                </Empty>
              )}
            </div>
          )}
        </div>
      </section>
      <section className="section">
        <SectionHeading
          eyebrow="GOOD TOGETHER"
          title="You might also like."
          href={"/collections/" + p.category + "/"}
        />
        <ProductGrid
          products={products
            .filter((x) => x.category === p.category && x.id !== id)
            .slice(0, 4)}
        />
      </section>
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
      {zoom && (
        <Modal
          title={p.name}
          wide
          className="image-modal"
          onClose={() => setZoom(false)}
        >
          <img src={p.gallery[image]} alt={p.name} />
          <div className="image-controls">
            <IconButton
              label="Previous image"
              disabled={image === 0}
              onClick={() => setImage(image - 1)}
            >
              <ChevronLeft />
            </IconButton>
            <span>
              {image + 1} / {p.gallery.length}
            </span>
            <IconButton
              label="Next image"
              disabled={image === p.gallery.length - 1}
              onClick={() => setImage(image + 1)}
            >
              <ChevronRight />
            </IconButton>
          </div>
        </Modal>
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
                    <span>{money(p.price)}</span>
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
