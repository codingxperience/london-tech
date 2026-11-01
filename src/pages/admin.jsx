import { PaymentMarks } from "../components/PaymentMarks.jsx"
import { PaymentLogo, PaymentMethod } from "../components/PaymentLogo.jsx"
import React, { useEffect, useMemo, useState } from "react"

import {
  Activity,
  ArrowDown,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Box,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  Grid2X2,
  Headphones,
  LayoutDashboard,
  List,
  LockKeyhole,
  LogOut,
  Menu,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Tag,
  Trash2,
  TrendingUp,
  Truck,
  Users,
  WalletCards,
  X,
} from "lucide-react"

import { useStore, navigate } from "../store.jsx"

import {
  categories,
  money,
  products as seed,
  productPath,
  storeDefaults,
  categoryName,
} from "../data/catalog.js"

import { api, post, dateLabel, downloadCsv, statusLabel } from "../lib/api.js"

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

const previewOrders = seed.slice(0, 8).map((p, i) => ({
  id: "DEMO-" + (1028 - i),
  status: [
    "confirmed",
    "processing",
    "ready",
    "shipped",
    "completed",
    "quote_requested",
    "pending_payment",
    "completed",
  ][i],
  paymentStatus: i < 5 || i === 7 ? "paid" : "unpaid",
  amount: p.price,
  currency: "UGX",
  items: [{ ...p, quantity: 1, unitPrice: p.price }],
  customer: {
    name: "Sample customer " + (i + 1),
    email: "customer" + (i + 1) + "@example.com",
    phone: "Not a real customer",
  },
  fulfillment: i % 2 ? "delivery" : "collection",
  paymentMethod: ["mtn", "visa", "airtel"][i % 3],
  createdAt: new Date(Date.now() - i * 86400000 * 2).toISOString(),
  timeline: [],
}))

const tabs = [
  ["dashboard", "Overview", LayoutDashboard],
  ["products", "Products", Package],
  ["categories", "Categories", Grid2X2],
  ["orders", "Orders", ShoppingBag],
  ["customers", "Customers", Users],
  ["inventory", "Inventory", Box],
  ["activity", "Activity", Activity],
  ["settings", "Settings", Settings],
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

const chartColors = ["#d92f40", "#163659", "#c2ccd8"]

function LineChart({ orders, preview = false }) {
  const today = new Date(),
    points = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1)
      const total = orders
        .filter(
          (o) =>
            o.paymentStatus === "paid" &&
            new Date(o.createdAt).getMonth() === d.getMonth() &&
            new Date(o.createdAt).getFullYear() === d.getFullYear(),
        )
        .reduce((s, o) => s + o.amount, 0)
      return {
        month: d.toLocaleString("en", { month: "short" }),
        total: preview
          ? [1.8, 1.5, 2.7, 3.1, 3.8, 3.2, 4.7, 3.8, 4.8, 5.4, 4.1, 5.8][i] *
            1000000
          : total,
      }
    })

  const max = Math.max(...points.map((p) => p.total), 1000000),
    coords = points.map((p, i) => [32 + i * 43, 162 - (p.total / max) * 125])
  const line = coords
      .map(([x, y], i) => (i ? "L" : "M") + x + "," + y)
      .join(" "),
    area = line + " L505,170 L32,170 Z"

  return (
    <div className="chart-wrap">
      <svg
        viewBox="0 0 540 205"
        role="img"
        aria-label={
          preview
            ? "Illustrative sales chart"
            : "Monthly paid sales over the last twelve months"
        }
      >
        <defs>
          <linearGradient id="sales-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d92f40" stopOpacity=".16" />
            <stop offset="100%" stopColor="#d92f40" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[40, 80, 120, 160].map((y) => (
          <g key={y}>
            <line
              x1="30"
              y1={y}
              x2="520"
              y2={y}
              stroke="#e9edf2"
              strokeDasharray="4 4"
            />
            <text x="0" y={y + 4} fontSize="9" fill="#98a2b3">
              {Math.round((((170 - y) / 125) * max) / 1000000)}m
            </text>
          </g>
        ))}
        <path d={area} fill="url(#sales-fill)" />
        <path
          d={line}
          fill="none"
          stroke="#d92f40"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <text
            key={i}
            x={32 + i * 43}
            y="195"
            textAnchor="middle"
            fontSize="10"
            fill="#929ca8"
          >
            {p.month}
          </text>
        ))}
      </svg>
      {!preview && !orders.some((o) => o.paymentStatus === "paid") && (
        <span className="chart-empty">
          Your first confirmed sales will appear here.
        </span>
      )}
    </div>
  )
}

