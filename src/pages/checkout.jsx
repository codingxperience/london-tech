import { PaymentLogo } from "../components/PaymentLogo.jsx"
import React, { useEffect, useState } from "react"

import {
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  MapPin,
  Phone,
  ShieldCheck,
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
              Your payment details stay with Flutterwave.
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
  const { lines, cart, subtotal, user, authLoading, settings, config, notify } =
    useStore()
  const [method, setMethod] = useState("mtn"),
    [fulfillment, setFulfillment] = useState("collection"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [addressIndex, setAddressIndex] = useState("")

  const payable =
    lines.length > 0 &&
    lines.every(
      (l) =>
        l.product?.priceConfirmed &&
        l.product?.price > 0 &&
        l.product?.stock >= l.quantity,
    ) &&
    config.payments &&
    (fulfillment === "collection"
      ? !!settings.address
      : settings.deliveryFee != null)

  const deliveryFee = fulfillment === "collection" ? 0 : settings.deliveryFee
  const total =
    subtotal == null || deliveryFee == null ? null : subtotal + deliveryFee

  const submit = async (e) => {
    e.preventDefault()
    setError("")
    setBusy(true)
    const fd = new FormData(e.currentTarget)
    try {
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
        key: checkoutKey(cart),
        enquiry: !payable,
      })
      if (!payable) {
        writeStorage("lt.checkout-key", null)
        navigate("/account/orders/" + data.order.id + "/")
        notify("Your confirmation request has been sent to the store.")
        return
      }
      const payment = await post("orders/" + data.order.id + "/pay")
      location.assign(payment.url)
    } catch (err) {
      setError(err.message)
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

  const saved = user.addresses?.[Number(addressIndex)]

  return (
    <main className="container standard-page">
      <Breadcrumb
        items={[{ label: "Cart", href: "/cart/" }, { label: "Checkout" }]}
      />
      <div className="checkout-heading">
        <PageHeading
          eyebrow="YOUR NEXT, A LITTLE CLOSER"
          title="Let’s make it yours."
        />
        <span>
          <LockKeyhole size={15} />
          Secure checkout
        </span>
      </div>
      <div className="checkout-steps">
        <a href="/cart/">
          <Check size={14} />
          Cart
        </a>
        <span className="active">
          02 <b>Your details</b>
        </span>
        <span>
          03 <b>Payment</b>
        </span>
      </div>
      <form onSubmit={submit} className="checkout-layout">
        <div className="checkout-form">
          {error && <Notice type="error">{error}</Notice>}
          {config.paymentMode === "test" && (
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
          </section>
          <section className="form-card">
            <div className="form-section-heading">
              <span>02</span>
              <h2>How would you like to receive it?</h2>
            </div>
            <div className="fulfillment-choices">
              <label className={fulfillment === "collection" ? "selected" : ""}>
                <input
                  type="radio"
                  name="fulfillment"
                  checked={fulfillment === "collection"}
                  onChange={() => setFulfillment("collection")}
                />
                <MapPin size={20} />
                <span>
                  <strong>Store collection</strong>
                  <small>Arrange pickup with the store</small>
                </span>
              </label>
              <label className={fulfillment === "delivery" ? "selected" : ""}>
                <input
                  type="radio"
                  name="fulfillment"
                  checked={fulfillment === "delivery"}
                  onChange={() => setFulfillment("delivery")}
                />
                <Truck size={20} />
                <span>
                  <strong>Delivery</strong>
                  <small>
                    {settings.deliveryFee == null
                      ? "Delivery fee confirmed by the store"
                      : money(settings.deliveryFee)}
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
                      onChange={(e) => setAddressIndex(e.target.value)}
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
                  <Field
                    label="District / city"
                    name="district"
                    placeholder="e.g. Kampala"
                    defaultValue={saved?.district || ""}
                    key={"district" + addressIndex}
                    required
                    maxLength={100}
                  />
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
              </>
            )}
          </section>
          <section className="form-card">
            <div className="form-section-heading">
              <span>03</span>
              <h2>Payment method</h2>
            </div>
            <div className="payment-options">
              {[
                [
                  "mtn",
                  "MTN Mobile Money",
                  "Approve the payment on your MTN mobile number.",
                ],
                [
                  "airtel",
                  "Airtel Money",
                  "Approve the payment on your Airtel mobile number.",
                ],
                [
                  "visa",
                  "Visa / card",
                  "Enter card details securely on Flutterwave.",
                ],
              ].map(([id, title, desc]) => (
                <label key={id} className={method === id ? "selected" : ""}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={method === id}
                    onChange={() => setMethod(id)}
                  />
                  <PaymentLogo method={id} decorative />
                  <span>
                    <strong>{title}</strong>
                    <small>{desc}</small>
                  </span>
                  {method === id && <CheckCircle2 size={18} />}
                </label>
              ))}
            </div>
            <p className="secure-note">
              <ShieldCheck size={15} />
              Payment is completed on Flutterwave. We never ask for your card
              PIN or mobile money PIN.
            </p>
            {!payable && (
              <Notice>
                We’ll first confirm the price, stock and fulfillment details.
                This step sends a request to the store and does not collect a
                payment.
              </Notice>
            )}
          </section>
          <section className="form-card">
            <Field label="Anything we should know? (optional)">
              <textarea
                name="notes"
                rows={3}
                maxLength={1000}
                placeholder="A preferred colour, configuration or question for the store…"
              />
            </Field>
            <label className="checkbox-label terms-check">
              <input type="checkbox" required />
              <span>
                I have reviewed the <a href="/terms/">terms</a> and{" "}
                <a href="/privacy/">privacy information</a>.
              </span>
            </label>
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
            <span>Estimated subtotal</span>
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
            <span>{payable ? "Total" : "Estimated total"}</span>
            <strong>{money(total)}</strong>
          </div>
          <Button
            type="submit"
            busy={busy}
            disabled={lines.some((line) => !line.product)}
          >
            {payable
              ? "Continue to secure payment"
              : "Request price & availability"}
            <ArrowRight size={17} />
          </Button>
          <p className="small muted">
            {payable
              ? "You’ll be redirected to Flutterwave to complete your payment."
              : "The store will contact you before payment. Guide prices are subject to confirmation."}
          </p>
          <PaymentMarks />
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
        <p className="eyebrow">{id || "LONDON TECH"}</p>
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
