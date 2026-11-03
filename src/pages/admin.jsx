import { BrandWordmark } from "../components/BrandWordmark.jsx"
import { Overview } from "../admin/Overview.jsx"
import { WorkspaceSection } from "../admin/Sections.jsx"
import { CheckoutRecovery } from "../admin/CheckoutRecovery.jsx"
import { DeliverySettings } from "../admin/DeliverySettings.jsx"
import {
  previewData,
  previewKey,
  preferenceDefaults,
} from "../admin/preview.js"
import "../admin-workspace.css"
import "../admin-navigation.css"
import "../admin-theme.css"
import { PaymentMarks } from "../components/PaymentMarks.jsx"
import { PaymentMethod } from "../components/PaymentLogo.jsx"
import React, { useEffect, useState, useRef } from "react"

import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Box,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  Grid2X2,
  LayoutDashboard,
  List,
  LockKeyhole,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Package,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Users,
  Heart,
  FileText,
  Globe,
  Languages,
  MessageSquare,
  Mail,
  Moon,
  Sun,
  Maximize,
  RotateCcw,
} from "lucide-react"

import { useStore, navigate } from "../store.jsx"
import { useMediaQuery } from "../lib/use-media-query.js"

import {
  categories,
  money,
  products as seed,
  categoryName,
} from "../data/catalog.js"

import {
  api,
  post,
  dateLabel,
  downloadCsv,
  statusLabel,
  readStorage,
  writeStorage,
} from "../lib/api.js"

import {
  Badge,
  Button,
  Empty,
  Field,
  IconButton,
  Modal,
  Notice,
} from "../components/ui.jsx"

import { CategoryIcon } from "../components/storefront.jsx"

const tabs = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["vendors", "Vendors", Users],
  ["customers", "Customers", Users],
  ["products", "Products", Package],
  ["wishlist", "Wishlist", Heart],
  ["orders", "Orders", ShoppingBag],
  ["checkouts", "Follow-ups", RotateCcw],
  ["invoices", "Invoices", FileText],
  ["history", "History", Activity],
  ["inventory", "Inventory", Box],
  ["categories", "Categories", Grid2X2],
  ["settings", "Settings", Settings],
  ["messages", "Messages", MessageSquare],
  ["subscribers", "Subscribers", Mail],
  ["pages", "Pages", Globe],
  ["language", "Language & region", Languages],
  ["security", "Login & security", LockKeyhole],
]
const extraSections = [
  "vendors",
  "wishlist",
  "invoices",
  "history",
  "messages",
  "subscribers",
  "pages",
  "language",
  "security",
]

function csvProducts(products) {
  downloadCsv("london-tech-products.csv", [
    [
      "SKU",
      "Product",
      "Category",
      "Price UGX",
      "Price confirmed",
      "Stock",
      "Published",
    ],
    ...products.map((p) => [
      p.sku,
      p.name,
      p.category,
      p.price,
      p.priceConfirmed,
      p.stock,
      p.active,
    ]),
  ])
}

