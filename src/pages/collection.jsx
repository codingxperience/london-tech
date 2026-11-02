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
  const filtered = selectCollection(all, filters)
  const pages = Math.max(1, Math.ceil(filtered.length / 12)),
    page = Math.min(filters.page, pages)
  const shown = filtered.slice((page - 1) * 12, page * 12)
  const active =
    filters.brands.length +
    Number(filters.min !== "" || filters.max !== "") +
    Number(filters.inStock)
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
  const recommended = categories
    .map((item) => ({
      ...item,
      product: products.find(
        (product) => product.category === item.id && product.active !== false,
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
      setPriceError("Enter a price range with the minimum below the maximum.")
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
          Filters{active > 0 && <b>{active}</b>}
        </span>
        {(active > 0 || filters.query) && (
          <button type="button" onClick={clear}>
            Reset
          </button>
        )}
      </div>
      <details className="refined-filter-group" open>
        <summary>
          Brand
          <ChevronDown size={15} />
        </summary>
        {brands.length > 6 && (
          <label className="filter-brand-search">
            <Search size={14} />
            <input
              aria-label="Search brands"
              placeholder="Find a brand"
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
              <small>{all.filter((p) => p.brand === brand).length}</small>
            </label>
          ))}
        </div>
        {!searchedBrands.length && (
          <p className="filter-note">No matching brands.</p>
        )}
        {brands.length > 6 && !brandSearch && (
          <button
            className="filter-show-more"
            onClick={() => setShowBrands(!showBrands)}
          >
            {showBrands ? "Show fewer" : `View all ${brands.length} brands`}
            <ChevronDown size={13} />
          </button>
        )}
      </details>
      <details className="refined-filter-group" open>
        <summary>
          Price <small>UGX</small>
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
              placeholder="Min"
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
              placeholder="Max"
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
          Availability
          <ChevronDown size={15} />
        </summary>
        <label className="refined-availability">
          <input
            type="checkbox"
            checked={filters.inStock}
            onChange={(event) => change({ inStock: event.target.checked })}
          />
          <span>Confirmed in stock</span>
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
            label: "Shop",
            href: category === "shop" ? undefined : "/collections/shop/",
          },
          ...(category !== "shop" ? [{ label: title.replace(/\.$/, "") }] : []),
        ]}
      />
      <PageHeading title={title}>
        {categories.find((item) => item.id === category)?.description ||
          "Find the technology that fits your everyday."}
      </PageHeading>
      <section
        className="collection-discovery"
        aria-label="Explore categories and brands"
      >
        <div className="discovery-heading">
          <div
            className="discovery-tabs"
            role="tablist"
            aria-label="Discover products"
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
                {label}
              </button>
            ))}
          </div>
        </div>
        <DiscoveryRail
          id={discoveryId + "-panel"}
          labelledBy={discoveryId + "-" + discovery}
          resetKey={discovery}
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
                    <img src={item.product.image} alt="" loading="lazy" />
                  </span>
                  <strong>{item.name}</strong>
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
                      <img src={representative.image} alt="" loading="lazy" />
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
          aria-label="Product filters"
        >
          {controls}
        </aside>
        <section
          className="collection-results"
          aria-label="Collection products"
        >
          <div className="collection-toolbar refined-toolbar">
            <div className="collection-result-total" role="status">
              {filtered.length}
              <span> product{filtered.length === 1 ? "" : "s"}</span>
            </div>
            <div className="catalog-search">
              <Search size={16} />
              <input
                aria-label="Search this collection"
                placeholder="Search this collection"
                value={filters.query}
                onChange={(event) => change({ query: event.target.value })}
              />
            </div>
            <label className="collection-sort">
              <span>Sort by</span>
              <select
                aria-label="Sort products"
                value={filters.sort}
                onChange={(event) => change({ sort: event.target.value })}
              >
                <option value="featured">Recommended</option>
                <option value="name">Name: A–Z</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
              </select>
            </label>
            <div className="view-toggle">
              <IconButton
                label="Grid view"
                aria-pressed={filters.view === "grid"}
                onClick={() => change({ view: "grid" })}
              >
                <LayoutGrid size={17} />
              </IconButton>
              <IconButton
                label="List view"
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
              Filters{active > 0 && <b>{active}</b>}
            </Button>
          </div>
          {active > 0 && (
            <div className="refined-filter-chips" aria-label="Active filters">
              {filters.brands.map((brand) => (
                <button
                  key={brand}
                  onClick={() => toggleBrand(brand)}
                  aria-label={`Remove ${brand} filter`}
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
                  aria-label="Remove price filter"
                >
                  {filters.min !== ""
                    ? money(Number(filters.min))
                    : "Any price"}{" "}
                  –{" "}
                  {filters.max !== ""
                    ? money(Number(filters.max))
                    : "and above"}
                  <X size={13} />
                </button>
              )}
              {filters.inStock && (
                <button
                  onClick={() => change({ inStock: false })}
                  aria-label="Remove availability filter"
                >
                  In stock
                  <X size={13} />
                </button>
              )}
              <button className="reset-all" onClick={clear}>
                Clear all
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
              title="No products match just yet."
              action={
                <Button variant="secondary" onClick={clear}>
                  Reset filters
                </Button>
              }
            >
              Try another brand, price range or search term.
            </Empty>
          )}
          {pages > 1 && (
            <nav className="pagination" aria-label="Product pages">
              {page > 1 ? (
                <a
                  className="icon-button"
                  aria-label="Previous page"
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
              {Array.from({ length: pages }, (_, index) => (
                <a
                  key={index}
                  href={
                    requestPath.split("?")[0] +
                    collectionQuery({ ...filters, page: index + 1 })
                  }
                  className={page === index + 1 ? "active" : ""}
                  aria-current={page === index + 1 ? "page" : undefined}
                >
                  {index + 1}
                </a>
              ))}
              {page < pages ? (
                <a
                  className="icon-button"
                  aria-label="Next page"
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
          title="Filter products"
          drawer
          className="collection-filter-dialog"
          onClose={() => setFilterOpen(false)}
        >
          {controls}
          <div className="refined-mobile-filter-actions">
            <Button variant="secondary" onClick={clear}>
              Clear
            </Button>
            <Button onClick={() => setFilterOpen(false)}>
              Show {filtered.length} products
              <ArrowRight size={16} />
            </Button>
          </div>
        </Modal>
      )}
    </main>
  )
}
