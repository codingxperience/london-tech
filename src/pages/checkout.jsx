import { useLocale } from "../lib/locale.jsx"
import { PaymentLogo } from "../components/PaymentLogo.jsx"
import { BrandWordmark } from "../components/BrandWordmark.jsx"
import React, { useEffect, useState, useMemo } from "react"
import {
  calculateDelivery,
  deliveryDistricts,
  findDeliveryDistrict,
} from "../lib/delivery.js"

import {
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  MapPin,
  Phone,
  Store,
  ShoppingBag,
  Trash2,
  Truck,
  WalletCards,
  XCircle,
} from "lucide-react"

import { useStore, cartKey, navigate } from "../store.jsx"

import { money, productPath } from "../data/catalog.js"

import {
  api,
  post,
  dateLabel,
  statusLabel,
  readStorage,
  writeStorage,
} from "../lib/api.js"

import {
  ActionLink,
  Badge,
  Breadcrumb,
  Button,
  Empty,
  Field,
  IconButton,
  Notice,
  PageHeading,
  Quantity,
} from "../components/ui.jsx"

import {
  PaymentMarks,
  ProductGrid,
  SectionHeading,
} from "../components/storefront.jsx"

export function Cart() {
  const { t, formatNumber } = useLocale()
  const { lines, subtotal, updateCart, removeCart, products } = useStore()
  const hasGuide = lines.some((line) => !line.product?.priceConfirmed)
  return (
    <main className="container standard-page">
      <Breadcrumb items={[{ label: t("Your cart") }]} />
      <PageHeading eyebrow={t("A FEW GOOD CHOICES")} title={t("Your cart.")}>
        {lines.length
          ? t("A little closer to your everyday upgrade. Review your choices below.")
          : t("Good things start with a little exploring.")}
      </PageHeading>
      {lines.length ? (
        <div className="cart-layout">
          <div>
            <div className="cart-table-heading">
              <span>{t("Product")}</span>
              <span>{t("Quantity")}</span>
              <span>{t("Total")}</span>
            </div>
            {lines.map((line) => {
              const p = line.product
              return (
                <article className="cart-line" key={cartKey(line)}>
                  <div className="cart-product">
                    <a href={p ? productPath(p) : "/collections/shop/"}>
                      <img
                        src={p?.image || "/assets/london-tech-mark.png"}
                        alt=""
                      />
                    </a>
                    <div>
                      <small>{p?.brand}</small>
                      <h2>
                        <a href={p ? productPath(p) : "/collections/shop/"}>
                          {p?.name || t("Unavailable product")}
                        </a>
                      </h2>
                      <p>
                        {[line.option, line.color]
                          .filter(Boolean)
                          .join(" · ") || t("Standard configuration")}
                      </p>
                      <span>
                        {p?.priceConfirmed ? "" : t("Guide price") + " · "}
                        {money(p?.price)}
                      </span>
                      {!p && (
                        <span className="field-error">
                          Remove this item to continue.
                        </span>
                      )}
                    </div>
                  </div>
                  <Quantity
                    value={line.quantity}
                    max={Math.max(1, Math.min(10, p?.stock ?? 10))}
                    onChange={(quantity) => updateCart(cartKey(line), quantity)}
                  />
                  <strong>
                    {p?.price != null
                      ? money(p.price * line.quantity)
                      : t("On request")}
                  </strong>
                  <IconButton
                    label={t("Remove {name}", { name: p?.name || t("item") })}
                    onClick={() => removeCart(cartKey(line))}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </article>
              )
            })}
            <a href="/collections/shop/" className="text-link cart-continue">
              <ArrowLeft size={15} />
              {t("Keep exploring")}
            </a>
            {hasGuide && (
              <Notice>
                {t("Guide prices are estimates. The store will confirm the exact configuration, price and availability before payment.")}
              </Notice>
            )}
          </div>
          <aside className="order-summary">
            <p className="eyebrow">{t("THE NEXT STEP")}</p>
            <h2>{t("Order summary")}</h2>
            <div className="summary-row">
              <span>
                {t("Items")} (
                {formatNumber(lines.reduce((s, p) => s + p.quantity, 0))})
              </span>
              <strong>{money(subtotal)}</strong>
            </div>
            <div className="summary-row">
              <span>{t("Delivery")}</span>
              <span>{t("At checkout")}</span>
            </div>
            <div className="summary-total">
              <span>{t(hasGuide ? "Estimated subtotal" : "Subtotal")}</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <p className="small muted">
              {t("Your final total and delivery arrangements are confirmed before you pay.")}
            </p>
            <ActionLink href="/checkout/">
              {t("Continue to checkout")}
            </ActionLink>
            <div className="secure-note">
              <LockKeyhole size={14} />
              {t("Cash on receipt or secure online payment.")}
            </div>
            <PaymentMarks />
          </aside>
        </div>
      ) : (
        <Empty
          title={t("A little room for possibility.")}
          action={
            <ActionLink href="/collections/shop/">
              {t("Find your next")}
            </ActionLink>
          }
        >
          {t("Your cart is empty. Explore the collection and add something that fits your life.")}
        </Empty>
      )}
      <section className="section">
        <SectionHeading
          title={t("A few more possibilities.")}
          href="/collections/shop/"
        />
        <ProductGrid
          products={products
            .filter((p) => p.featured && !lines.some((l) => l.id === p.id))
            .slice(0, 4)}
        />
      </section>
    </main>
  )
}

