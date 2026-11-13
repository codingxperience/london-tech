import { useLocale } from "../lib/locale.jsx"
import React, { useEffect, useId, useState } from "react"
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react"
import { DiscoveryRail } from "../components/DiscoveryRail.jsx"
import { useStore } from "../store.jsx"
import { categories, categoryName, money } from "../data/catalog.js"
import { productImagePlaceholder, showProductImageFallback } from "../lib/product-image.js"
import {
  collectionQuery,
  readCollectionFilters,
  scopeCollection,
  selectCollection,
} from "../lib/collection-filters.js"
import {
  Breadcrumb,
  Button,
  Empty,
  Field,
  IconButton,
  Modal,
  PageHeading,
} from "../components/ui.jsx"
import { ProductGrid } from "../components/storefront.jsx"

export function Collection({ category = "shop" }) {
  const { t, formatNumber } = useLocale()
  const { products, initialPath } = useStore()
  const requestPath =
    initialPath ??
    (typeof location === "undefined"
      ? "/"
      : location.pathname + location.search)
  const [filters, setFilters] = useState(() =>
    readCollectionFilters(requestPath.split("?")[1] || ""),
  )
  const [draftMin, setDraftMin] = useState(filters.min),
    [draftMax, setDraftMax] = useState(filters.max)
  const [priceError, setPriceError] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)
  const [brandSearch, setBrandSearch] = useState("")
  const [showBrands, setShowBrands] = useState(false)
  const [discovery, setDiscovery] = useState("recommended")
  const discoveryId = useId()
  const all = scopeCollection(products, category)
  const brands = [...new Set(all.map((p) => p.brand).filter(Boolean))].sort()
  const filtered = selectCollection(all, filters, t)
  const pages = Math.max(1, Math.ceil(filtered.length / 12)),
    page = Math.min(filters.page, pages)
  const pageNumbers =
    pages <= 5
      ? Array.from({ length: pages }, (_, index) => index + 1)
      : [...new Set([1, ...(page > 2 ? [page - 1] : []), page, ...(page < pages - 1 ? [page + 1] : []), pages])].sort((a, b) => a - b)
  const shown = filtered.slice((page - 1) * 12, page * 12)
  const active =
    filters.brands.length +
    Number(filters.min !== "" || filters.max !== "") +
    Number(filters.inStock)
  const title =
    category === "shop"
      ? "Everything in shop."
      : category === "hot-deals"
        ? "Hot deals, while they last."
      : category === "apple-products-london"
        ? "The Apple collection."
        : category === "iphones-london"
          ? "Find your next iPhone."
          : category === "samsung-galaxy-ultra-london"
            ? "The Galaxy Ultra collection."
            : t(categoryName(category)) + "."
  const recommended = categories
    .map((item) => ({
      ...item,
      product: products.find(
        (product) => product.category === item.id && product.active !== false &&
          product.image && product.image !== productImagePlaceholder,
      ),
    }))
    .filter((item) => item.product)

  useEffect(() => {
    history.replaceState(
      history.state,
      "",
      location.pathname + collectionQuery(filters),
    )
    window.dispatchEvent(new Event("lt:location-meta"))
  }, [filters])
  const change = (values) =>
    setFilters((current) => ({ ...current, ...values, page: 1 }))
  const clear = () => {
    setFilters(readCollectionFilters())
    setDraftMin("")
    setDraftMax("")
    setPriceError("")
    setBrandSearch("")
  }
  const toggleBrand = (brand) =>
    change({
      brands: filters.brands.includes(brand)
        ? filters.brands.filter((value) => value !== brand)
        : [...filters.brands, brand],
    })
  const applyPrice = (event) => {
    event.preventDefault()
    if (
      (draftMin !== "" &&
        (!Number.isFinite(Number(draftMin)) || Number(draftMin) < 0)) ||
      (draftMax !== "" &&
        (!Number.isFinite(Number(draftMax)) || Number(draftMax) < 0)) ||
      (draftMin !== "" &&
        draftMax !== "" &&
        Number(draftMin) > Number(draftMax))
    ) {
      setPriceError(t("Enter a price range with the minimum below the maximum."))
      return
    }
    setPriceError("")
    change({
      min: draftMin === "" ? "" : String(Number(draftMin)),
      max: draftMax === "" ? "" : String(Number(draftMax)),
    })
  }
  const tabKey = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return
    event.preventDefault()
    const next =
      event.key === "Home"
        ? "recommended"
        : event.key === "End"
          ? "brands"
          : discovery === "brands"
            ? "recommended"
            : "brands"
    setDiscovery(next)
    document.getElementById(discoveryId + "-" + next)?.focus()
  }
  const searchedBrands = brands.filter((brand) =>
    brand.toLowerCase().includes(brandSearch.toLowerCase()),
  )
  const visibleBrands =
    showBrands || brandSearch ? searchedBrands : searchedBrands.slice(0, 6)
  const controls = (
    <div className="refined-filter-content">
      <div className="refined-filter-heading">
        <span>
          <SlidersHorizontal size={17} />
          {t("Filters")}
          {active > 0 && <b>{formatNumber(active)}</b>}
        </span>
        {(active > 0 || filters.query) && (
          <button type="button" onClick={clear}>
            {t("Reset")}
          </button>
        )}
      </div>
      <details className="refined-filter-group" open>
        <summary>
          {t("Brand")}
          <ChevronDown size={15} />
        </summary>
        {brands.length > 6 && (
          <label className="filter-brand-search">
            <Search size={14} />
            <input
              aria-label={t("Search brands")}
              placeholder={t("Find a brand")}
              value={brandSearch}
              onChange={(event) => setBrandSearch(event.target.value)}
            />
          </label>
        )}
        <div className="refined-brand-options">
          {visibleBrands.map((brand) => (
            <label key={brand}>
              <input
                type="checkbox"
                checked={filters.brands.includes(brand)}
                onChange={() => toggleBrand(brand)}
              />
              <span>{brand}</span>
              <small>
                {formatNumber(all.filter((p) => p.brand === brand).length)}
              </small>
            </label>
          ))}
        </div>
        {!searchedBrands.length && (
          <p className="filter-note">{t("No matching brands.")}</p>
        )}
        {brands.length > 6 && !brandSearch && (
          <button
            className="filter-show-more"
            onClick={() => setShowBrands(!showBrands)}
          >
            {showBrands
              ? t("Show fewer")
              : t("View all {count} brands", {
                  count: formatNumber(brands.length),
                })}
            <ChevronDown size={13} />
          </button>
        )}
      </details>
      <details className="refined-filter-group" open>
        <summary>
          {t("Price")} <small>{t("UGX")}</small>
          <ChevronDown size={15} />
        </summary>
        <form className="refined-price-form" onSubmit={applyPrice}>
          <div>
            <Field
              label="From"
              aria-invalid={!!priceError}
              type="number"
              min="0"
              step="any"
              inputMode="numeric"
              placeholder={t("Min")}
              value={draftMin}
              onChange={(event) => setDraftMin(event.target.value)}
            />
            <span>—</span>
            <Field
              label="To"
              aria-invalid={!!priceError}
              type="number"
              min="0"
              step="any"
              inputMode="numeric"
              placeholder={t("Max")}
              value={draftMax}
              onChange={(event) => setDraftMax(event.target.value)}
            />
          </div>
          {priceError && (
            <p className="filter-price-error" role="alert">
              {priceError}
            </p>
          )}
          <Button variant="secondary" type="submit">
            Apply price
          </Button>
        </form>
      </details>
      <details className="refined-filter-group" open>
        <summary>
          {t("Availability")}
          <ChevronDown size={15} />
        </summary>
        <label className="refined-availability">
          <input
            type="checkbox"
            checked={filters.inStock}
            onChange={(event) => change({ inStock: event.target.checked })}
          />
          <span>{t("Confirmed in stock")}</span>
        </label>
      </details>
      <p className="filter-note">
        Guide prices are confirmed by the store before payment.
      </p>
    </div>
  )

  return (
    <main className="container collection-page refined-collection">
      <Breadcrumb
        items={[
          {
            label: t("Shop"),
            href: category === "shop" ? undefined : "/collections/shop/",
          },
          ...(category !== "shop" ? [{ label: t(title.replace(/\.$/, "")) }] : []),
        ]}
      />
      <PageHeading title={t(title)}>
        {t(categories.find((item) => item.id === category)?.description ||
          "Find the technology that fits your everyday.")}
      </PageHeading>
      <section
        className="collection-discovery"
        aria-label={t("Explore categories and brands")}
      >
        <div className="discovery-heading">
          <div
            className="discovery-tabs"
            role="tablist"
            aria-label={t("Discover products")}
          >
            {[
              ["recommended", "Recommended"],
              ["brands", "Shop by brand"],
            ].map(([id, label]) => (
              <button
                type="button"
                role="tab"
                id={discoveryId + "-" + id}
                key={id}
                aria-controls={discoveryId + "-panel"}
                aria-selected={discovery === id}
                tabIndex={discovery === id ? 0 : -1}
                onClick={() => setDiscovery(id)}
                onKeyDown={tabKey}
              >
                {t(label)}
              </button>
            ))}
          </div>
        </div>
        <DiscoveryRail
          id={discoveryId + "-panel"}
          labelledBy={discoveryId + "-" + discovery}
          resetKey={category + ":" + discovery}
        >
          {discovery === "recommended"
            ? recommended.map((item) => (
                <a
                  className={
                    "discovery-tile" + (item.id === category ? " selected" : "")
                  }
                  href={`/collections/${item.id}/`}
                  key={item.id}
                >
                  <span>
                    <img src={item.product.image} alt="" loading="lazy" onError={showProductImageFallback} />
                  </span>
                  <strong>{t(item.name)}</strong>
                </a>
              ))
            : brands.map((brand) => {
                const representative = all.find((p) => p.brand === brand)
                return (
                  <button
                    type="button"
                    className={
                      "discovery-tile" +
                      (filters.brands.includes(brand) ? " selected" : "")
                    }
                    key={brand}
                    aria-pressed={filters.brands.includes(brand)}
                    onClick={() =>
                      change({
                        brands:
                          filters.brands.length === 1 &&
                          filters.brands[0] === brand
                            ? []
                            : [brand],
                      })
                    }
                  >
                    <span>
                      <img src={representative.image} alt="" loading="lazy" onError={showProductImageFallback} />
                      {filters.brands.includes(brand) && (
                        <i>
                          <Check size={12} />
                        </i>
                      )}
                    </span>
                    <strong>{brand}</strong>
                  </button>
                )
              })}
        </DiscoveryRail>
      </section>
      <div className="collection-layout">
        <aside
          className="collection-sidebar refined-sidebar"
          aria-label={t("Product filters")}
        >
          {controls}
        </aside>
        <section
          className="collection-results"
          aria-label={t("Collection products")}
        >
          <div className="collection-toolbar refined-toolbar">
            <div className="collection-result-total" role="status">
              {formatNumber(filtered.length)}
              <span> {t(filtered.length === 1 ? "product" : "products")}</span>
            </div>
            <div className="catalog-search">
              <Search size={16} />
              <input
                aria-label={t("Search this collection")}
                placeholder={t("Search this collection")}
                value={filters.query}
                onChange={(event) => change({ query: event.target.value })}
              />
            </div>
            <label className="collection-sort">
              <span>{t("Sort by")}</span>
              <select
                aria-label={t("Sort products")}
                value={filters.sort}
                onChange={(event) => change({ sort: event.target.value })}
              >
                <option value="featured">{t("Recommended")}</option>
                <option value="name">{t("Name: A–Z")}</option>
                <option value="price-low">{t("Price: low to high")}</option>
                <option value="price-high">{t("Price: high to low")}</option>
              </select>
            </label>
            <div className="view-toggle">
              <IconButton
                label={t("Grid view")}
                aria-pressed={filters.view === "grid"}
                onClick={() => change({ view: "grid" })}
              >
                <LayoutGrid size={17} />
              </IconButton>
              <IconButton
                label={t("List view")}
                aria-pressed={filters.view === "list"}
                onClick={() => change({ view: "list" })}
              >
                <List size={17} />
              </IconButton>
            </div>
            <Button
              variant="secondary mobile-filter"
              onClick={() => setFilterOpen(true)}
            >
              <SlidersHorizontal size={16} />
              {t("Filters")}
              {active > 0 && <b>{formatNumber(active)}</b>}
            </Button>
          </div>
          {active > 0 && (
            <div
              className="refined-filter-chips"
              aria-label={t("Active filters")}
            >
              {filters.brands.map((brand) => (
                <button
                  key={brand}
                  onClick={() => toggleBrand(brand)}
                  aria-label={t("Remove {name} filter", { name: brand })}
                >
                  {brand}
                  <X size={13} />
                </button>
              ))}
              {(filters.min !== "" || filters.max !== "") && (
                <button
                  onClick={() => {
                    change({ min: "", max: "" })
                    setDraftMin("")
                    setDraftMax("")
                  }}
                  aria-label={t("Remove price filter")}
                >
                  {filters.min !== ""
                    ? money(Number(filters.min))
                    : t("Any price")}{" "}
                  –{" "}
                  {filters.max !== ""
                    ? money(Number(filters.max))
                    : t("and above")}
                  <X size={13} />
                </button>
              )}
              {filters.inStock && (
                <button
                  onClick={() => change({ inStock: false })}
                  aria-label={t("Remove availability filter")}
                >
                  {t("In stock")}
                  <X size={13} />
                </button>
              )}
              <button className="reset-all" onClick={clear}>
                {t("Clear all")}
              </button>
            </div>
          )}
          {shown.length ? (
            <div className={filters.view === "list" ? "catalog-list" : ""}>
              <ProductGrid products={shown} detailed />
            </div>
          ) : (
            <Empty
              icon={Search}
              title={t("No products match just yet.")}
              action={
                <Button variant="secondary" onClick={clear}>
                  {t("Reset filters")}
                </Button>
              }
            >
              {t("Try another brand, price range or search term.")}
            </Empty>
          )}
          {pages > 1 && (
            <nav className="pagination" aria-label={t("Product pages")}>
              {page > 1 ? (
                <a
                  className="icon-button"
                  aria-label={t("Previous page")}
                  href={
                    requestPath.split("?")[0] +
                    collectionQuery({ ...filters, page: page - 1 })
                  }
                  rel="prev"
                >
                  <ChevronLeft size={17} />
                </a>
              ) : (
                <span className="icon-button" aria-disabled="true">
                  <ChevronLeft size={17} />
                </span>
              )}
              {pageNumbers.map((pageNumber, index) => (
                <React.Fragment key={pageNumber}>
                  {index > 0 && pageNumber - pageNumbers[index - 1] > 1 && (
                    <span className="pagination-ellipsis" aria-hidden="true">…</span>
                  )}
                  <a
                    href={
                      requestPath.split("?")[0] +
                      collectionQuery({ ...filters, page: pageNumber })
                    }
                    className={page === pageNumber ? "active" : ""}
                    aria-current={page === pageNumber ? "page" : undefined}
                  >
                    {formatNumber(pageNumber)}
                  </a>
                </React.Fragment>
              ))}
              {page < pages ? (
                <a
                  className="icon-button"
                  aria-label={t("Next page")}
                  href={
                    requestPath.split("?")[0] +
                    collectionQuery({ ...filters, page: page + 1 })
                  }
                  rel="next"
                >
                  <ChevronRight size={17} />
                </a>
              ) : (
                <span className="icon-button" aria-disabled="true">
                  <ChevronRight size={17} />
                </span>
              )}
            </nav>
          )}
        </section>
      </div>
      {filterOpen && (
        <Modal
          title={t("Filter products")}
          drawer
          className="collection-filter-dialog"
          onClose={() => setFilterOpen(false)}
        >
          {controls}
          <div className="refined-mobile-filter-actions">
            <Button variant="secondary" onClick={clear}>
              {t("Clear")}
            </Button>
            <Button onClick={() => setFilterOpen(false)}>
              {t("Show {count} products", { count: filtered.length })}
              <ArrowRight size={16} />
            </Button>
          </div>
        </Modal>
      )}
    </main>
  )
}
