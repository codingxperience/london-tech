import { useLocale } from "../lib/locale.jsx"
import { MessageCentre } from "../components/MessageCentre.jsx"
import { PaymentMethod } from "../components/PaymentLogo.jsx"
import { OrderTracking } from "../components/OrderTracking.jsx"
import React, { useEffect, useState } from "react"

import {
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  CheckCircle2,
  Heart,
  Home,
  KeyRound,
  LogOut,
  MapPin,
  Package,
  MessageSquare,
  Plus,
  Settings,
  ShieldCheck,
  Trash2,
  UserRound,
  Printer,
  Clock3,
} from "lucide-react"

import { useStore, navigate } from "../store.jsx"
import { useMediaQuery } from "../lib/use-media-query.js"
import { useMessageAlerts } from "../lib/message-alerts.js"

import { money, productPath } from "../data/catalog.js"

import { api, post, statusLabel, writeStorage } from "../lib/api.js"

import {
  ActionLink,
  Badge,
  Breadcrumb,
  Button,
  Empty,
  Field,
  IconButton,
  Modal,
  Notice,
  PageHeading,
} from "../components/ui.jsx"

import { ProductGrid } from "../components/storefront.jsx"

export { Auth } from "./auth.jsx"

function GuestWishlist() {
  const { t } = useLocale()
  const { products, wishlist, openAuth } = useStore()
  const saved = products.filter((product) => wishlist.includes(product.id))
  return (
    <main className="container standard-page account-wishlist-page">
      <Breadcrumb
        items={[
          { label: t("My account"), href: "/account/" },
          { label: t("Wishlist") },
        ]}
      />
      <PageHeading eyebrow={t("SAVED FOR LATER")} title={t("Your wishlist.")}>
        {t("Keep the things you love close by.")}
      </PageHeading>
      <div className="wishlist-sign-in">
        <Heart size={22} />
        <span>
          <strong>{t("Your favourites, together.")}</strong>
          <small>
            {t("Saved on this device. Sign in to keep them with your account.")}
          </small>
        </span>
        <Button
          variant="secondary"
          onClick={() => openAuth("login", "/account/wishlist/")}
        >
          {t("Sign in")}
        </Button>
      </div>
      {saved.length ? (
        <ProductGrid products={saved} />
      ) : (
        <Empty
          icon={Heart}
          title={t("Save something you love.")}
          action={
            <ActionLink href="/collections/shop/">
              {t("Explore the store")}
            </ActionLink>
          }
        >
          {t("Tap the heart on a product and find it here.")}
        </Empty>
      )}
    </main>
  )
}