function checkoutKey(cart) {
  const encoded = JSON.stringify(cart)
  let saved = readStorage("lt.checkout-key", null)
  if (
    !saved ||
    saved.cart !== encoded ||
    !saved.createdAt ||
    Date.now() - saved.createdAt > 30 * 60 * 1000
  ) {
    saved = { cart: encoded, key: crypto.randomUUID(), createdAt: Date.now() }
    writeStorage("lt.checkout-key", saved)
  }
  return saved.key
}

export function Checkout() {
  const { t, formatNumber } = useLocale()
  const {
    lines,
    cart,
    subtotal,
    user,
    authLoading,
    settings,
    config,
    notify,
    setCart,
    refresh,
  } = useStore()
  const [method, setMethod] = useState("cod"),
    [fulfillment, setFulfillment] = useState("collection"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [addressIndex, setAddressIndex] = useState(""),
    [district, setDistrict] = useState(""),
    [pendingOrder, setPendingOrder] = useState(null)
  const attemptId = useMemo(
    () => (cart.length ? checkoutKey(cart) : null),
    [JSON.stringify(cart)],
  )
  const track = async (form) => {
    if (!user || !attemptId) return
    const phone = String(form?.get("phone") || user.phone || "")
    try {
      await post("checkout/attempts", {
        id: attemptId,
        items: cart,
        paymentMethod: method,
        fulfillment,
        district,
        phone: /^\+?[0-9\s()-]{9,25}$/.test(phone) ? phone : "",
      })
    } catch {}
  }
  useEffect(() => {
    track()
  }, [user?.id, attemptId, method, fulfillment, district])

  const delivery =
    fulfillment === "collection"
      ? { fee: 0 }
      : calculateDelivery(settings, district)

  const payable =
    lines.length > 0 &&
    lines.every(
      (l) =>
        l.product?.priceConfirmed &&
        l.product?.price > 0 &&
        l.product?.stock >= l.quantity,
    ) &&
    (method === "cod" || config.payments) &&
    (fulfillment === "collection" ? !!settings.address : delivery.fee != null)

  const deliveryFee = delivery.fee
  const total =
    subtotal == null || deliveryFee == null ? null : subtotal + deliveryFee

  const submit = async (e) => {
    e.preventDefault()
    setError("")
    setBusy(true)
    const fd = new FormData(e.currentTarget)
    try {
      if (!payable)
        throw new Error(
          t("Review your items, delivery details and payment method before placing the order."),
        )
      await track(fd)
      const data = await post("orders", {
        items: cart,
        customer: {
          name: fd.get("name"),
          email: fd.get("email"),
          phone: fd.get("phone"),
          district: fd.get("district") || "",
          address: fd.get("address") || "",
        },
        fulfillment,
        paymentMethod: method,
        notes: fd.get("notes") || "",
        key: attemptId,
        enquiry: false,
        attemptId,
        expectedTotal: total,
      })
      setPendingOrder(data.order)
      if (data.order.status === "cancelled")
        throw new Error(
          t("This order was cancelled. Start again below to place a new order."),
        )
      if (data.order.paymentMethod !== method)
        throw new Error(
          t("This checkout already has an order. Open it below, or cancel it before choosing another payment method."),
        )
      if (data.order.paymentMethod === "cod") {
        writeStorage("lt.checkout-key", null)
        setCart((old) =>
          old.flatMap((line) => {
            const purchased = data.order.items.find(
              (i) => cartKey(i) === cartKey(line),
            )
            return !purchased
              ? [line]
              : line.quantity > purchased.quantity
                ? [{ ...line, quantity: line.quantity - purchased.quantity }]
                : []
          }),
        )
        refresh().catch(() => {})
        navigate("/account/orders/" + data.order.id + "/")
        notify(
          fulfillment === "delivery"
            ? t("Order placed. Pay when it is delivered.")
            : t("Order placed. Pay when you collect it."),
        )
        return
      }
      const payment = await post("orders/" + data.order.id + "/pay")
      location.assign(payment.url)
    } catch (err) {
      setError(err.message)
      refresh().catch(() => {})
    } finally {
      setBusy(false)
    }
  }

  if (authLoading)
    return (
      <main className="container standard-page">
        <p className="loading-line">{t("Getting your checkout ready…")}</p>
      </main>
    )

  if (!lines.length)
    return (
      <main className="container standard-page">
        <Empty
          title={t("Let’s find your next first.")}
          action={
            <ActionLink href="/collections/shop/">
              {t("Explore products")}
            </ActionLink>
          }
        >
          {t("Add a product to your cart to start checkout.")}
        </Empty>
      </main>
    )

  if (!user)
    return (
      <main className="container standard-page">
        <Breadcrumb
          items={[{ label: t("Cart"), href: "/cart/" }, { label: t("Checkout") }]}
        />
        <Empty
          icon={LockKeyhole}
          title={t("A familiar place for your orders.")}
          action={
            <>
              <ActionLink href="/login/?next=/checkout/">
                {t("Sign in to continue")}
              </ActionLink>
              <a className="text-link" href="/register/?next=/checkout/">
                {t("Create an account")}
                <ArrowRight size={15} />
              </a>
            </>
          }
        >
          {t("Sign in or create an account to keep your order information and payment status together. Your cart is saved.")}
        </Empty>
      </main>
    )

  const saved =
    addressIndex === "" ? undefined : user.addresses?.[Number(addressIndex)]

  return (
    <main className="container standard-page">
      <Breadcrumb
        items={[{ label: t("Cart"), href: "/cart/" }, { label: t("Checkout") }]}
      />
      <div className="checkout-heading">
        <PageHeading title={t("Checkout")} />
        <span>
          <LockKeyhole size={15} />
          {t("Secure checkout")}
        </span>
      </div>
      <form
        onSubmit={submit}
        className="checkout-layout refined-checkout"
        onBlur={(e) => track(new FormData(e.currentTarget))}
      >
        <div className="checkout-form">
          {error && <Notice type="error">{error}</Notice>}
          {pendingOrder && (
            <Notice>
              <a href={"/account/orders/" + pendingOrder.id + "/"}>
                {t("Open order {id}", { id: pendingOrder.id })}
              </a>
              {pendingOrder.paymentStatus !== "paid" &&
                (["pending_payment", "quoted", "cancelled"].includes(
                  pendingOrder.status,
                ) ||
                  (pendingOrder.status === "confirmed" &&
                    pendingOrder.paymentMethod === "cod")) && (
                  <button
                    type="button"
                    className="text-link"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true)
                      try {
                        if (pendingOrder.status !== "cancelled")
                          await post("orders/" + pendingOrder.id + "/cancel")
                        writeStorage("lt.checkout-key", null)
                        setPendingOrder(null)
                        setError("")
                        notify(t("Checkout reset. You can place a new order."))
                        navigate("/checkout/?retry=" + Date.now())
                      } catch (e) {
                        setError(e.message)
                      } finally {
                        setBusy(false)
                      }
                    }}
                  >
                    {t("Cancel previous order and start again")}
                  </button>
                )}
            </Notice>
          )}
          <section className="form-card">
            <div className="form-section-heading">
              <span>{formatNumber(1)}</span>
              <h2>{t("Your details")}</h2>
            </div>
            <div className="form-grid">
              <Field
                label={t("Full name")}
                name="name"
                autoComplete="name"
                defaultValue={user.name}
                required
                minLength={2}
                maxLength={100}
              />
              <Field
                label={t("Email address")}
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={user.email}
                required
              />
              <Field
                label={t("Phone number")}
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder={t("07XX XXX XXX")}
                defaultValue={saved?.phone || user.phone}
                key={"phone" + addressIndex}
                required
                minLength={9}
                maxLength={25}
              />
            </div>
            {config.orderEmails && (
              <p className="checkout-contact-note">
                {t("Order updates go to this email.")}
              </p>
            )}
          </section>
          <section className="form-card">
            <div className="form-section-heading">
              <span>{formatNumber(2)}</span>
              <h2>{t("Delivery or pickup")}</h2>
            </div>
            <div
              className="fulfillment-choices"
              role="group"
              aria-label={t("Delivery or pickup")}
            >
              <label className={fulfillment === "collection" ? "selected" : ""}>
                <input
                  type="radio"
                  name="fulfillment"
                  checked={fulfillment === "collection"}
                  onChange={() => setFulfillment("collection")}
                />
                <Store size={22} aria-hidden="true" />
                <span>
                  <strong>{t("Store pickup")}</strong>
                  <small>{t("Free")}</small>
                </span>
              </label>
              <label className={fulfillment === "delivery" ? "selected" : ""}>
                <input
                  type="radio"
                  name="fulfillment"
                  checked={fulfillment === "delivery"}
                  onChange={() => setFulfillment("delivery")}
                />
                <Truck size={22} aria-hidden="true" />
                <span>
                  <strong>{t("Delivery")}</strong>
                  <small>
                    {fulfillment !== "delivery" || delivery.fee == null
                      ? t("By district")
                      : money(delivery.fee)}
                  </small>
                </span>
              </label>
            </div>
            {fulfillment === "collection" ? (
              <div className="collection-address">
                <MapPin size={18} />
                <p>
                  {settings.address ||
                    t("Collection details will be confirmed by the store.")}
                  {settings.hours && <small>{settings.hours}</small>}
                </p>
              </div>
            ) : (
              <>
                {user.addresses?.length > 0 && (
                  <Field label={t("Use a saved address")}>
                    <select
                      value={addressIndex}
                      onChange={(e) => {
                        setAddressIndex(e.target.value)
                        setDistrict(
                          e.target.value === ""
                            ? ""
                            : findDeliveryDistrict(
                                user.addresses?.[Number(e.target.value)]
                                  ?.district,
                              )?.name || "",
                        )
                      }}
                    >
                      <option value="">{t("Enter an address")}</option>
                      {user.addresses.map((a, i) => (
                        <option value={i} key={i}>
                          {a.label} — {a.district}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                <div className="form-grid">
                  <Field label={t("Delivery district")}>
                    <select
                      name="district"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      required
                    >
                      <option value="">{t("Select a district")}</option>
                      {deliveryDistricts.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label={t("Street, building and delivery directions")}
                    name="address"
                    autoComplete="street-address"
                    defaultValue={saved?.address || ""}
                    key={"address" + addressIndex}
                    required
                    minLength={5}
                    maxLength={400}
                  />
                </div>
                {delivery.distanceKm != null && (
                  <p className="checkout-distance">
                    {t("Estimated district distance · {distance} km", { distance: delivery.distanceKm })}
                  </p>
                )}
              </>
            )}
          </section>
          <section className="form-card">
            <div className="form-section-heading">
              <span>{formatNumber(3)}</span>
              <h2>{t("Payment method")}</h2>
            </div>
            {config.paymentMode === "test" && config.payments && (
              <Notice>
                {t("Online payments use Flutterwave Test Mode. Use")}{" "}
                <a
                  href="https://developer.flutterwave.com/docs/testing"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("Flutterwave test details")}
                </a>{" "}
                {t("for a simulated payment. Cash orders use regular checkout.")}
              </Notice>
            )}
            <div
              className="payment-options"
              role="group"
              aria-label={t("Payment method")}
            >
              {[
                [
                  "cod",
                  fulfillment === "delivery"
                    ? "Cash on delivery"
                    : "Cash at pickup",
                ],
                ["mtn", "MTN Mobile Money"],
                ["airtel", "Airtel Money"],
                ["visa", "Visa card"],
              ].map(([id, title]) => {
                const disabled = id !== "cod" && !config.payments
                return (
                  <label
                    key={id}
                    className={`${method === id ? "selected" : ""}${
                      disabled ? " unavailable" : ""
                    }`}
                  >
                    <PaymentLogo method={id} decorative />
                    <strong>{t(title)}</strong>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={id}
                      checked={method === id}
                      disabled={disabled}
                      onChange={() => setMethod(id)}
                    />
                  </label>
                )
              })}
            </div>
            {!config.payments && (
              <p className="checkout-distance">
                {t("Online payment is currently unavailable.")}
              </p>
            )}
            {method !== "cod" && (
              <p className="checkout-distance">
                {t("Choose your")}{" "}
                {method === "visa"
                  ? t("card")
                  : method === "mtn"
                    ? t("MTN number")
                    : t("Airtel number")}{" "}
                {t("on Flutterwave.")}
              </p>
            )}
            {!payable &&
              lines.some(
                (l) =>
                  !l.product?.priceConfirmed ||
                  !l.product?.stock ||
                  l.product.stock < l.quantity,
              ) && (
                <Notice>
                  {t("An item is unavailable for checkout. Review your cart before placing the order.")}
                </Notice>
              )}
          </section>
          <section className="checkout-terms">
            <details>
              <summary>{t("Add an order note")}</summary>
              <Field label={t("Order note")}>
                <textarea
                  name="notes"
                  rows={3}
                  maxLength={1000}
                  placeholder={t("Optional")}
                />
              </Field>
            </details>
          </section>
        </div>
        <aside className="order-summary checkout-summary">
          <h2>{t("Your order")}</h2>
          <div className="checkout-items">
            {lines.map((line) => (
              <div key={cartKey(line)}>
                <img src={line.product?.image} alt="" />
                <span>
                  <strong>{line.product?.name || t("Unavailable product")}</strong>
                  <small>
                    {[line.option, line.color].filter(Boolean).join(" · ")} ×{" "}
                    {formatNumber(line.quantity)}
                  </small>
                </span>
                <b>
                  {line.product?.price != null
                    ? money(line.product.price * line.quantity)
                    : t("On request")}
                </b>
              </div>
            ))}
          </div>
          <div className="summary-row">
            <span>{t("Subtotal")}</span>
            <strong>{money(subtotal)}</strong>
          </div>
          <div className="summary-row">
            <span>
              {t(fulfillment === "delivery" ? "Delivery" : "Collection")}
            </span>
            <span>
              {deliveryFee == null ? t("To be confirmed") : money(deliveryFee)}
            </span>
          </div>
          <div className="summary-total">
            <span>{t("Total")}</span>
            <strong>{money(total)}</strong>
          </div>
          <label className="checkbox-label terms-check">
            <input type="checkbox" required />
            <span>
              {t("I agree to the")} <a href="/terms/">{t("terms")}</a>{" "}
              {t("and have read the")}{" "}
              <a href="/privacy/">{t("privacy information")}</a>.
            </span>
          </label>
          <Button type="submit" busy={busy} disabled={!payable}>
            {t(method === "cod" ? "Place order" : "Continue to payment")}
            <ArrowRight size={17} />
          </Button>
          <p className="small muted">
            {method === "cod"
              ? fulfillment === "delivery"
                ? t("Pay on delivery.")
                : t("Pay at pickup.")
              : t("Secure payment through Flutterwave.")}
          </p>
          <a href="/cart/" className="text-link">
            <ArrowLeft size={14} />
            {t("Back to cart")}
          </a>
        </aside>
      </form>
    </main>
  )
}

export function PaymentResult() {
  const { t } = useLocale()
  const { user, authLoading, setCart } = useStore()
  const [order, setOrder] = useState(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState("")

  const params = new URLSearchParams(location.search),
    id = params.get("order"),
    transaction = params.get("transaction_id")

  useEffect(() => {
    if (authLoading || !user) return
    let active = true
    const run = async () => {
      try {
        let data
        if (transaction)
          data = await post("orders/" + encodeURIComponent(id) + "/verify", {
            transactionId: transaction,
          })
        else data = await api("orders/" + encodeURIComponent(id))
        if (!active) return
        setOrder(data.order)
        if (data.order.paymentStatus === "paid") {
          setCart((old) =>
            old.flatMap((line) => {
              const paid = data.order.items.find(
                (p) => cartKey(p) === cartKey(line),
              )
              return !paid
                ? [line]
                : line.quantity > paid.quantity
                  ? [{ ...line, quantity: line.quantity - paid.quantity }]
                  : []
            }),
          )
        }
      } catch (e) {
        if (active) setError(e.message)
      } finally {
        if (active) setBusy(false)
      }
    }
    run()
    return () => {
      active = false
    }
  }, [authLoading, user?.id])

  if (!authLoading && !user)
    return (
      <main className="container standard-page">
        <Empty
          icon={LockKeyhole}
          title={t("Sign in to see your payment status.")}
          action={
            <ActionLink
              href={
                "/login/?next=" +
                encodeURIComponent(location.pathname + location.search)
              }
            >
              {t("Sign in")}
            </ActionLink>
          }
        >
          {t("Your payment is verified by the server before the order is confirmed.")}
        </Empty>
      </main>
    )

  const paid = order?.paymentStatus === "paid"
  const testPayment = order?.paymentMode === "test"

  return (
    <main className="container standard-page">
      <div className="payment-result">
        <span className={"result-icon " + (paid ? "success" : "")}>
          {busy ? (
            <Clock3 size={38} />
          ) : paid ? (
            <CheckCircle2 size={38} />
          ) : (
            <Clock3 size={38} />
          )}
        </span>
        <p className="eyebrow">{id || <BrandWordmark width={142} />}</p>
        <h1>
          {busy
            ? t("Checking your payment…")
            : paid
              ? testPayment
                ? t("Test payment confirmed.")
                : t("Thank you. It’s confirmed.")
              : t("Let’s check your payment.")}
        </h1>
        <p>
          {paid
            ? testPayment
              ? t("Flutterwave verified your test payment. You can follow this order in your account.")
              : t("Your payment has been verified. You can follow the order and see the next steps in your account.")
            : t("Your order is only marked paid after confirmation from Flutterwave. A pending or cancelled payment is not a completed order.")}
        </p>
        {error && <Notice type="error">{error}</Notice>}
        {order && (
          <div className="result-details">
            <span>
              {t("Order")} <b>{order.id}</b>
            </span>
            <span>
              {t("Payment")}{" "}
              <Badge type={paid ? "success" : ""}>
                {testPayment ? "Test · " : ""}
                {statusLabel(order.paymentStatus)}
              </Badge>
            </span>
            <span>
              {t("Total")} <b>{money(order.amount)}</b>
            </span>
          </div>
        )}
        <ActionLink
          href={id ? "/account/orders/" + id + "/" : "/account/orders/"}
        >
          {t("View your order")}
        </ActionLink>
        <a href="/collections/shop/" className="text-link">
          {t("Keep exploring")}
          <ArrowRight size={15} />
        </a>
      </div>
    </main>
  )
}