function BarChart({ orders, preview }) {
  const values = [
    "confirmed",
    "processing",
    "ready",
    "shipped",
    "completed",
    "quote_requested",
  ]
  const maximum = Math.max(
    ...values.map((s) => orders.filter((o) => o.status === s).length),
    3,
  )
  return (
    <div className="chart-wrap bar-chart">
      <svg
        viewBox="0 0 340 205"
        role="img"
        aria-label="Orders by fulfillment status"
      >
        {[40, 80, 120, 160].map((y) => (
          <line
            key={y}
            x1="25"
            y1={y}
            x2="330"
            y2={y}
            stroke="#e9edf2"
            strokeDasharray="4 4"
          />
        ))}
        {values.map((status, i) => {
          const count = orders.filter((o) => o.status === status).length,
            h = (count / maximum) * 120
          return (
            <g key={status}>
              <rect
                x={37 + i * 49}
                y={165 - h}
                width="22"
                height={h || 2}
                rx="4"
                fill={chartColors[i % 3]}
              />
              <text
                x={48 + i * 49}
                y={155 - h}
                textAnchor="middle"
                fontSize="11"
                fill="#526075"
              >
                {count}
              </text>
              <text
                transform={"translate(" + (48 + i * 49) + ",183) rotate(-18)"}
                textAnchor="middle"
                fontSize="9"
                fill="#929ca8"
              >
                {
                  [
                    "New",
                    "Processing",
                    "Ready",
                    "Shipped",
                    "Complete",
                    "Quote",
                  ][i]
                }
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function Admin({ section = "dashboard", preview = false }) {
  const { user, authLoading, logout, refresh } = useStore()
  const [data, setData] = useState(
      preview
        ? {
            products: seed,
            orders: previewOrders,
            customers: [],
            events: [],
            settings: storeDefaults,
            connection: { database: false, payments: false, email: false },
          }
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
    setQuery("")
    setStatus("all")
    setCategory("all")
  }, [section])
  useEffect(() => setPage(1), [query, status, category])

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
        <p className="eyebrow">LONDON TECH / STORE CONSOLE</p>
        <h1>
          A clearer view
          <br />
          of your business.
        </h1>
        <p>
          Sign in with an administrator account to manage products, orders,
          customers and store settings.
        </p>
        <a className="button" href="/login/?next=/admin/">
          Administrator sign in
          <ArrowRight size={16} />
        </a>
        <a className="text-link" href="/admin/preview/">
          Preview the dashboard
          <Eye size={15} />
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

  const adminTitle = tabs.find(([id]) => id === section)?.[1] || "Overview"

  const storeLink = () => window.open("/", "_blank", "noopener,noreferrer")

  return (
    <div className="admin-shell">
      <aside className={"admin-sidebar " + (menu ? "open" : "")}>
        <a className="admin-brand" href={base}>
          <img
            src="/assets/london-tech-mark.png"
            alt=""
            width="38"
            height="38"
          />
          <span>
            <b>
              LONDON <em>TECH</em>
            </b>
            <small>STORE CONSOLE</small>
          </span>
        </a>
        <p className="admin-nav-label">WORKSPACE</p>
        <nav>
          {tabs.map(([id, label, Icon]) => (
            <a
              href={base + (id === "dashboard" ? "" : id + "/")}
              key={id}
              className={section === id ? "active" : ""}
              onClick={() => setMenu(false)}
            >
              <Icon size={19} />
              {label}
              {id === "orders" &&
                orders.filter((o) => o.status === "quote_requested").length >
                  0 && (
                  <span>
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
          <div>
            <ShieldCheck size={22} />
            <strong>One store. One clear view.</strong>
            <p>The little details keep everything moving.</p>
          </div>
          <button onClick={storeLink}>
            <ExternalLink size={16} />
            View storefront
            <ArrowUpRight size={13} />
          </button>
          {!preview && (
            <button onClick={() => logout().catch((e) => setError(e.message))}>
              <LogOut size={16} />
              Sign out
            </button>
          )}
        </div>
      </aside>
      {menu && (
        <button
          className="admin-sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="admin-workspace">
        <header className="admin-topbar">
          <IconButton
            label="Toggle navigation"
            className="admin-menu"
            onClick={() => setMenu(!menu)}
          >
            <Menu size={20} />
          </IconButton>
          <div className="admin-search">
            <Search size={18} />
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
              onChange={(e) => {
                setQuery(e.target.value)
                if (section === "dashboard") navigate(base + "products/")
              }}
            />
            <kbd>⌕</kbd>
          </div>
          <div className="admin-top-actions">
            <span className="admin-date">
              <CalendarDays size={15} />
              {dateLabel(new Date())}
            </span>
            <a
              href={base + "activity/"}
              className="icon-button"
              aria-label="View store activity"
            >
              <Bell size={19} />
              <i />
            </a>
            <span className="admin-separator" />
            <a href={base + "settings/"} className="admin-user">
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
                <small>{preview ? "Read-only preview" : "Administrator"}</small>
              </div>
              <ChevronDown size={14} />
            </a>
          </div>
        </header>
        <main className="admin-main">
          {preview && (
            <div className="admin-preview-banner">
              <Eye size={17} />
              <span>
                <strong>Design preview.</strong> Illustrative orders and charts.
                Product guide prices are drafts. Sign in to manage real store
                data.
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
              <h1>
                {section === "dashboard"
                  ? "Your store, at a glance."
                  : section === "products"
                    ? "Your product collection."
                    : section === "orders"
                      ? "Every order. Every detail."
                      : section === "customers"
                        ? "The people behind the orders."
                        : section === "inventory"
                          ? "Keep the essentials in stock."
                          : section === "categories"
                            ? "A place for every product."
                            : section === "settings"
                              ? "Make the store yours."
                              : "A clear record of changes."}
              </h1>
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
            <Dashboard
              data={data}
              preview={preview}
              base={base}
              onOrder={setOrderEditor}
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
                          .slice((page - 1) * 12, page * 12)
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
                      .slice((page - 1) * 12, page * 12)
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
                orders={filteredOrders.slice((page - 1) * 12, page * 12)}
                onOrder={setOrderEditor}
              />
              <AdminPagination
                total={filteredOrders.length}
                page={page}
                setPage={setPage}
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
                setData({ ...data, settings })
                refresh().catch(() => {})
              }}
            />
          )}
        </main>
        <footer className="admin-footer">
          <span>London Tech · Store Console</span>
          <span>
            UGX <i /> Uganda
          </span>
        </footer>
      </div>
      {editor && (
        <ProductEditor
          product={editor}
          preview={preview}
          existing={catalog.some((p) => p.id === editor.id)}
          onClose={() => setEditor(null)}
          onSave={async (p) => {
            setSaving(true)
            try {
              await api(
                "admin/products" +
                  (catalog.some((v) => v.id === p.id) ? "/" + p.id : ""),
                {
                  method: catalog.some((v) => v.id === p.id) ? "PUT" : "POST",
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
            await post("admin/orders/" + orderEditor.id + "/quote", body)
            await load()
            setOrderEditor(null)
          }}
          onClose={() => setOrderEditor(null)}
          onSave={async (status, note) => {
            await api("admin/orders/" + orderEditor.id, {
              method: "PATCH",
              body: { status, note },
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

function Dashboard({ data, preview, base, onOrder }) {
  const paid = data.orders.filter((o) => o.paymentStatus === "paid"),
    sales = paid.reduce((s, o) => s + o.amount, 0),
    low = data.products.filter((p) => p.stock != null && p.stock < 5).length

  return (
    <>
      <div className="admin-metrics">
        {[
          [
            "Total sales",
            money(sales),
            WalletCards,
            "Paid & verified orders",
            "red",
          ],
          [
            "Total orders",
            data.orders.length,
            ShoppingBag,
            "Including confirmation requests",
            "navy",
          ],
          [
            "Customers",
            data.customers.length,
            Users,
            "Registered customer accounts",
            "teal",
          ],
          ["Low stock", low, Box, "Products below 5 units", "amber"],
        ].map(([label, value, Icon, note, tone]) => (
          <article className="admin-panel metric-card" key={label}>
            <div>
              <span>{label}</span>
              <i className={tone}>
                <Icon size={20} />
              </i>
            </div>
            <strong>{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </div>
      <div className="admin-charts-row">
        <section className="admin-panel sales-chart">
          <div className="admin-panel-heading">
            <div>
              <h2>Sales overview</h2>
              <p>
                {preview
                  ? "Illustrative data for layout preview"
                  : "Paid orders over the last twelve months"}
              </p>
            </div>
            <span className="admin-chart-period">
              12 months
              <ChevronDown size={12} />
            </span>
          </div>
          <LineChart orders={data.orders} preview={preview} />
          <div className="chart-footer">
            <span>
              <i />
              Verified sales
            </span>
            <span>Currency: UGX</span>
          </div>
        </section>
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Order performance</h2>
              <p>From request to fulfillment</p>
            </div>
            <IconButton
              label="View orders"
              onClick={() => navigate(base + "orders/")}
            >
              <ArrowUpRight size={17} />
            </IconButton>
          </div>
          <BarChart orders={data.orders} preview={preview} />
          <div className="chart-footer">
            <span>All order statuses</span>
            <span>{data.orders.length} total orders</span>
          </div>
        </section>
      </div>
      <div className="admin-panel recent-orders-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>Recent orders</h2>
            <p>A closer look at what needs your attention.</p>
          </div>
          <a href={base + "orders/"} className="admin-text-link">
            View all orders
            <ArrowRight size={14} />
          </a>
        </div>
        <OrdersTable orders={data.orders.slice(0, 6)} onOrder={onOrder} />
      </div>
      <div className="admin-lower-row">
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Payment methods</h2>
              <p>How customers choose to pay</p>
            </div>
            <WalletCards size={19} />
          </div>
          <div className="admin-payment-summary">
            {[
              ["mtn", "MTN Mobile Money"],
              ["airtel", "Airtel Money"],
              ["visa", "Visa / card"],
            ].map(([id, label]) => {
              const count = paid.filter((o) => o.paymentMethod === id).length
              return (
                <div key={id}>
                  <PaymentLogo method={id} decorative />
                  <div>
                    <strong>{label}</strong>
                    <span>
                      <i
                        style={{
                          width:
                            Math.max(
                              2,
                              (count / Math.max(1, paid.length)) * 100,
                            ) + "%",
                        }}
                      />
                    </span>
                  </div>
                  <b>{count}</b>
                </div>
              )
            })}
          </div>
        </section>
        <section className="admin-panel admin-ready-panel">
          <div className="admin-panel-heading">
            <h2>Ready for your next sale?</h2>
            <ShieldCheck size={20} />
          </div>
          <div>
            {[
              [
                "Product prices confirmed",
                data.products.filter((p) => p.priceConfirmed).length +
                  " / " +
                  data.products.length,
              ],
              [
                "Stock quantities entered",
                data.products.filter((p) => p.stock != null).length +
                  " / " +
                  data.products.length,
              ],
              [
                "Flutterwave",
                data.connection.payments ? "Connected" : "Setup needed",
              ],
              [
                "Reset email",
                data.connection.email ? "Connected" : "Optional setup",
              ],
            ].map(([label, value]) => (
              <p key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </p>
            ))}
          </div>
          <a href={base + "settings/"} className="admin-text-link">
            Review store settings
            <ArrowRight size={14} />
          </a>
        </section>
      </div>
      <section className="admin-panel admin-top-products">
        <div className="admin-panel-heading">
          <h2>Products in the spotlight</h2>
          <a href={base + "products/"} className="admin-text-link">
            Manage products
            <ArrowRight size={14} />
          </a>
        </div>
        <div>
          {data.products
            .filter((p) => p.featured)
            .slice(0, 5)
            .map((p) => (
              <a
                key={p.id}
                href={productPath(p)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src={p.image} alt="" />
                <span>{p.brand}</span>
                <h3>{p.name}</h3>
                <b>{money(p.price)}</b>
                <small>
                  {p.priceConfirmed ? "Confirmed price" : "Guide price"}
                </small>
              </a>
            ))}
        </div>
      </section>
    </>
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

function AdminPagination({ total, page, setPage }) {
  const pages = Math.max(1, Math.ceil(total / 12))
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
    if (preview) {
      setError(
        "This is a read-only preview. Sign in as an administrator to save changes.",
      )
      return
    }
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
            Read-only design preview. Sign in to save product changes.
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
            {preview ? "Sign in to save" : "Save product"}
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
}) {
  const [status, setStatus] = useState(
      ["quoted", "quote_requested", "pending_payment"].includes(o.status)
        ? "review"
        : o.status,
    ),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("")
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
      {["quote_requested", "review", "quoted"].includes(o.status) &&
        o.paymentStatus !== "paid" && (
          <QuoteForm order={o} preview={preview} onSave={onQuote} />
        )}
      <form
        className="stack-form"
        onSubmit={async (e) => {
          e.preventDefault()
          if (preview) {
            setError("Sign in to update real orders.")
            return
          }
          setBusy(true)
          try {
            await onSave(status, note)
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
        <Field label="Customer-visible update (optional)">
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
          />
        </Field>
        <p className="admin-muted small">
          Payment status can only be set by server verification with
          Flutterwave. A paid order cannot be cancelled here.
        </p>
        <Button type="submit" busy={busy}>
          Save order update
          <Check size={16} />
        </Button>
      </form>
    </Modal>
  )
}

function SettingsPanel({ settings, connection, preview, saved }) {
  const [s, setS] = useState(settings),
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
            setError("Sign in as an administrator to save settings.")
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
          <Field
            label="Standard delivery fee (UGX)"
            type="number"
            min="0"
            value={s.deliveryFee ?? ""}
            onChange={(e) =>
              change(
                "deliveryFee",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
            hint="Leave blank to require a delivery quote. Enter 0 only if delivery is free."
          />
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
            ["Password reset email", connection.email],
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
            Payment methods must also be enabled on the Flutterwave merchant
            account.
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
        if (preview) {
          setError("Sign in to confirm a real customer quote.")
          return
        }
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
