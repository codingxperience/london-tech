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
  const { lines, subtotal, updateCart, removeCart, products } = useStore()
  const hasGuide = lines.some((line) => !line.product?.priceConfirmed)
  return (
    <main className="container standard-page">
      <Breadcrumb items={[{ label: "Your cart" }]} />
      <PageHeading eyebrow="A FEW GOOD CHOICES" title="Your cart.">
        {lines.length
          ? "A little closer to your everyday upgrade. Review your choices below."
          : "Good things start with a little exploring."}
      </PageHeading>
      {lines.length ? (
        <div className="cart-layout">
          <div>
            <div className="cart-table-heading">
              <span>Product</span>
              <span>Quantity</span>
              <span>Total</span>
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
                          {p?.name || "Unavailable product"}
                        </a>
                      </h2>
                      <p>
                        {[line.option, line.color]
                          .filter(Boolean)
                          .join(" · ") || "Standard configuration"}
                      </p>
                      <span>
                        {p?.priceConfirmed ? "" : "Guide price · "}
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
                      : "On request"}
                  </strong>
                  <IconButton
                    label={"Remove " + (p?.name || "item")}
                    onClick={() => removeCart(cartKey(line))}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </article>
              )
            })}
            <a href="/collections/shop/" className="text-link cart-continue">
              <ArrowLeft size={15} />
              Keep exploring
            </a>
            {hasGuide && (
              <Notice>
                Guide prices are estimates. The store will confirm the exact
                configuration, price and availability before payment.
              </Notice>
            )}
          </div>
          <aside className="order-summary">
            <p className="eyebrow">THE NEXT STEP</p>
            <h2>Order summary</h2>
            <div className="summary-row">
              <span>Items ({lines.reduce((s, p) => s + p.quantity, 0)})</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <div className="summary-row">
              <span>Delivery</span>
              <span>At checkout</span>
            </div>
            <div className="summary-total">
              <span>{hasGuide ? "Estimated subtotal" : "Subtotal"}</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <p className="small muted">
              Your final total and delivery arrangements are confirmed before
              you pay.
            </p>
            <ActionLink href="/checkout/">Continue to checkout</ActionLink>
            <div className="secure-note">
              <LockKeyhole size={14} />
              Cash on receipt or secure online payment.
            </div>
            <PaymentMarks />
          </aside>
        </div>
      ) : (
        <Empty
          title="A little room for possibility."
          action={
            <ActionLink href="/collections/shop/">Find your next</ActionLink>
          }
        >
          Your cart is empty. Explore the collection and add something that fits
          your life.
        </Empty>
      )}
      <section className="section">
        <SectionHeading
          title="A few more possibilities."
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
          "Review your items, delivery details and payment method before placing the order.",
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
          "This order was cancelled. Start again below to place a new order.",
        )
      if (data.order.paymentMethod !== method)
        throw new Error(
          "This checkout already has an order. Open it below, or cancel it before choosing another payment method.",
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
            ? "Order placed. Pay when it is delivered."
            : "Order placed. Pay when you collect it.",
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
        <p className="loading-line">Getting your checkout ready…</p>
      </main>
    )

  if (!lines.length)
    return (
      <main className="container standard-page">
        <Empty
          title="Let’s find your next first."
          action={
            <ActionLink href="/collections/shop/">Explore products</ActionLink>
          }
        >
          Add a product to your cart to start checkout.
        </Empty>
      </main>
    )

  if (!user)
    return (
      <main className="container standard-page">
        <Breadcrumb
          items={[{ label: "Cart", href: "/cart/" }, { label: "Checkout" }]}
        />
        <Empty
          icon={LockKeyhole}
          title="A familiar place for your orders."
          action={
            <>
              <ActionLink href="/login/?next=/checkout/">
                Sign in to continue
              </ActionLink>
              <a className="text-link" href="/register/?next=/checkout/">
                Create an account
                <ArrowRight size={15} />
              </a>
            </>
          }
        >
          Sign in or create an account to keep your order information and
          payment status together. Your cart is saved.
        </Empty>
      </main>
    )

  const saved =
    addressIndex === "" ? undefined : user.addresses?.[Number(addressIndex)]

  return (
    <main className="container standard-page">
      <Breadcrumb
        items={[{ label: "Cart", href: "/cart/" }, { label: "Checkout" }]}
      />
      <div className="checkout-heading">
        <PageHeading title="Checkout" />
        <span>
          <LockKeyhole size={15} />
          Secure checkout
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
                Open order {pendingOrder.id}
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
                        notify("Checkout reset. You can place a new order.")
                        navigate("/checkout/?retry=" + Date.now())
                      } catch (e) {
                        setError(e.message)
                      } finally {
                        setBusy(false)
                      }
                    }}
                  >
                    Cancel previous order and start again
                  </button>
                )}
            </Notice>
          )}
          {config.paymentMode === "test" && config.payments && (
            <Notice>
              This checkout is in Flutterwave test mode. No live payment will be
              collected.
            </Notice>
          )}
          <section className="form-card">
            <div className="form-section-heading">
              <span>01</span>
              <h2>Your details</h2>
            </div>
            <div className="form-grid">
              <Field
                label="Full name"
                name="name"
                autoComplete="name"
                defaultValue={user.name}
                required
                minLength={2}
                maxLength={100}
              />
              <Field
                label="Email address"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={user.email}
                required
              />
              <Field
                label="Phone number"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="07XX XXX XXX"
                defaultValue={saved?.phone || user.phone}
                key={"phone" + addressIndex}
                required
                minLength={9}
                maxLength={25}
              />
            </div>
            {config.orderEmails && (
              <p className="checkout-contact-note">
                Order updates go to this email.
              </p>
            )}
          </section>
          <section className="form-card">
            <div className="form-section-heading">
              <span>02</span>
              <h2>Delivery or pickup</h2>
            </div>
            <div
              className="fulfillment-choices"
              role="group"
              aria-label="Delivery or pickup"
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
                  <strong>Store pickup</strong>
                  <small>Free</small>
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
                  <strong>Delivery</strong>
                  <small>
                    {fulfillment !== "delivery" || delivery.fee == null
                      ? "By district"
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
                    "Collection details will be confirmed by the store."}
                  {settings.hours && <small>{settings.hours}</small>}
                </p>
              </div>
            ) : (
              <>
                {user.addresses?.length > 0 && (
                  <Field label="Use a saved address">
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
                      <option value="">Enter an address</option>
                      {user.addresses.map((a, i) => (
                        <option value={i} key={i}>
                          {a.label} — {a.district}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                <div className="form-grid">
                  <Field label="Delivery district">
                    <select
                      name="district"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      required
                    >
                      <option value="">Select a district</option>
                      {deliveryDistricts.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label="Street, building and delivery directions"
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
                    Estimated district distance · {delivery.distanceKm} km
                  </p>
                )}
              </>
            )}
          </section>
          <section className="form-card">
            <div className="form-section-heading">
              <span>03</span>
              <h2>Payment method</h2>
            </div>
            <div
              className="payment-options"
              role="group"
              aria-label="Payment method"
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
                    <strong>{title}</strong>
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
                Online payment is currently unavailable.
              </p>
            )}
            {method !== "cod" && (
              <p className="checkout-distance">
                Choose your{" "}
                {method === "visa"
                  ? "card"
                  : method === "mtn"
                    ? "MTN number"
                    : "Airtel number"}{" "}
                on Flutterwave.
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
                  An item is unavailable for checkout. Review your cart before
                  placing the order.
                </Notice>
              )}
          </section>
          <section className="checkout-terms">
            <details>
              <summary>Add an order note</summary>
              <Field label="Order note">
                <textarea
                  name="notes"
                  rows={3}
                  maxLength={1000}
                  placeholder="Optional"
                />
              </Field>
            </details>
          </section>
        </div>
        <aside className="order-summary checkout-summary">
          <h2>Your order</h2>
          <div className="checkout-items">
            {lines.map((line) => (
              <div key={cartKey(line)}>
                <img src={line.product?.image} alt="" />
                <span>
                  <strong>{line.product?.name || "Unavailable product"}</strong>
                  <small>
                    {[line.option, line.color].filter(Boolean).join(" · ")} ×{" "}
                    {line.quantity}
                  </small>
                </span>
                <b>
                  {line.product?.price != null
                    ? money(line.product.price * line.quantity)
                    : "On request"}
                </b>
              </div>
            ))}
          </div>
          <div className="summary-row">
            <span>Subtotal</span>
            <strong>{money(subtotal)}</strong>
          </div>
          <div className="summary-row">
            <span>
              {fulfillment === "delivery" ? "Delivery" : "Collection"}
            </span>
            <span>
              {deliveryFee == null ? "To be confirmed" : money(deliveryFee)}
            </span>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <strong>{money(total)}</strong>
          </div>
          <label className="checkbox-label terms-check">
            <input type="checkbox" required />
            <span>
              I agree to the <a href="/terms/">terms</a> and have read the{" "}
              <a href="/privacy/">privacy information</a>.
            </span>
          </label>
          <Button type="submit" busy={busy} disabled={!payable}>
            {method === "cod" ? "Place order" : "Continue to payment"}
            <ArrowRight size={17} />
          </Button>
          <p className="small muted">
            {method === "cod"
              ? fulfillment === "delivery"
                ? "Pay on delivery."
                : "Pay at pickup."
              : "Secure payment through Flutterwave."}
          </p>
          <a href="/cart/" className="text-link">
            <ArrowLeft size={14} />
            Back to cart
          </a>
        </aside>
      </form>
    </main>
  )
}