export default function Admin({
  section = "dashboard",
  preview = false,
  search = "",
}) {
  const compactSidebar = useMediaQuery("(max-width: 1100px)")
  const [collapsed, setCollapsed] = useState(
    () => readStorage("lt.admin.sidebar-collapsed.v1", false) === true,
  )
  useEffect(
    () => writeStorage("lt.admin.sidebar-collapsed.v1", collapsed),
    [collapsed],
  )
  const { user, authLoading, logout, refresh } = useStore()
  const [preferences, updatePreferences] = useState(() => ({
    ...preferenceDefaults,
    ...readStorage("lt.admin.preferences.v1", {}),
  }))
  const setPreferences = (value) => {
    updatePreferences(value)
    writeStorage("lt.admin.preferences.v1", value)
  }
  const [notifications, setNotifications] = useState(false)
  const sidebar = useRef(null)
  const [data, setData] = useState(() =>
      preview
        ? readStorage(previewKey, null)?.version === 4
          ? {
              ...readStorage(previewKey, null),
              analytics:
                readStorage(previewKey, null).analytics ||
                previewData().analytics,
            }
          : previewData()
        : null,
    ),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [menu, setMenu] = useState(false),
    [editor, setEditor] = useState(null),
    [orderEditor, setOrderEditor] = useState(null),
    [category, setCategory] = useState("all"),
    [status, setStatus] = useState("all"),
    [view, setView] = useState("table"),
    [page, setPage] = useState(1),
    [saving, setSaving] = useState(false),
    [customer, setCustomer] = useState(null)

  const base = preview ? "/admin/preview/" : "/admin/"
  useEffect(() => setMenu(false), [compactSidebar])
  const toggleSidebar = () =>
    compactSidebar ? setMenu((open) => !open) : setCollapsed((value) => !value)
  useEffect(() => {
    if (preview && data) writeStorage(previewKey, data)
  }, [preview, data])
  useEffect(() => {
    if (!menu || !compactSidebar) return
    const old = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const previous = document.activeElement
    sidebar.current?.querySelector("a")?.focus()
    const key = (event) => {
      if (event.key === "Escape") setMenu(false)
      if (event.key === "Tab") {
        const links = [...sidebar.current.querySelectorAll("a,button")]
        const first = links[0],
          last = links.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener("keydown", key)
    return () => {
      document.body.style.overflow = old
      document.removeEventListener("keydown", key)
      previous?.focus()
    }
  }, [menu, compactSidebar])
  function previewChange(action, details, change) {
    setData((current) => ({
      ...change(current),
      events: [
        {
          id: crypto.randomUUID(),
          action,
          details,
          created_at: new Date().toISOString(),
        },
        ...current.events,
      ].slice(0, 500),
    }))
  }
  async function perform(kind, record, method) {
    if (preview) {
      if (
        kind === "vendors" &&
        method === "DELETE" &&
        data.products.some((p) => p.vendorId === record.id)
      )
        throw new Error(
          "This vendor has linked products. Archive it or reassign the products first.",
        )
      const next = {
        ...record,
        id: record.id || crypto.randomUUID(),
        updatedAt: new Date().toISOString(),
      }
      previewChange(
        kind + "." + method.toLowerCase(),
        { id: next.id },
        (current) => ({
          ...current,
          [kind]:
            method === "DELETE"
              ? current[kind].filter((r) => r.id !== record.id)
              : record.id
                ? current[kind].map((r) => (r.id === record.id ? next : r))
                : [...current[kind], next],
        }),
      )
      return
    }
    await api(`admin/${kind}${record.id ? "/" + record.id : ""}`, {
      method,
      body: method === "DELETE" ? undefined : record,
    })
    await load()
    if (kind === "pages") await refresh()
  }

  async function load() {
    try {
      setData(await api("admin/overview"))
      setError("")
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    if (!preview && user?.role === "admin") load()
  }, [preview, user?.id])
  useEffect(() => {
    setPage(1)
    setQuery(new URLSearchParams(search).get("q") || "")
    setNotifications(false)
    setStatus(new URLSearchParams(search).get("status") || "all")
    setCategory("all")
  }, [section, search])
  useEffect(() => setPage(1), [query, status, category, preferences.pageSize])

  if (authLoading && !preview)
    return (
      <div className="admin-gate">
        <p>Opening the store console…</p>
      </div>
    )

  if (!preview && user?.role !== "admin")
    return (
      <div className="admin-gate">
        <a className="admin-gate-brand" href="/">
          <img
            src="/assets/london-tech-logo.png"
            width="100"
            height="100"
            alt="London Tech"
          />
        </a>
        <span className="admin-gate-lock">
          <LockKeyhole size={25} />
        </span>
        <h1>Administrator sign in</h1>
        <a className="button" href="/login/?next=/admin/">
          Administrator sign in
          <ArrowRight size={16} />
        </a>
        <a className="text-link" href="/">
          Back to the store
          <ArrowUpRight size={14} />
        </a>
        {user && (
          <Notice>
            You are signed in as a customer. Administrator access is required.
          </Notice>
        )}
      </div>
    )

  if (!data)
    return (
      <div className="admin-gate">
        {error ? (
          <Notice type="error">{error}</Notice>
        ) : (
          <p>Loading store data…</p>
        )}
        <Button onClick={load}>Retry</Button>
      </div>
    )

  const catalog = data.products,
    orders = data.orders
  const filteredProducts = catalog.filter(
    (p) =>
      (category === "all" || p.category === category) &&
      (!query ||
        (p.name + " " + p.sku + " " + p.brand)
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (status === "all" ||
        (status === "published" && p.active) ||
        (status === "draft" && !p.active) ||
        (status === "low" && p.stock != null && p.stock < 5) ||
        (status === "unknown" && p.stock == null)),
  )

  const filteredOrders = orders.filter(
    (o) =>
      (status === "all" || o.status === status) &&
      (!query ||
        (o.id + " " + o.customer.name + " " + o.customer.email)
          .toLowerCase()
          .includes(query.toLowerCase())),
  )

  const filteredCustomers = data.customers.filter((c) =>
    (c.name + " " + c.email).toLowerCase().includes(query.toLowerCase()),
  )

  const adminTitle = tabs.find(([id]) => id === section)?.[1] || "Dashboard"

  const storeLink = () => window.open("/", "_blank", "noopener,noreferrer")

  return (
    <div
      className={
        "admin-shell" +
        (collapsed && !compactSidebar ? " sidebar-collapsed" : "")
      }
      data-theme={preferences.theme}
    >
      <aside
        ref={sidebar}
        id="admin-sidebar"
        className={"admin-sidebar " + (menu ? "open" : "")}
        aria-label="Administration navigation"
        role={compactSidebar && menu ? "dialog" : undefined}
        aria-modal={compactSidebar && menu ? true : undefined}
        inert={compactSidebar && !menu ? true : undefined}
      >
        <a
          className="admin-brand"
          href={base}
          aria-label="London Tech dashboard"
        >
          <img
            className="admin-brand-logo"
            src="/assets/london-tech-logo.png"
            width="46"
            height="46"
            alt=""
          />
          <BrandWordmark
            decorative
            width={152}
            inverse={preferences.theme === "dark"}
          />
        </a>
        <p className="admin-nav-label">WORKSPACE</p>
        <nav>
          {tabs.map(([id, label, Icon]) => (
            <a
              href={base + (id === "dashboard" ? "" : id + "/")}
              key={id}
              className={section === id ? "active" : ""}
              aria-current={section === id ? "page" : undefined}
              aria-label={label}
              title={collapsed && !compactSidebar ? label : undefined}
              onClick={() => setMenu(false)}
            >
              <Icon size={19} />
              <span className="admin-nav-text">{label}</span>
              {id === "orders" &&
                orders.filter((o) => o.status === "quote_requested").length >
                  0 && (
                  <span className="admin-nav-count">
                    {
                      orders.filter((o) => o.status === "quote_requested")
                        .length
                    }
                  </span>
                )}
            </a>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <button
            className="admin-sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={
              compactSidebar
                ? "Close navigation"
                : collapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
            }
            title={collapsed && !compactSidebar ? "Expand sidebar" : undefined}
            aria-controls="admin-sidebar"
            aria-expanded={compactSidebar ? menu : !collapsed}
          >
            {collapsed && !compactSidebar ? (
              <PanelLeftOpen size={19} />
            ) : (
              <PanelLeftClose size={19} />
            )}
            <span className="admin-nav-text">
              {compactSidebar ? "Close menu" : "Collapse sidebar"}
            </span>
          </button>
          <button onClick={storeLink}>
            <ExternalLink size={16} />
            <span className="admin-nav-text">View storefront</span>
            <ArrowUpRight size={13} />
          </button>
          {!preview && (
            <button onClick={() => logout().catch((e) => setError(e.message))}>
              <LogOut size={16} />
              <span className="admin-nav-text">Sign out</span>
            </button>
          )}
        </div>
      </aside>
      {menu && compactSidebar && (
        <button
          className="admin-sidebar-overlay"
          aria-label="Close navigation"
          tabIndex={-1}
          onClick={() => setMenu(false)}
        />
      )}
      <div
        className="admin-workspace"
        inert={compactSidebar && menu ? true : undefined}
      >
        <header className="admin-topbar">
          <IconButton
            label="Toggle navigation"
            className="admin-menu"
            aria-controls="admin-sidebar"
            aria-expanded={compactSidebar ? menu : !collapsed}
            onClick={toggleSidebar}
          >
            <Menu size={20} />
          </IconButton>
          <form
            className="admin-search"
            onSubmit={(e) => {
              e.preventDefault()
              navigate(
                base +
                  (section === "dashboard" ? "products/" : section + "/") +
                  (query.trim()
                    ? "?q=" + encodeURIComponent(query.trim())
                    : ""),
              )
            }}
          >
            <Search size={19} />
            <input
              placeholder={
                "Search " +
                (section === "dashboard"
                  ? "products"
                  : adminTitle.toLowerCase()) +
                "…"
              }
              aria-label="Search admin records"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" aria-label="Run admin search">
              <ArrowRight size={16} />
            </button>
          </form>
          <div className="admin-top-actions">
            {!preview && (
              <IconButton label="Refresh workspace" onClick={load}>
                <RotateCcw size={19} />
              </IconButton>
            )}

            <span className="admin-date">
              <CalendarDays size={15} />
              {new Intl.DateTimeFormat(preferences.locale, {
                dateStyle: "medium",
                timeZone: preferences.timeZone,
              }).format(new Date())}
            </span>
            <IconButton
              label={
                preferences.theme === "dark"
                  ? "Use light appearance"
                  : "Use dark appearance"
              }
              onClick={() =>
                setPreferences({
                  ...preferences,
                  theme: preferences.theme === "dark" ? "light" : "dark",
                })
              }
            >
              {preferences.theme === "dark" ? (
                <Sun size={19} />
              ) : (
                <Moon size={19} />
              )}
            </IconButton>
            <IconButton
              label="Toggle full screen"
              onClick={async () => {
                try {
                  if (document.fullscreenElement)
                    await document.exitFullscreen()
                  else await document.documentElement.requestFullscreen()
                } catch {
                  setError("Full screen is unavailable in this browser window.")
                }
              }}
            >
              <Maximize size={19} />
            </IconButton>
            <a
              href={base + "messages/"}
              className="icon-button"
              aria-label="Open customer messages"
            >
              <MessageSquare size={19} />
              {data.messages?.some((t) => t.status === "open") && <i />}
            </a>
            <div className="admin-notification-wrap">
              <IconButton
                label="Store notifications"
                aria-expanded={notifications}
                onClick={() => setNotifications(!notifications)}
              >
                <Bell size={19} />
              </IconButton>
              {notifications && (
                <div className="admin-notification-popover">
                  <strong>Needs attention</strong>
                  <a href={base + "orders/"}>
                    {
                      orders.filter((o) => o.status === "quote_requested")
                        .length
                    }{" "}
                    confirmation requests
                  </a>
                  <a href={base + "inventory/?status=low"}>
                    {
                      catalog.filter((p) => p.stock !== null && p.stock < 5)
                        .length
                    }{" "}
                    low-stock products
                  </a>
                  <a href={base + "messages/"}>
                    {data.messages?.filter((t) => t.status === "open").length ||
                      0}{" "}
                    open conversations
                  </a>
                </div>
              )}
            </div>
            <span className="admin-separator" />
            <details className="admin-profile-menu">
              <summary className="admin-user">
                <span>
                  {preview
                    ? "LT"
                    : user.name
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")}
                </span>
                <div>
                  <strong>{preview ? "Store administrator" : user.name}</strong>
                  <small>{preview ? "Local preview" : "Administrator"}</small>
                </div>
                <ChevronDown size={14} />
              </summary>
              <div className="admin-profile-popover">
                <a href={base + "settings/"}>Store settings</a>
                <a href={base + "language/"}>Preferences</a>
                <a href={base + "security/"}>Login & security</a>
                {!preview && (
                  <button
                    onClick={() => logout().catch((e) => setError(e.message))}
                  >
                    Sign out
                  </button>
                )}
              </div>
            </details>
          </div>
        </header>
        <main className="admin-main">
          {preview && (
            <div className="admin-preview-banner">
              <Eye size={17} />
              <span>
                <strong>Preview workspace.</strong> Illustrative customer and
                order records. Changes stay in this browser. No payments, email
                or messages leave this preview.
              </span>
              <a href="/login/?next=/admin/">
                Sign in
                <ArrowRight size={13} />
              </a>
            </div>
          )}
          {error && <Notice type="error">{error}</Notice>}
          <div className="admin-page-heading">
            <div>
              <div className="admin-breadcrumb">
                Workspace <ChevronRight size={11} />
                {adminTitle}
              </div>
              <h1>{adminTitle}</h1>
              <p>
                {section === "dashboard"
                  ? "Good to see you. Here is what is happening at London Tech."
                  : section === "products"
                    ? "Manage products, guide prices, options and the details customers see."
                    : section === "orders"
                      ? "Follow payment and fulfillment from the first request to the final handoff."
                      : "Manage the details that keep London Tech moving."}
              </p>
            </div>
            <div className="admin-heading-actions">
              {preview && (
                <IconButton
                  label="Reset preview workspace"
                  onClick={() => {
                    if (window.confirm("Reset this browser’s preview records?"))
                      setData(previewData())
                  }}
                >
                  <RotateCcw size={17} />
                </IconButton>
              )}

              {["products", "inventory"].includes(section) ? (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => csvProducts(filteredProducts)}
                  >
                    <Download size={15} />
                    Export
                  </Button>
                  <Button onClick={() => setEditor(newProduct())}>
                    <Plus size={16} />
                    Add product
                  </Button>
                </>
              ) : section === "orders" ? (
                <Button
                  variant="secondary"
                  onClick={() =>
                    downloadCsv("london-tech-orders.csv", [
                      [
                        "Order",
                        "Customer",
                        "Date",
                        "Amount UGX",
                        "Status",
                        "Payment",
                      ],
                      ...filteredOrders.map((o) => [
                        o.id,
                        o.customer.name,
                        o.createdAt,
                        o.amount,
                        o.status,
                        o.paymentStatus,
                      ]),
                    ])
                  }
                >
                  <Download size={15} />
                  Export orders
                </Button>
              ) : section === "dashboard" ? (
                <Button
                  variant="secondary"
                  onClick={() => navigate(base + "orders/")}
                >
                  <ShoppingBag size={15} />
                  View orders
                </Button>
              ) : null}
            </div>
          </div>
          {section === "dashboard" ? (
            <Overview
              data={data}
              base={base}
              onOrder={setOrderEditor}
              OrdersTable={OrdersTable}
              locale={preferences.locale}
            />
          ) : section === "checkouts" ? (
            <CheckoutRecovery
              attempts={data.checkouts || []}
              search={query}
              preview={preview}
              changed={
                preview
                  ? (updated) =>
                      setData((current) => ({
                        ...current,
                        checkouts: (current.checkouts || []).map((a) =>
                          a.id === updated.id ? updated : a,
                        ),
                      }))
                  : load
              }
            />
          ) : extraSections.includes(section) ? (
            <WorkspaceSection
              section={section}
              data={data}
              query={query}
              perform={perform}
              preview={preview}
              user={user}
              preferences={preferences}
              setPreferences={setPreferences}
              changedMessages={
                preview
                  ? (messages) =>
                      previewChange(
                        "messages.updated",
                        { conversations: messages.length },
                        (current) => ({ ...current, messages }),
                      )
                  : load
              }
            />
          ) : section === "products" || section === "inventory" ? (
            <>
              <div className="admin-product-stats">
                <span>
                  <b>{catalog.length}</b> total products
                </span>
                <span>
                  <i className="green" />
                  <b>{catalog.filter((p) => p.active).length}</b> published
                </span>
                <span>
                  <i className="amber" />
                  <b>{catalog.filter((p) => !p.priceConfirmed).length}</b> guide
                  prices
                </span>
                <span>
                  <i />
                  <b>{catalog.filter((p) => p.stock == null).length}</b> stock
                  to confirm
                </span>
              </div>
              <div className="admin-panel">
                <div className="admin-table-toolbar">
                  <div>
                    <select
                      value={category}
                      aria-label="Filter by category"
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="all">All categories</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={status}
                      aria-label="Filter by product status"
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="all">All statuses</option>
                      <option value="published">Published</option>
                      <option value="draft">Hidden</option>
                      <option value="low">Low stock</option>
                      <option value="unknown">Stock unconfirmed</option>
                    </select>
                  </div>
                  <span>{filteredProducts.length} products</span>
                  <div className="view-toggle">
                    <IconButton
                      label="Table view"
                      aria-pressed={view === "table"}
                      onClick={() => setView("table")}
                    >
                      <List size={17} />
                    </IconButton>
                    <IconButton
                      label="Grid view"
                      aria-pressed={view === "grid"}
                      onClick={() => setView("grid")}
                    >
                      <Grid2X2 size={17} />
                    </IconButton>
                  </div>
                </div>
                {view === "table" ? (
                  <div className="admin-table-scroll">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Category</th>
                          <th>Price</th>
                          <th>Stock</th>
                          <th>Status</th>
                          <th aria-label="Actions" />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts
                          .slice(
                            (page - 1) * preferences.pageSize,
                            page * preferences.pageSize,
                          )
                          .map((p) => (
                            <tr key={p.id}>
                              <td>
                                <div className="admin-product-cell">
                                  <img src={p.image} alt="" />
                                  <span>
                                    <strong>{p.name}</strong>
                                    <small>
                                      {p.sku} · {p.brand}
                                    </small>
                                  </span>
                                </div>
                              </td>
                              <td>{categoryName(p.category)}</td>
                              <td>
                                <b>{money(p.price)}</b>
                                <small>
                                  {p.priceConfirmed
                                    ? "Confirmed"
                                    : "Guide price"}
                                </small>
                              </td>
                              <td>
                                <Badge
                                  type={
                                    p.stock == null
                                      ? "muted"
                                      : p.stock < 5
                                        ? "warning"
                                        : "success"
                                  }
                                >
                                  {p.stock == null
                                    ? "Unconfirmed"
                                    : p.stock + " units"}
                                </Badge>
                              </td>
                              <td>
                                <Badge type={p.active ? "success" : "muted"}>
                                  {p.active ? "Published" : "Hidden"}
                                </Badge>
                              </td>
                              <td>
                                <IconButton
                                  label={"Edit " + p.name}
                                  onClick={() => setEditor(p)}
                                >
                                  <Edit3 size={15} />
                                </IconButton>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="admin-products-grid">
                    {filteredProducts
                      .slice(
                        (page - 1) * preferences.pageSize,
                        page * preferences.pageSize,
                      )
                      .map((p) => (
                        <article key={p.id}>
                          <div>
                            <img src={p.image} alt="" />
                            <IconButton
                              label={"Edit " + p.name}
                              onClick={() => setEditor(p)}
                            >
                              <Edit3 size={15} />
                            </IconButton>
                            <Badge type={p.active ? "success" : "muted"}>
                              {p.active ? "Published" : "Hidden"}
                            </Badge>
                          </div>
                          <small>
                            {categoryName(p.category)} / {p.sku}
                          </small>
                          <h3>{p.name}</h3>
                          <strong>{money(p.price)}</strong>
                          <span>
                            {p.priceConfirmed
                              ? "Confirmed price"
                              : "Guide price"}{" "}
                            ·{" "}
                            {p.stock == null
                              ? "Stock unconfirmed"
                              : p.stock + " units"}
                          </span>
                          <button
                            className="admin-text-link"
                            onClick={() => setEditor(p)}
                          >
                            Manage product
                            <ArrowRight size={13} />
                          </button>
                        </article>
                      ))}
                  </div>
                )}
                {!filteredProducts.length && (
                  <Empty icon={Search} title="No products match.">
                    Try another category, status or search.
                  </Empty>
                )}
                <AdminPagination
                  total={filteredProducts.length}
                  page={page}
                  setPage={setPage}
                  perPage={preferences.pageSize}
                />
              </div>
            </>
          ) : section === "orders" ? (
            <div className="admin-panel">
              <div className="admin-status-tabs">
                {[
                  "all",
                  "quote_requested",
                  "quoted",
                  "pending_payment",
                  "confirmed",
                  "processing",
                  "shipped",
                  "completed",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={status === s ? "active" : ""}
                  >
                    {s === "all" ? "All orders" : statusLabel(s)}
                    <b>
                      {s === "all"
                        ? orders.length
                        : orders.filter((o) => o.status === s).length}
                    </b>
                  </button>
                ))}
              </div>
              <OrdersTable
                orders={filteredOrders.slice(
                  (page - 1) * preferences.pageSize,
                  page * preferences.pageSize,
                )}
                onOrder={setOrderEditor}
              />
              <AdminPagination
                total={filteredOrders.length}
                page={page}
                setPage={setPage}
                perPage={preferences.pageSize}
              />
            </div>
          ) : section === "categories" ? (
            <div className="admin-categories">
              {categories.map((c) => (
                <article className="admin-panel" key={c.id}>
                  <span className="admin-category-icon">
                    <CategoryIcon category={c} size={25} />
                  </span>
                  <h2>{c.name}</h2>
                  <p>{c.description}</p>
                  <div>
                    <strong>
                      {catalog.filter((p) => p.category === c.id).length}
                      <small>products</small>
                    </strong>
                    <button
                      className="icon-button"
                      aria-label={"Manage " + c.name + " products"}
                      onClick={() => {
                        navigate(base + "products/")
                        setTimeout(() => setCategory(c.id), 0)
                      }}
                    >
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : section === "customers" ? (
            <div className="admin-panel">
              <div className="admin-panel-heading">
                <h2>
                  Customers <span>{filteredCustomers.length}</span>
                </h2>
                <Button
                  variant="secondary"
                  onClick={() =>
                    downloadCsv("london-tech-customers.csv", [
                      ["Name", "Email", "Phone", "Orders", "Joined"],
                      ...filteredCustomers.map((c) => [
                        c.name,
                        c.email,
                        c.phone,
                        c.orders,
                        c.created_at,
                      ]),
                    ])
                  }
                >
                  <Download size={14} />
                  Export
                </Button>
              </div>
              {filteredCustomers.length ? (
                <div className="admin-table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Phone</th>
                        <th>Orders</th>
                        <th>Joined</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <div className="admin-customer-cell">
                              <span>{c.name[0]}</span>
                              <div>
                                <strong>{c.name}</strong>
                                <small>{c.email}</small>
                              </div>
                            </div>
                          </td>
                          <td>{c.phone || "—"}</td>
                          <td>{c.orders}</td>
                          <td>{dateLabel(c.created_at)}</td>
                          <td>
                            <IconButton
                              label="View customer"
                              onClick={() => setCustomer(c)}
                            >
                              <Eye size={16} />
                            </IconButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty icon={Users} title="Your first customers belong here.">
                  Customer accounts and order counts will appear here after
                  registration.
                </Empty>
              )}
            </div>
          ) : section === "activity" ? (
            <div className="admin-panel">
              <div className="admin-panel-heading">
                <h2>Recent activity</h2>
                <span className="admin-muted">Last 50 recorded changes</span>
              </div>
              {data.events.length ? (
                <div className="admin-activity">
                  {data.events.map((e, i) => (
                    <div key={i}>
                      <span>
                        <Activity size={17} />
                      </span>
                      <div>
                        <strong>
                          {statusLabel(e.action.replaceAll(".", " "))}
                        </strong>
                        <p>
                          {e.details.id ||
                            e.details.orderId ||
                            "Store configuration"}
                          {e.details.status
                            ? " · " + statusLabel(e.details.status)
                            : ""}
                        </p>
                      </div>
                      <small>{dateLabel(e.created_at)}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty icon={Activity} title="A clear history starts here.">
                  Product changes, order updates and verified payments are
                  recorded as they happen.
                </Empty>
              )}
            </div>
          ) : (
            <SettingsPanel
              settings={data.settings}
              connection={data.connection}
              preview={preview}
              saved={(settings) => {
                if (preview)
                  previewChange("settings.updated", {}, (current) => ({
                    ...current,
                    settings,
                  }))
                else {
                  setData({ ...data, settings })
                  refresh().catch(() => {})
                }
              }}
            />
          )}
        </main>
        <footer className="admin-footer">
          <span className="admin-footer-brand">
            <BrandWordmark inverse={preferences.theme === "dark"} width={110} />
            <span>Store Console</span>
          </span>
          <span>
            UGX <i /> Uganda
          </span>
        </footer>
      </div>
      {editor && (
        <ProductEditor
          product={editor}
          vendors={data.vendors || []}
          preview={preview}
          existing={catalog.some((p) => p.id === editor.id)}
          onClose={() => setEditor(null)}
          onSave={async (p) => {
            const editingExisting = catalog.some((v) => v.id === editor.id)
            if (!editingExisting && catalog.some((v) => v.id === p.id))
              throw new Error(
                "This product URL identifier is already in use. Choose a different one.",
              )
            if (preview) {
              previewChange("product.saved", { id: p.id }, (current) => ({
                ...current,
                products: current.products.some((v) => v.id === p.id)
                  ? current.products.map((v) => (v.id === p.id ? p : v))
                  : [...current.products, p],
              }))
              setEditor(null)
              return
            }
            setSaving(true)
            try {
              await api(
                "admin/products" + (editingExisting ? "/" + p.id : ""),
                {
                  method: editingExisting ? "PUT" : "POST",
                  body: p,
                },
              )
              await load()
              await refresh()
              setEditor(null)
            } finally {
              setSaving(false)
            }
          }}
          saving={saving}
        />
      )}
      {orderEditor && (
        <AdminOrderModal
          order={orderEditor}
          preview={preview}
          onQuote={async (body) => {
            if (preview) {
              setData((current) => ({
                ...current,
                orders: current.orders.map((o) =>
                  o.id === orderEditor.id
                    ? {
                        ...o,
                        status: "quoted",
                        quote: body,
                        amount:
                          body.prices.reduce(
                            (n, p, i) => n + p * o.items[i].quantity,
                            0,
                          ) + (body.deliveryFee || 0),
                      }
                    : o,
                ),
              }))
              setOrderEditor(null)
              return
            }
            await post("admin/orders/" + orderEditor.id + "/quote", body)
            await load()
            setOrderEditor(null)
          }}
          onClose={() => setOrderEditor(null)}
          onCollectCash={async () => {
            if (preview) {
              setData((current) => ({
                ...current,
                orders: current.orders.map((o) =>
                  o.id === orderEditor.id ? { ...o, paymentStatus: "paid" } : o,
                ),
              }))
              setOrderEditor(null)
              return
            }
            await post("admin/orders/" + orderEditor.id + "/cash-payment", {
              confirmed: true,
            })
            await load()
            setOrderEditor(null)
          }}
          onSave={async (status, note, tracking) => {
            if (preview) {
              if (
                orderEditor.paymentStatus !== "paid" &&
                [
                  "confirmed",
                  "processing",
                  "ready",
                  "shipped",
                  "completed",
                ].includes(status)
              )
                throw new Error("Payment must be verified before fulfillment.")
              setData((current) => ({
                ...current,
                orders: current.orders.map((o) =>
                  o.id === orderEditor.id
                    ? {
                        ...o,
                        status,
                        tracking: tracking || o.tracking,
                        timeline: [
                          ...(o.timeline || []),
                          { status, note, at: new Date().toISOString() },
                        ],
                      }
                    : o,
                ),
              }))
              setOrderEditor(null)
              return
            }
            await api("admin/orders/" + orderEditor.id, {
              method: "PATCH",
              body: { status, note, tracking },
            })
            await load()
            setOrderEditor(null)
          }}
        />
      )}
      {customer && (
        <Modal title="Customer information" onClose={() => setCustomer(null)}>
          <div className="admin-customer-detail">
            <span>{customer.name[0]}</span>
            <h2>{customer.name}</h2>
            <p>{customer.email}</p>
            <p>{customer.phone || "No phone number saved"}</p>
            <Badge>{customer.orders} orders</Badge>
          </div>
          <h3>Customer orders</h3>
          <OrdersTable
            orders={orders.filter((o) => o.customer.email === customer.email)}
            onOrder={(o) => {
              setCustomer(null)
              setOrderEditor(o)
            }}
          />
        </Modal>
      )}
    </div>
  )
}

function OrdersTable({ orders, onOrder }) {
  return orders.length ? (
    <div className="admin-table-scroll">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Products</th>
            <th>Amount</th>
            <th>Payment</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>
                <button
                  className="admin-order-reference"
                  onClick={() => onOrder(o)}
                >
                  {o.id}
                </button>
                <small>{dateLabel(o.createdAt)}</small>
              </td>
              <td>
                <strong>{o.customer.name}</strong>
                <small>{o.customer.email}</small>
              </td>
              <td>
                <div className="admin-order-product">
                  <img src={o.items[0]?.image} alt="" />
                  <span>
                    {o.items[0]?.name}
                    {o.items.length > 1 && (
                      <small>+{o.items.length - 1} more items</small>
                    )}
                  </span>
                </div>
              </td>
              <td>
                <b>{money(o.amount)}</b>
              </td>
              <td>
                <Badge
                  type={o.paymentStatus === "paid" ? "success" : "warning"}
                >
                  {statusLabel(o.paymentStatus)}
                </Badge>
              </td>
              <td>
                <Badge
                  type={
                    ["completed", "shipped", "ready"].includes(o.status)
                      ? "success"
                      : o.status === "cancelled"
                        ? "danger"
                        : "muted"
                  }
                >
                  {statusLabel(o.status)}
                </Badge>
              </td>
              <td>
                <IconButton
                  label={"View order " + o.id}
                  onClick={() => onOrder(o)}
                >
                  <ArrowUpRight size={15} />
                </IconButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty icon={ShoppingBag} title="Your next orders will appear here.">
      Customer requests and orders are recorded in this view.
    </Empty>
  )
}

function AdminPagination({ total, page, setPage, perPage = 12 }) {
  const pages = Math.max(1, Math.ceil(total / perPage))
  return (
    <div className="admin-pagination">
      <span>
        Showing {total ? (page - 1) * 12 + 1 : 0}–{Math.min(total, page * 12)}{" "}
        of {total}
      </span>
      <div>
        <IconButton
          label="Previous page"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          <ChevronLeft size={15} />
        </IconButton>
        <span>
          {page} / {pages}
        </span>
        <IconButton
          label="Next page"
          disabled={page === pages}
          onClick={() => setPage(page + 1)}
        >
          <ChevronRight size={15} />
        </IconButton>
      </div>
    </div>
  )
}

function newProduct() {
  return {
    id: "",
    name: "",
    category: "mobiles",
    brand: "",
    sku: "LT-" + Date.now().toString().slice(-6),
    description: "",
    image: "/assets/london-tech-logo.png",
    gallery: ["/assets/london-tech-logo.png"],
    specifications: [],
    price: null,
    priceConfirmed: false,
    comparePrice: null,
    stock: null,
    active: false,
    featured: false,
    condition: "Confirm with store",
    warranty: "",
    inTheBox: "",
    delivery: "",
    options: [],
    colors: [],
    tags: [],
    createdAt: new Date().toISOString(),
  }
}

export function ProductEditor({
  vendors = [],
  product,
  preview,
  existing,
  onClose,
  onSave,
  saving,
}) {
  const [p, setP] = useState({ ...product }),
    [tab, setTab] = useState("general"),
    [error, setError] = useState(""),
    [optionsText, setOptionsText] = useState(product.options.join(", ")),
    [colorsText, setColorsText] = useState(product.colors.join(", ")),
    [gallery, setGallery] = useState(product.gallery.join("\n")),
    [specs, setSpecs] = useState(
      product.specifications.map(([k, v]) => k + ": " + v).join("\n"),
    )

  const field = (key, value) => setP((old) => ({ ...old, [key]: value }))
  const number = (value) => (value === "" ? null : Number(value))

  const submit = async (e) => {
    e.preventDefault()
    setError("")
    const images = gallery
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean)
    const details = specs
      .split("\n")
      .filter((v) => v.trim())
      .map((v) => {
        const i = v.indexOf(":")
        return i > 0
          ? [v.slice(0, i).trim(), v.slice(i + 1).trim()]
          : ["Detail", v.trim()]
      })
    try {
      await onSave({
        ...p,
        gallery: images,
        image: images[0],
        specifications: details,
        options: optionsText
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        colors: colorsText
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      })
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <Modal
      title={existing ? "Edit product" : "Add a product"}
      onClose={onClose}
      wide
      className="admin-editor"
    >
      <form onSubmit={submit}>
        {preview && (
          <Notice>
            Preview product changes are saved only in this browser.
          </Notice>
        )}
        {error && <Notice type="error">{error}</Notice>}
        <div className="editor-tabs">
          {[
            ["general", "Product information"],
            ["pricing", "Price & stock"],
            ["details", "Details & options"],
            ["images", "Gallery"],
          ].map(([id, label]) => (
            <button
              type="button"
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="editor-content">
          {tab === "general" ? (
            <>
              <div className="form-grid">
                <Field
                  label="Product name"
                  value={p.name}
                  onChange={(e) => {
                    field("name", e.target.value)
                    if (!existing)
                      field(
                        "id",
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-|-$/g, ""),
                      )
                  }}
                  required
                  maxLength={180}
                />
                <Field
                  label="Vendor / supplier"
                  hint="Optional: link this product to the business you source it from."
                >
                  <select
                    value={p.vendorId || ""}
                    onChange={(e) => field("vendorId", e.target.value)}
                  >
                    <option value="">No vendor assigned</option>
                    {vendors
                      .filter(
                        (v) => v.status === "active" || v.id === p.vendorId,
                      )
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                          {v.status === "archived" ? " · Archived" : ""}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field
                  label="Brand"
                  value={p.brand}
                  onChange={(e) => field("brand", e.target.value)}
                  maxLength={80}
                />
                <Field
                  label="SKU"
                  value={p.sku}
                  onChange={(e) => field("sku", e.target.value)}
                  required
                  maxLength={80}
                />
                <Field label="Category">
                  <select
                    value={p.category}
                    onChange={(e) => field("category", e.target.value)}
                  >
                    {categories.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field
                label="Product URL identifier"
                value={p.id}
                readOnly={existing}
                onChange={(e) => field("id", e.target.value)}
                required
                pattern="[a-z0-9-]+"
                hint="Lowercase letters, numbers and hyphens. Cannot be changed after creation."
              />
              <Field label="Description">
                <textarea
                  rows={6}
                  required
                  minLength={10}
                  maxLength={5000}
                  value={p.description}
                  onChange={(e) => field("description", e.target.value)}
                />
              </Field>
              <div className="editor-checks">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={p.active}
                    onChange={(e) => field("active", e.target.checked)}
                  />
                  Published in the store
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={p.featured}
                    onChange={(e) => field("featured", e.target.checked)}
                  />
                  Feature in the spotlight
                </label>
              </div>
            </>
          ) : tab === "pricing" ? (
            <>
              <Notice>
                Guide prices cannot be paid online. Confirm the selling price
                and enter a stock quantity to enable checkout.
              </Notice>
              <div className="form-grid">
                <Field
                  label="Selling price (UGX)"
                  type="number"
                  min="100"
                  max="2000000000"
                  value={p.price ?? ""}
                  onChange={(e) => field("price", number(e.target.value))}
                />
                <Field
                  label="Regular price (optional)"
                  type="number"
                  min="100"
                  max="2000000000"
                  value={p.comparePrice ?? ""}
                  onChange={(e) =>
                    field("comparePrice", number(e.target.value))
                  }
                />
                <Field
                  label="Stock quantity"
                  type="number"
                  min="0"
                  max="100000"
                  value={p.stock ?? ""}
                  onChange={(e) => field("stock", number(e.target.value))}
                  hint="Leave empty if availability is unconfirmed. Zero means out of stock."
                />
                <Field
                  label="Product condition"
                  value={p.condition}
                  onChange={(e) => field("condition", e.target.value)}
                  maxLength={100}
                />
              </div>
              <label className="checkbox-label publish-price-check">
                <input
                  type="checkbox"
                  checked={p.priceConfirmed}
                  onChange={(e) => field("priceConfirmed", e.target.checked)}
                />
                <span>
                  <strong>This price is confirmed by the store.</strong>
                  <small>
                    I have checked the model, configuration and selling price.
                  </small>
                </span>
              </label>
            </>
          ) : tab === "details" ? (
            <>
              <Field
                label="Specifications"
                hint="One per line: Display: 6.7-inch"
              >
                <textarea
                  rows={7}
                  value={specs}
                  onChange={(e) => setSpecs(e.target.value)}
                />
              </Field>
              <div className="form-grid">
                <Field
                  label="Configuration options"
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  hint="Separate with commas. Use only configurations at the listed price."
                />
                <Field
                  label="Colours"
                  value={colorsText}
                  onChange={(e) => setColorsText(e.target.value)}
                  hint="Separate available colours with commas."
                />
              </div>
              <Field label="What's in the box">
                <textarea
                  rows={3}
                  value={p.inTheBox}
                  onChange={(e) => field("inTheBox", e.target.value)}
                  maxLength={2000}
                />
              </Field>
              <Field label="Warranty information">
                <textarea
                  rows={3}
                  value={p.warranty}
                  onChange={(e) => field("warranty", e.target.value)}
                  maxLength={1000}
                />
              </Field>
              <Field label="Product delivery notes">
                <textarea
                  rows={2}
                  value={p.delivery}
                  onChange={(e) => field("delivery", e.target.value)}
                  maxLength={1000}
                />
              </Field>
            </>
          ) : (
            <>
              <Field
                label="Gallery image URLs"
                hint="One image URL per line. The first is the main product image. Use /assets/ paths or HTTPS images."
              >
                <textarea
                  rows={6}
                  value={gallery}
                  onChange={(e) => setGallery(e.target.value)}
                  required
                />
              </Field>
              <Field
                label="Photo or reference note"
                hint="Clarify when a photo shows a product family or a different reference finish. Update this when adding photos of the actual item."
              >
                <textarea
                  rows={2}
                  maxLength={500}
                  value={p.mediaNote || ""}
                  onChange={(e) => field("mediaNote", e.target.value)}
                />
              </Field>
              <div className="editor-gallery-preview">
                {gallery
                  .split("\n")
                  .filter(Boolean)
                  .slice(0, 10)
                  .map((src, i) => (
                    <img key={i} src={src} alt={"Gallery preview " + (i + 1)} />
                  ))}
              </div>
              <h3>Choose from the product library</h3>
              <p className="admin-muted small">
                Click an image to add it to the gallery.
              </p>
              <div className="editor-asset-library">
                {[...new Set(seed.flatMap((p) => p.gallery))].map((src) => (
                  <button
                    type="button"
                    key={src}
                    onClick={() =>
                      setGallery((old) =>
                        old.split("\n").includes(src) ? old : old + "\n" + src,
                      )
                    }
                  >
                    <img src={src} alt="Product library image" loading="lazy" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="editor-footer">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" busy={saving}>
            {preview ? "Save preview product" : "Save product"}
            <Check size={16} />
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export function AdminOrderModal({
  order: o,
  preview,
  onClose,
  onSave,
  onQuote,
  onCollectCash,
}) {
  const [status, setStatus] = useState(
      ["quoted", "quote_requested", "pending_payment"].includes(o.status)
        ? "review"
        : o.status,
    ),
    [note, setNote] = useState(""),
    [tracking, setTracking] = useState(() => ({
      carrier: "",
      reference: "",
      estimatedDate: "",
      url: "",
      ...o.tracking,
    })),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [cashReceived, setCashReceived] = useState(false)
  return (
    <Modal
      title={"Order " + o.id}
      wide
      className="admin-editor"
      onClose={onClose}
    >
      {preview && (
        <Notice>
          Illustrative order. It is not a real customer record or payment.
        </Notice>
      )}
      {error && <Notice type="error">{error}</Notice>}
      <div className="admin-order-top">
        <span>
          <Badge type={o.paymentStatus === "paid" ? "success" : "warning"}>
            {statusLabel(o.paymentStatus)}
          </Badge>
          <Badge>{statusLabel(o.status)}</Badge>
        </span>
        <strong>{money(o.amount)}</strong>
      </div>
      <div className="detail-copy-columns">
        <div>
          <h3>Customer</h3>
          <p>
            {o.customer.name}
            <br />
            {o.customer.email}
            <br />
            {o.customer.phone}
          </p>
          <h4>{statusLabel(o.fulfillment)}</h4>
          <p>
            {o.customer.address || "Store collection"} {o.customer.district}
          </p>
        </div>
        <div>
          <h3>Order information</h3>
          <p>
            Placed {dateLabel(o.createdAt)}
            <br />
            Payment: <PaymentMethod method={o.paymentMethod} />
          </p>
          {o.notes && <p>Note: {o.notes}</p>}
        </div>
      </div>
      {o.items.map((p, i) => (
        <div className="order-detail-item" key={i}>
          <img src={p.image} alt="" />
          <span>
            <strong>{p.name}</strong>
            <small>
              {[p.option, p.color].filter(Boolean).join(" · ")} · Qty{" "}
              {p.quantity}
            </small>
          </span>
          <b>{money(p.unitPrice == null ? null : p.unitPrice * p.quantity)}</b>
        </div>
      ))}
      {o.paymentMethod === "cod" &&
        o.paymentStatus === "cash_due" &&
        !["cancelled", "review"].includes(o.status) && (
          <form
            className="cash-receipt-form"
            onSubmit={async (e) => {
              e.preventDefault()
              setBusy(true)
              setError("")
              try {
                await onCollectCash()
              } catch (e) {
                setError(e.message)
              } finally {
                setBusy(false)
              }
            }}
          >
            <h3>Cash payment</h3>
            <label>
              <input
                type="checkbox"
                checked={cashReceived}
                onChange={(e) => setCashReceived(e.target.checked)}
                required
              />
              I have received the full {money(o.amount)} in cash.
            </label>
            <Button type="submit" busy={busy} disabled={!cashReceived}>
              Record cash received <Check size={16} />
            </Button>
          </form>
        )}
      {["quote_requested", "review", "quoted"].includes(o.status) &&
        o.paymentMethod !== "cod" &&
        o.paymentStatus !== "paid" && (
          <QuoteForm order={o} preview={preview} onSave={onQuote} />
        )}
      <form
        className="stack-form"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          try {
            await onSave(
              status,
              note,
              o.fulfillment === "delivery" ? tracking : undefined,
            )
          } catch (e) {
            setError(e.message)
          } finally {
            setBusy(false)
          }
        }}
      >
        <h3>Update fulfillment</h3>
        <Field label="Order status">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {[
              "confirmed",
              "processing",
              "ready",
              "shipped",
              "completed",
              "review",
              "cancelled",
            ].map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </Field>
        {o.fulfillment === "delivery" && (
          <details
            className="admin-delivery-tracking"
            open={
              tracking.carrier ||
              tracking.reference ||
              tracking.estimatedDate ||
              tracking.url
                ? true
                : undefined
            }
          >
            <summary>Delivery tracking</summary>
            <div className="form-grid">
              {[
                ["carrier", "Courier", "text", 80],
                ["reference", "Tracking reference", "text", 100],
                ["estimatedDate", "Estimated delivery", "date"],
                ["url", "Courier tracking link", "url", 500],
              ].map(([key, label, type, maxLength]) => (
                <Field
                  key={key}
                  label={label}
                  type={type}
                  maxLength={maxLength}
                  value={tracking[key]}
                  onChange={(event) =>
                    setTracking((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                />
              ))}
            </div>
          </details>
        )}
        <Field label="Customer-visible update (optional)">
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
          />
        </Field>
        <p className="admin-muted small">
          {o.paymentMethod === "cod"
            ? "Cash orders can be prepared and delivered before payment. Record cash received before completing the order."
            : "Online payments are confirmed by the payment provider."}
        </p>
        <Button type="submit" busy={busy}>
          Save order update
          <Check size={16} />
        </Button>
      </form>
      {!preview && <OrderEmailLog orderId={o.id} />}
    </Modal>
  )
}

function OrderEmailLog({ orderId }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const path = `admin/orders/${encodeURIComponent(orderId)}/emails`
  async function load(id) {
    setBusy(true)
    setError("")
    try {
      setData(await (id ? post(path, { id }) : api(path)))
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <details
      className="admin-delivery-tracking"
      onToggle={(event) => {
        if (event.currentTarget.open && !busy) load()
      }}
    >
      <summary>Customer emails</summary>
      {error && <Notice type="error">{error}</Notice>}
      {busy && <p role="status">Loading email activity…</p>}
      {data && (
        <>
          {!data.configured && (
            <p className="admin-muted">
              Connect the email sender in Vercel to send order updates.
            </p>
          )}
          {data.emails.length ? (
            <ul className="admin-order-email-list">
              {data.emails.map((email) => (
                <li key={email.id}>
                  <span>
                    <strong>{email.title}</strong>
                    <small>{dateLabel(email.createdAt)}</small>
                  </span>
                  <Badge
                    type={
                      email.state === "sent"
                        ? "success"
                        : email.state === "failed"
                          ? "warning"
                          : ""
                    }
                  >
                    {email.state === "sent"
                      ? "Accepted by Resend"
                      : statusLabel(email.state)}
                  </Badge>
                  {data.configured &&
                    ["pending", "failed"].includes(email.state) && (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => load(email.id)}
                      >
                        Retry email
                      </Button>
                    )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-muted">No email activity for this order yet.</p>
          )}
        </>
      )}
    </details>
  )
}

function SettingsPanel({ settings, connection, preview, saved }) {
  const [s, setS] = useState(() => ({
      ...settings,
      socials: {
        facebook: "",
        x: "",
        tiktok: "",
        instagram: "",
        snapchat: "",
        ...settings.socials,
      },
    })),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("")
  const change = (key, value) => setS({ ...s, [key]: value })
  return (
    <div className="admin-settings-grid">
      <form
        className="admin-panel admin-settings-form"
        onSubmit={async (e) => {
          e.preventDefault()
          setError("")
          setSuccess("")
          if (preview) {
            saved(s)
            setSuccess("Preview settings saved in this browser.")
            return
          }
          setBusy(true)
          try {
            const data = await api("admin/settings", { method: "PUT", body: s })
            saved(data.settings)
            setSuccess("Store information saved.")
          } catch (err) {
            setError(err.message)
          } finally {
            setBusy(false)
          }
        }}
      >
        <div className="admin-panel-heading">
          <h2>Store information</h2>
          <Settings size={18} />
        </div>
        <div className="settings-form-content">
          {error && <Notice type="error">{error}</Notice>}
          {success && <Notice type="success">{success}</Notice>}
          <div className="form-grid">
            {[
              ["name", "Store name"],
              ["tagline", "Tagline"],
              ["phone", "Primary phone"],
              ["phoneAlt", "Second phone"],
              ["email", "Public email"],
              ["whatsapp", "WhatsApp number (optional)"],
            ].map(([key, label]) => (
              <Field
                key={key}
                label={label}
                value={s[key] || ""}
                type={key === "email" ? "email" : "text"}
                onChange={(e) => change(key, e.target.value)}
              />
            ))}
          </div>
          <Field label="Store address">
            <textarea
              rows={3}
              value={s.address}
              onChange={(e) => change("address", e.target.value)}
              maxLength={500}
            />
          </Field>
          <Field
            label="Opening hours"
            value={s.hours}
            onChange={(e) => change("hours", e.target.value)}
            placeholder="Enter confirmed opening hours"
          />
          <DeliverySettings settings={s} onChange={change} />
          {[
            ["about", "About London Tech"],
            ["delivery", "Delivery information"],
            ["returns", "Returns & warranty information"],
          ].map(([key, label]) => (
            <Field key={key} label={label}>
              <textarea
                rows={4}
                value={s[key]}
                onChange={(e) => change(key, e.target.value)}
                maxLength={5000}
              />
            </Field>
          ))}
          <section className="settings-socials">
            <h3>Social profiles</h3>
            <p className="admin-muted">
              Add the official profile URL for each channel. Leave it blank
              until the account is ready.
            </p>
            <div className="form-grid">
              {[
                ["facebook", "Facebook"],
                ["x", "X"],
                ["tiktok", "TikTok"],
                ["instagram", "Instagram"],
                ["snapchat", "Snapchat"],
              ].map(([key, label]) => (
                <Field
                  key={key}
                  label={label + " profile URL"}
                  type="url"
                  maxLength={500}
                  placeholder="https://"
                  value={s.socials[key] || ""}
                  onChange={(e) =>
                    change("socials", { ...s.socials, [key]: e.target.value })
                  }
                />
              ))}
            </div>
          </section>
          <Button type="submit" busy={busy}>
            Save store settings
            <Check size={16} />
          </Button>
        </div>
      </form>
      <aside>
        <section className="admin-panel integration-panel">
          <div className="admin-panel-heading">
            <h2>Store connections</h2>
            <ShieldCheck size={18} />
          </div>
          {[
            ["PostgreSQL database", connection.database],
            ["Flutterwave payments", connection.payments],
            ["Transactional email", connection.email],
          ].map(([name, ready]) => (
            <div key={name}>
              <span>{name}</span>
              <Badge type={ready ? "success" : "warning"}>
                {ready ? "Connected" : "Setup needed"}
              </Badge>
            </div>
          ))}
          <p>
            Secrets are configured in the server environment. They are never
            stored in this form or sent to the browser.
          </p>
        </section>
        <section className="admin-panel integration-panel">
          <div className="admin-panel-heading">
            <h2>Checkout region</h2>
            <MapIcon />
          </div>
          <div>
            <span>Country</span>
            <strong>Uganda</strong>
          </div>
          <div>
            <span>Currency</span>
            <strong>UGX</strong>
          </div>
          <div>
            <span>Payment methods</span>
            <PaymentMarks />
          </div>
          <p>
            Online methods must also be enabled on the Flutterwave merchant
            account. Cash on receipt works independently.
          </p>
        </section>
        <a
          href="/contact/"
          target="_blank"
          rel="noopener noreferrer"
          className="admin-panel settings-preview-link"
        >
          <Eye size={22} />
          <span>
            <strong>See it in the store</strong>
            <small>Preview your contact information</small>
          </span>
          <ArrowUpRight size={18} />
        </a>
      </aside>
    </div>
  )
}

function MapIcon() {
  return <span className="admin-muted small">UG</span>
}

function QuoteForm({ order, preview, onSave }) {
  const [prices, setPrices] = useState(
      order.items.map((p) => p.unitPrice ?? ""),
    ),
    [fee, setFee] = useState(order.deliveryFee ?? 0),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("")

  return (
    <form
      className="stack-form admin-quote-form"
      onSubmit={async (e) => {
        e.preventDefault()
        setError("")
        setBusy(true)
        try {
          await onSave({
            prices: prices.map(Number),
            deliveryFee: Number(fee),
            note,
          })
        } catch (e) {
          setError(e.message)
        } finally {
          setBusy(false)
        }
      }}
    >
      <h3>Confirm a quote</h3>
      <p className="admin-muted small">
        Enter the agreed unit prices and delivery fee. The customer can review
        the total and pay from their account. Stock is checked again before
        payment.
      </p>
      {error && <Notice type="error">{error}</Notice>}
      {order.items.map((p, i) => (
        <Field
          key={i}
          label={p.name + " · unit price (UGX)"}
          type="number"
          min="100"
          max="2000000000"
          required
          value={prices[i]}
          onChange={(e) =>
            setPrices(prices.map((v, j) => (j === i ? e.target.value : v)))
          }
        />
      ))}
      {order.fulfillment === "delivery" && (
        <Field
          label="Confirmed delivery fee (UGX)"
          type="number"
          min="0"
          max="10000000"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          required
        />
      )}
      <Field label="Configuration and fulfillment confirmation">
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          placeholder="Confirm the exact configuration, condition and next steps…"
        />
      </Field>
      <Button busy={busy} type="submit">
        Save confirmed quote
        <Check size={16} />
      </Button>
    </form>
  )
}