export function Account({ section = "overview", orderId }) {
  const { t } = useLocale()
  const compactNavigation = useMediaQuery("(max-width: 1100px)")
  const [navigationOpen, setNavigationOpen] = useState(false)
  const {
    user,
    setUser,
    authLoading,
    logout,
    products,
    wishlist,
    notify,
    openAuth,
  } = useStore()
  const messageAlerts = useMessageAlerts(user?.id)
  const [orders, setOrders] = useState([]),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [addressModal, setAddressModal] = useState(null)

  const load = () =>
    api(orderId ? "orders/" + encodeURIComponent(orderId) : "orders")
      .then((d) => {
        setError("")
        setOrders(orderId ? [d.order].filter(Boolean) : d.orders)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoaded(true))

  useEffect(() => {
    if (user) load()
  }, [user?.id, orderId])
  useEffect(
    () => setNavigationOpen(false),
    [section, orderId, compactNavigation],
  )

  if (!user && section === "wishlist") return <GuestWishlist />

  if (authLoading)
    return (
      <main className="container standard-page">
        <p className="loading-line">{t("Opening your account…")}</p>
      </main>
    )

  if (!user)
    return (
      <main className="container standard-page">
        <Empty
          icon={UserRound}
          title={t("A place for your next.")}
          action={
            <>
              <Button onClick={() => openAuth("login", location.pathname)}>
                {t("Sign in")}
              </Button>
              <a className="text-link" href="/register/">
                {t("Create an account")}
                <ArrowRight size={15} />
              </a>
            </>
          }
        >
          {t("Sign in to see your orders, saved addresses and account details.")}
        </Empty>
      </main>
    )

  const nav = [
    ["overview", "Overview", Home],
    ["orders", "My orders", Package],
    ["messages", "Messages", MessageSquare],
    ["wishlist", "Wishlist", Heart],
    ["addresses", "Addresses", MapPin],
    ["profile", "Account details", UserRound],
    ["security", "Password & security", KeyRound],
  ]

  const persist = async (data) => {
    const result = await api("account", {
      method: "PATCH",
      body: {
        name: user.name,
        phone: user.phone,
        addresses: user.addresses,
        ...data,
      },
    })
    setUser(result.user)
    notify(t("Your details have been saved."))
  }

  const selectedOrder = orders.find((o) => o.id === orderId)

  return (
    <main className="container standard-page">
      <Breadcrumb
        items={[
          {
            label: "My account",
            href: section !== "overview" ? "/account/" : undefined,
          },
          ...(section !== "overview"
            ? [{ label: nav.find(([id]) => id === section)?.[1] || "Orders" }]
            : []),
        ]}
      />
      <h1 className="sr-only">{t("My account")}</h1>
      <div className="account-layout">
        <aside
          className="account-sidebar"
          onKeyDown={(event) => {
            if (event.key !== "Escape" || !navigationOpen) return
            setNavigationOpen(false)
            event.currentTarget
              .querySelector(".account-navigation-toggle")
              ?.focus()
          }}
        >
          <div className="account-avatar">
            <span className="account-profile-icon" aria-hidden="true">
              <UserRound size={23} />
            </span>
            <span className="account-identity">
              <strong title={user.name}>{user.name}</strong>
              <small title={user.email}>{user.email}</small>
            </span>
          </div>
          {compactNavigation && (
            <button
              className="account-navigation-toggle"
              aria-expanded={navigationOpen}
              aria-controls="account-navigation"
              onClick={() => setNavigationOpen((open) => !open)}
            >
              <span>{t("Account menu")}</span>
              <strong>
                {t(nav.find(([id]) => id === section)?.[1] || "My orders")}
              </strong>
              <ChevronDown size={19} />
            </button>
          )}
          <nav
            id="account-navigation"
            aria-label={t("Account navigation")}
            hidden={compactNavigation && !navigationOpen}
          >
            {nav.map(([id, label, Icon]) => (
              <a
                href={"/account/" + (id === "overview" ? "" : id + "/")}
                key={id}
                className={section === id ? "active" : ""}
                aria-current={section === id ? "page" : undefined}
                onClick={() => setNavigationOpen(false)}
              >
                <Icon size={20} />
                {t(label)}
                {id === "messages" && messageAlerts.unread > 0 && (
                  <span
                    className="message-count"
                    aria-label={t("{count} unread messages", { count: messageAlerts.unread })}
                  >
                    {messageAlerts.unread > 99 ? "99+" : messageAlerts.unread}
                  </span>
                )}
                <ArrowRight size={13} />
              </a>
            ))}
            {user.role === "admin" && (
              <a href="/admin/">
                <Settings size={17} />
                {t("Store admin")}
                <ArrowRight size={13} />
              </a>
            )}
            <button onClick={() => logout().catch((e) => setError(e.message))}>
              <LogOut size={17} />
              {t("Sign out")}
            </button>
          </nav>
        </aside>
        <div className="account-content">
          {error && <Notice type="error">{error}</Notice>}
          {section === "messages" ? (
            <MessageCentre key={user.id} alerts={messageAlerts} />
          ) : section === "overview" ? (
            <>
              <div className="account-stat-grid">
                <a href="/account/orders/">
                  <Package size={22} />
                  <strong>{orders.length}</strong>
                  <span>
                    {t("Orders")}
                    <ArrowRight size={14} />
                  </span>
                </a>
                <a href="/account/wishlist/">
                  <Heart size={22} />
                  <strong>{wishlist.length}</strong>
                  <span>
                    {t("Saved favourites")}
                    <ArrowRight size={14} />
                  </span>
                </a>
                <a href="/account/addresses/">
                  <MapPin size={22} />
                  <strong>{user.addresses.length}</strong>
                  <span>
                    {t("Saved addresses")}
                    <ArrowRight size={14} />
                  </span>
                </a>
              </div>
              <div className="section-heading">
                <h2>{t("Your latest orders")}</h2>
                <a className="text-link" href="/account/orders/">
                  {t("View all")}
                  <ArrowRight size={14} />
                </a>
              </div>
              <OrderList orders={orders.slice(0, 3)} loaded={loaded} />
              {(!user.phone || !user.addresses.length) && (
                <div className="account-profile-reminder">
                  <span>
                    {t("Save your contact and delivery details for your next order.")}
                  </span>
                  <a href="/account/profile/">
                    {t("Account details")} <ArrowRight size={16} />
                  </a>
                </div>
              )}
            </>
          ) : section === "orders" ? (
            orderId ? (
              <OrderDetail
                order={selectedOrder}
                loaded={loaded}
                reload={load}
              />
            ) : (
              <>
                <h2>{t("My orders")}</h2>
                <OrderList orders={orders} loaded={loaded} />
              </>
            )
          ) : section === "wishlist" ? (
            <>
              <h2>{t("Your saved favourites")}</h2>
              {wishlist.length ? (
                <ProductGrid
                  products={wishlist
                    .map((id) => products.find((p) => p.id === id))
                    .filter(Boolean)}
                />
              ) : (
                <Empty icon={Heart} title={t("A little inspiration for later.")}>
                  {t("Save products with the heart icon to find them here.")}
                </Empty>
              )}
            </>
          ) : section === "profile" ? (
            <section className="form-card">
              <h2>{t("Account details")}</h2>
              <p className="muted">
                {t("Keep your name and contact number up to date.")}
              </p>
              <form
                className="stack-form"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setBusy(true)
                  setError("")
                  const fd = new FormData(e.currentTarget)
                  try {
                    await persist({
                      name: fd.get("name"),
                      phone: fd.get("phone"),
                    })
                  } catch (err) {
                    setError(err.message)
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                <Field
                  label={t("Full name")}
                  name="name"
                  defaultValue={user.name}
                  required
                  minLength={2}
                  maxLength={100}
                />
                <Field
                  label={t("Email address")}
                  type="email"
                  value={user.email}
                  title={user.email}
                  readOnly
                  hint={t("Your email identifies your account.")}
                />
                <Field
                  label={t("Phone number")}
                  name="phone"
                  type="tel"
                  defaultValue={user.phone}
                  maxLength={25}
                />
                <Button busy={busy} type="submit">
                  {t("Save your details")}
                  <CheckCircle2 size={16} />
                </Button>
              </form>
            </section>
          ) : section === "security" ? (
            <section className="form-card">
              <h2>{t("Password & security")}</h2>
              <p className="muted">
                {t("Changing your password signs out other sessions.")}
              </p>
              <form
                className="stack-form"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setBusy(true)
                  setError("")
                  const form = e.currentTarget
                  const fd = new FormData(form)
                  try {
                    await post("account/password", {
                      currentPassword: fd.get("currentPassword"),
                      password: fd.get("password"),
                    })
                    notify(t("Your password has been updated."))
                    form.reset()
                  } catch (err) {
                    setError(err.message)
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                <Field
                  label={t("Current password")}
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                />
                <Field
                  label={t("New password")}
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  hint={t("At least 12 characters.")}
                  required
                />
                <Button busy={busy} type="submit">
                  {t("Update password")}
                  <ShieldCheck size={16} />
                </Button>
              </form>
            </section>
          ) : (
            <>
              <div className="section-heading">
                <h2>{t("Saved addresses")}</h2>
                <Button
                  onClick={() => setAddressModal({})}
                  disabled={user.addresses.length >= 5}
                >
                  <Plus size={15} />
                  {t("Add an address")}
                </Button>
              </div>
              {user.addresses.length ? (
                <div className="address-grid">
                  {user.addresses.map((a, i) => (
                    <article className="form-card" key={a.id || i}>
                      <div>
                        <Badge>{a.label}</Badge>
                        <IconButton
                          label={t("Remove address")}
                          onClick={async () => {
                            try {
                              await persist({
                                addresses: user.addresses.filter(
                                  (_, idx) => idx !== i,
                                ),
                              })
                            } catch (e) {
                              setError(e.message)
                            }
                          }}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </div>
                      <h3>{a.name}</h3>
                      <p>
                        {a.address}
                        <br />
                        {a.district}
                        <br />
                        {a.phone}
                      </p>
                      <button
                        className="text-link"
                        onClick={() => setAddressModal({ ...a, index: i })}
                      >
                        {t("Edit address")}
                        <ArrowRight size={14} />
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <Empty
                  icon={MapPin}
                  title={t("Your next delivery, a little easier.")}
                >
                  {t("Save up to five addresses for checkout.")}
                </Empty>
              )}
            </>
          )}
        </div>
      </div>
      {addressModal && (
        <Modal
          title={t(addressModal.id ? "Edit your address" : "Add an address")}
          onClose={() => setAddressModal(null)}
        >
          <form
            className="stack-form"
            onSubmit={async (e) => {
              e.preventDefault()
              setBusy(true)
              setError("")
              const data = Object.fromEntries(new FormData(e.currentTarget))
              const addresses = [...user.addresses]
              const next = {
                ...data,
                id: addressModal.id || crypto.randomUUID(),
              }
              if (addressModal.index != null)
                addresses[addressModal.index] = next
              else addresses.push(next)
              try {
                await persist({ addresses })
                setAddressModal(null)
              } catch (err) {
                setError(err.message)
              } finally {
                setBusy(false)
              }
            }}
          >
            {error && <Notice type="error">{error}</Notice>}
            <Field
              label={t("Address label")}
              name="label"
              defaultValue={addressModal.label || t("Home")}
              required
              maxLength={60}
            />
            <Field
              label={t("Recipient name")}
              name="name"
              defaultValue={addressModal.name || user.name}
              required
              minLength={2}
              maxLength={100}
            />
            <Field
              label={t("Phone number")}
              name="phone"
              type="tel"
              defaultValue={addressModal.phone || user.phone}
              required
              minLength={9}
              maxLength={25}
            />
            <Field
              label={t("District / city")}
              name="district"
              defaultValue={addressModal.district}
              required
              minLength={2}
              maxLength={100}
            />
            <Field label={t("Street, building and directions")}>
              <textarea
                name="address"
                rows={3}
                defaultValue={addressModal.address}
                required
                minLength={5}
                maxLength={400}
              />
            </Field>
            <Button busy={busy} type="submit">
              {t("Save address")}
              <CheckCircle2 size={16} />
            </Button>
          </form>
        </Modal>
      )}
    </main>
  )
}

function OrderList({ orders, loaded }) {
  const { t, language } = useLocale()
  const orderDate = new Intl.DateTimeFormat(language === "ar" ? "ar-UG" : "en-UG", {
    dateStyle: "medium",
    timeZone: "Africa/Kampala",
  })
  if (!loaded) return <p className="loading-line">{t("Loading your orders…")}</p>
  if (!orders.length)
    return (
      <Empty
        icon={Package}
        title={t("Your next story starts here.")}
        action={
          <ActionLink href="/collections/shop/">
            {t("Explore the collection")}
          </ActionLink>
        }
      >
        {t("Orders and confirmation requests will appear here.")}
      </Empty>
    )
  return (
    <div className="customer-orders">
      {orders.map((o) => (
        <a href={"/account/orders/" + o.id + "/"} key={o.id}>
          <div className="order-preview-images">
            {o.items.slice(0, 3).map((p, i) => (
              <img src={p.image} alt="" key={i} />
            ))}
          </div>
          <div>
            <strong>{o.id}</strong>
            <small>
              {orderDate.format(new Date(o.createdAt))} · {t(o.items.length === 1 ? "{count} item" : "{count} items", { count: o.items.length })}
              {o.paymentMode === "test" && " · " + t("Test order")}
            </small>
          </div>
          <Badge type={o.paymentStatus === "paid" ? "success" : ""}>
            {t(statusLabel(o.status))}
          </Badge>
          <b>{money(o.amount ?? o.subtotal)}</b>
          <ArrowRight size={16} />
        </a>
      ))}
    </div>
  )
}

function OrderDetail({ order: o, loaded, reload }) {
  const { t, language } = useLocale()
  const orderDate = new Intl.DateTimeFormat(language === "ar" ? "ar-UG" : "en-UG", {
    dateStyle: "medium",
    timeZone: "Africa/Kampala",
  })
  const { settings, notify } = useStore()
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [refreshing, setRefreshing] = useState(false)

  if (!loaded) return <p className="loading-line">{t("Opening your order…")}</p>
  if (!o)
    return (
      <Empty icon={Package} title={t("This order could not be found.")}>
        {t("Check the reference or return to your order list.")}
      </Empty>
    )

  return (
    <div className="customer-order-detail">
      <div className="order-tracking-heading">
        <a className="text-link" href="/account/orders/">
          <ArrowLeft size={15} />
          {t("All orders")}
        </a>
        <h2>{t("Track order")}</h2>
      </div>
      {error && <Notice type="error">{error}</Notice>}
      {o.status === "quote_requested" && (
        <Notice>
          {t("Your request is with the store. The price, configuration and availability will be confirmed before any payment.")}
        </Notice>
      )}
      {o.status === "quoted" && (
        <Notice type="success">
          {t("Your confirmed quote is ready. Review the total and details below, then continue to secure payment. The quote is valid for 24 hours, subject to available stock.")}
        </Notice>
      )}
      {o.paymentStatus === "paid" && o.status === "review" && (
        <Notice type="success">
          {t("Payment confirmed. The store is reviewing fulfillment and will contact you.")}
        </Notice>
      )}
      <OrderTracking
        order={o}
        refreshing={refreshing}
        refresh={async () => {
          setRefreshing(true)
          try {
            await reload()
          } finally {
            setRefreshing(false)
          }
        }}
      />
      <div className="form-card order-items-card">
        <div className="order-items-heading">
          <h3>{t("Order items")}</h3>
          <time dateTime={o.createdAt}>{t("Placed {date}", { date: orderDate.format(new Date(o.createdAt)) })}</time>
        </div>
        {o.items.map((p, i) => (
          <div className="order-detail-item" key={i}>
            <img src={p.image} alt="" />
            <span>
              <a href={productPath(p)}>{p.name}</a>
              <small>
                {[p.option, p.color].filter(Boolean).join(" · ")} · {t("Qty")}{" "}
                {p.quantity}
              </small>
            </span>
            <b>
              {money(p.unitPrice == null ? null : p.unitPrice * p.quantity)}
            </b>
          </div>
        ))}
        <div className="summary-row">
          <span>{t("Subtotal")}</span>
          <strong>{money(o.subtotal)}</strong>
        </div>
        <div className="summary-row">
          <span>{t(statusLabel(o.fulfillment))}</span>
          <span>{money(o.deliveryFee)}</span>
        </div>
        <div className="summary-total">
          <span>{t(o.amount == null ? "Estimated subtotal" : "Total")}</span>
          <strong>{money(o.amount ?? o.subtotal)}</strong>
        </div>
      </div>
      <div className="detail-copy-columns">
        <section className="form-card">
          <h3>{t("Your details")}</h3>
          <p>
            {o.customer.name}
            <br />
            {o.customer.email}
            <br />
            {o.customer.phone}
          </p>
          <h4>
            {o.fulfillment === "delivery"
              ? t("Delivery address")
              : t("Collection location")}
          </h4>
          <p>
            {o.fulfillment === "delivery"
              ? o.customer.address + ", " + o.customer.district
              : settings.address}
          </p>
        </section>
        <section className="form-card">
          <h3>{t("Payment information")}</h3>
          <p>
            <PaymentMethod method={o.paymentMethod} />
          </p>
          <Badge type={o.paymentStatus === "paid" ? "success" : ""}>
            {o.paymentMode === "test" ? t("Test") + " · " : ""}
            {t(statusLabel(o.paymentStatus))}
          </Badge>
          {o.cashReceipt?.receipt && <p>{t("Receipt {receipt}", { receipt: o.cashReceipt.receipt })}</p>}
          {o.notes && (
            <>
              <h4>{t("Your note")}</h4>
              <p>{o.notes}</p>
            </>
          )}
        </section>
      </div>
      <div className="order-actions">
        {["quoted", "pending_payment"].includes(o.status) &&
          new Date(o.expiresAt) > new Date() && (
            <Button
              busy={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  const data = await post("orders/" + o.id + "/pay")
                  location.assign(data.url)
                } catch (e) {
                  setError(e.message)
                  setBusy(false)
                }
              }}
            >
              {t("Continue payment")}
              <ArrowRight size={15} />
            </Button>
          )}
        {(["quoted", "pending_payment", "quote_requested"].includes(o.status) ||
          (o.paymentMethod === "cod" && o.status === "confirmed")) &&
          o.paymentStatus !== "paid" && (
            <Button
              variant="secondary"
              busy={busy}
              onClick={async () => {
                if (!window.confirm(t("Cancel this unpaid order?"))) return
                setBusy(true)
                try {
                  await post("orders/" + o.id + "/cancel")
                  writeStorage("lt.checkout-key", null)
                  await reload()
                  notify(t("Your order has been cancelled."))
                } catch (e) {
                  setError(e.message)
                } finally {
                  setBusy(false)
                }
              }}
            >
              {t("Cancel order")}
            </Button>
          )}
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer size={15} />
          {t("Print {name}", { name: t(o.paymentStatus === "paid" ? "receipt" : "summary") })}
        </Button>
        <ActionLink className="secondary" href="/contact/">
          {t("Contact the store")}
        </ActionLink>
      </div>
    </div>
  )
}