export function PaymentResult() {
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
          title="Sign in to see your payment status."
          action={
            <ActionLink
              href={
                "/login/?next=" +
                encodeURIComponent(location.pathname + location.search)
              }
            >
              Sign in
            </ActionLink>
          }
        >
          Your payment is verified by the server before the order is confirmed.
        </Empty>
      </main>
    )

  const paid = order?.paymentStatus === "paid"

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
            ? "Checking your payment…"
            : paid
              ? "Thank you. It’s confirmed."
              : "Let’s check your payment."}
        </h1>
        <p>
          {paid
            ? "Your payment has been verified. You can follow the order and see the next steps in your account."
            : "Your order is only marked paid after confirmation from Flutterwave. A pending or cancelled payment is not a completed order."}
        </p>
        {error && <Notice type="error">{error}</Notice>}
        {order && (
          <div className="result-details">
            <span>
              Order <b>{order.id}</b>
            </span>
            <span>
              Payment{" "}
              <Badge type={paid ? "success" : ""}>
                {statusLabel(order.paymentStatus)}
              </Badge>
            </span>
            <span>
              Total <b>{money(order.amount)}</b>
            </span>
          </div>
        )}
        <ActionLink
          href={id ? "/account/orders/" + id + "/" : "/account/orders/"}
        >
          View your order
        </ActionLink>
        <a href="/collections/shop/" className="text-link">
          Keep exploring
          <ArrowRight size={15} />
        </a>
      </div>
    </main>
  )
}
