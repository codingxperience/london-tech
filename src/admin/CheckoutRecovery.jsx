import React, { useMemo, useState, useEffect } from "react"
import {
  ArrowUpRight,
  Check,
  Mail,
  Phone,
  Search,
  ShoppingBag,
} from "lucide-react"
import { money } from "../data/catalog.js"
import { api, downloadCsv, statusLabel } from "../lib/api.js"
import {
  Badge,
  Button,
  Empty,
  Field,
  Modal,
  Notice,
} from "../components/ui.jsx"

const labels = {
  started: "Checkout started",
  awaiting_payment: "Awaiting payment",
  failed: "Needs attention",
  abandoned: "Not completed",
  order_placed: "Order placed",
  completed: "Completed",
  cancelled: "Cancelled",
}
const attention = ["failed", "abandoned", "cancelled"]
const timestamp = (value) =>
  new Intl.DateTimeFormat("en-UG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kampala",
  }).format(new Date(value))
export function CheckoutRecovery({
  attempts = [],
  changed,
  preview = false,
  search = "",
}) {
  const [filter, setFilter] = useState("attention"),
    [query, setQuery] = useState(search),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("")
  useEffect(() => setQuery(search), [search])
  useEffect(() => setPage(1), [query, filter])
  const shown = useMemo(
    () =>
      attempts.filter(
        (a) =>
          (filter === "all" ||
            (filter === "attention" &&
              attention.includes(a.state) &&
              a.followUpStatus !== "closed") ||
            filter === a.state) &&
          [
            a.customer?.name,
            a.customer?.email,
            a.customer?.phone,
            a.orderId,
            ...(a.items || []).map((i) => i.name),
          ]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [attempts, filter, query],
  )
  const pageCount = Math.max(1, Math.ceil(shown.length / 20)),
    currentPage = Math.min(page, pageCount)
  return (
    <section className="admin-panel checkout-recovery">
      <div className="admin-panel-heading">
        <div>
          <h2>Checkout follow-up</h2>
          <p className="admin-muted">
            Failed payments and unfinished checkouts, with customer contact
            details.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() =>
            downloadCsv("london-tech-checkout-follow-up.csv", [
              [
                "Customer",
                "Email",
                "Phone",
                "Checkout status",
                "Follow-up",
                "Order",
                "Total UGX",
                "Last activity",
              ],
              ...shown.map((a) => [
                a.customer?.name,
                a.customer?.email,
                a.customer?.phone,
                labels[a.state],
                a.followUpStatus,
                a.orderId,
                a.amount,
                timestamp(a.updatedAt),
              ]),
            ])
          }
        >
          Export
        </Button>
      </div>
      <div className="admin-table-toolbar">
        <label className="checkout-search">
          <Search size={17} />
          <input
            aria-label="Search checkout follow-up"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, phone, email or product"
          />
        </label>
        <select
          aria-label="Filter checkout status"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="attention">Needs follow-up</option>
          <option value="all">All checkouts</option>
          {Object.entries(labels).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <span>{shown.length} checkouts</span>
      </div>
      {shown.length ? (
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Items</th>
                <th>Checkout</th>
                <th>Follow-up</th>
                <th>Last activity</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown
                .slice((currentPage - 1) * 20, currentPage * 20)
                .map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.customer?.name}</strong>
                      <small>{a.customer?.phone || a.customer?.email}</small>
                    </td>
                    <td>
                      {a.items?.[0]?.name}
                      {a.items?.length > 1 && (
                        <small>+{a.items.length - 1} more</small>
                      )}
                    </td>
                    <td>
                      <Badge type={a.state === "failed" ? "warning" : ""}>
                        {labels[a.state] || statusLabel(a.state)}
                      </Badge>
                      <small>
                        {a.amount != null
                          ? money(a.amount)
                          : "Delivery not selected"}
                      </small>
                    </td>
                    <td>{statusLabel(a.followUpStatus || "open")}</td>
                    <td>{timestamp(a.updatedAt)}</td>
                    <td>
                      <button
                        className="text-link"
                        onClick={() => {
                          setSelected({ ...a })
                          setError("")
                        }}
                      >
                        View details <ArrowUpRight size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty icon={ShoppingBag} title="No checkouts need follow-up.">
          Checkouts appear here when signed-in customers begin ordering. A
          checkout is labelled not completed after 30 minutes without activity.
        </Empty>
      )}
      {pageCount > 1 && (
        <div className="workspace-pagination">
          <span>
            Page {currentPage} of {pageCount}
          </span>
          <Button
            variant="secondary"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            disabled={currentPage === pageCount}
            onClick={() => setPage(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      )}
      {selected && (
        <Modal
          title="Checkout details"
          wide
          className="admin-editor"
          onClose={() => setSelected(null)}
        >
          {error && <Notice type="error">{error}</Notice>}
          <div className="checkout-contact">
            <div>
              <h3>{selected.customer?.name}</h3>
              <p>{selected.customer?.email}</p>
              {selected.customer?.phone && <p>{selected.customer.phone}</p>}
            </div>
            <div className="checkout-contact-actions">
              {selected.customer?.phone && (
                <a
                  className="button secondary"
                  href={"tel:" + selected.customer.phone.replace(/[^+\d]/g, "")}
                >
                  <Phone size={16} />
                  Call customer
                </a>
              )}
              {selected.customer?.email && (
                <a
                  className="button secondary"
                  href={
                    "mailto:" +
                    selected.customer.email +
                    "?subject=" +
                    encodeURIComponent("Your London Tech checkout")
                  }
                >
                  <Mail size={16} />
                  Email customer
                </a>
              )}
            </div>
          </div>
          <div className="checkout-detail-summary">
            <Badge>{labels[selected.state]}</Badge>
            <strong>{money(selected.amount)}</strong>
          </div>
          {selected.failureMessage && (
            <Notice type="warning">{selected.failureMessage}</Notice>
          )}
          <p className="admin-muted">
            {statusLabel(selected.fulfillment || "collection")}{" "}
            {selected.district && "· " + selected.district} ·{" "}
            {selected.paymentMethod === "cod"
              ? "Cash on receipt"
              : statusLabel(selected.paymentMethod || "payment")}
          </p>
          {(selected.items || []).map((i, n) => (
            <div className="order-detail-item" key={n}>
              {i.image && <img src={i.image} alt="" />}
              <span>
                <strong>{i.name}</strong>
                <small>Quantity {i.quantity}</small>
              </span>
              <b>
                {money(i.unitPrice == null ? null : i.unitPrice * i.quantity)}
              </b>
            </div>
          ))}
          {selected.orderId && (
            <a
              className="text-link"
              href={
                (preview ? "/admin/preview/" : "/admin/") +
                "orders/?q=" +
                encodeURIComponent(selected.orderId)
              }
            >
              Open order {selected.orderId}
              <ArrowUpRight size={16} />
            </a>
          )}
          <form
            className="stack-form"
            onSubmit={async (e) => {
              e.preventDefault()
              setBusy(true)
              setError("")
              try {
                if (!preview)
                  await api("admin/checkouts/" + selected.id, {
                    method: "PATCH",
                    body: {
                      status: selected.followUpStatus,
                      note: selected.note || "",
                    },
                  })
                await changed?.(selected)
                setSelected(null)
              } catch (e) {
                setError(e.message)
              } finally {
                setBusy(false)
              }
            }}
          >
            <Field label="Follow-up status">
              <select
                value={selected.followUpStatus || "open"}
                onChange={(e) =>
                  setSelected({ ...selected, followUpStatus: e.target.value })
                }
              >
                <option value="open">Open</option>
                <option value="contacted">Customer contacted</option>
                <option value="closed">Closed</option>
              </select>
            </Field>
            <Field label="Internal note">
              <textarea
                value={selected.note || ""}
                maxLength={2000}
                rows={3}
                onChange={(e) =>
                  setSelected({ ...selected, note: e.target.value })
                }
              />
            </Field>
            <Button busy={busy} type="submit">
              Save follow-up <Check size={16} />
            </Button>
          </form>
        </Modal>
      )}
    </section>
  )
}
