import React, { useState, useEffect } from "react"
import {
  Activity,
  ArrowRight,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Heart,
  LockKeyhole,
  Plus,
  Printer,
  Save,
  Trash2,
  Users,
} from "lucide-react"
import {
  Badge,
  Button,
  Empty,
  Field,
  IconButton,
  Modal,
  Notice,
} from "../components/ui.jsx"
import { MessageCentre } from "../components/MessageCentre.jsx"
import { api, dateLabel, downloadCsv, statusLabel } from "../lib/api.js"
import { money, productPath } from "../data/catalog.js"
import { BrandWordmark } from "../components/BrandWordmark.jsx"
import { SubscriberList } from "./SubscriberList.jsx"

const corePages = new Set([
  "about",
  "delivery",
  "returns",
  "help",
  "privacy",
  "terms",
])
const pageLink = (p) =>
  corePages.has(p.slug) ? `/${p.slug}/` : `/pages/${p.slug}/`

function RecordEditor({ kind, record, save, close }) {
  const [draft, setDraft] = useState(record),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("")
  const field = (key, value) =>
    setDraft((current) => ({ ...current, [key]: value }))
  return (
    <Modal
      title={`${record.id ? "Edit" : "Add"} ${
        kind === "vendors" ? "vendor" : "page"
      }`}
      onClose={close}
      wide
      className="admin-editor"
    >
      <form
        className="stack-form"
        onSubmit={async (e) => {
          e.preventDefault()
          setError("")
          setBusy(true)
          try {
            await save(draft)
            close()
          } catch (e) {
            setError(e.message)
          } finally {
            setBusy(false)
          }
        }}
      >
        {kind === "vendors" ? (
          <>
            <div className="form-grid">
              <Field
                label="Business name"
                required
                minLength={2}
                maxLength={140}
                value={draft.name}
                onChange={(e) => field("name", e.target.value)}
              />
              <Field
                label="Contact person"
                maxLength={100}
                value={draft.contact}
                onChange={(e) => field("contact", e.target.value)}
              />
              <Field
                label="Email"
                type="email"
                value={draft.email}
                onChange={(e) => field("email", e.target.value)}
              />
              <Field
                label="Phone"
                type="tel"
                maxLength={30}
                value={draft.phone}
                onChange={(e) => field("phone", e.target.value)}
              />
              <Field label="Status">
                <select
                  value={draft.status}
                  onChange={(e) => field("status", e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </Field>
            </div>
            <Field label="Business address">
              <textarea
                rows={2}
                maxLength={400}
                value={draft.address}
                onChange={(e) => field("address", e.target.value)}
              />
            </Field>
            <Field label="Internal notes">
              <textarea
                rows={4}
                maxLength={2000}
                value={draft.notes}
                onChange={(e) => field("notes", e.target.value)}
              />
            </Field>
          </>
        ) : (
          <>
            <div className="form-grid">
              <Field
                label="Page title"
                required
                minLength={2}
                maxLength={160}
                value={draft.title}
                onChange={(e) => field("title", e.target.value)}
              />
              <Field
                label="URL slug"
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                maxLength={80}
                hint="Lowercase words separated by hyphens."
                value={draft.slug}
                onChange={(e) => field("slug", e.target.value)}
              />
            </div>
            <Field
              label="Summary"
              maxLength={300}
              value={draft.summary}
              onChange={(e) => field("summary", e.target.value)}
            />
            <Field
              label="Page content"
              hint="Write plain text. Separate paragraphs with a blank line; HTML is never executed."
            >
              <textarea
                required
                rows={12}
                minLength={10}
                maxLength={20000}
                value={draft.body}
                onChange={(e) => field("body", e.target.value)}
              />
            </Field>
            <div className="form-grid">
              <Field label="Publication">
                <select
                  value={draft.status}
                  onChange={(e) => field("status", e.target.value)}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </Field>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={draft.footer}
                  onChange={(e) => field("footer", e.target.checked)}
                />
                Show a link in the storefront footer
              </label>
            </div>
            <p className="admin-muted">
              URL: {pageLink(draft)}. To update an existing information page,
              use its slug: about, delivery, returns, help, privacy or terms.
            </p>
          </>
        )}
        {error && <Notice type="error">{error}</Notice>}
        <div className="workspace-form-actions">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" busy={busy}>
            <Save size={16} />
            Save {kind === "vendors" ? "vendor" : "page"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function Records({ kind, data, query, perform, preview = false }) {
  const [pagePreview, setPagePreview] = useState(null)
  const [editor, setEditor] = useState(null),
    [remove, setRemove] = useState(null),
    [status, setStatus] = useState("all"),
    [error, setError] = useState("")
  const [page, setPage] = useState(1),
    [busy, setBusy] = useState(false)
  const records = (data[kind] || []).filter(
    (p) =>
      (status === "all" || p.status === status) &&
      JSON.stringify(p).toLowerCase().includes(query.toLowerCase()),
  )
  useEffect(() => setPage(1), [query, status])
  const blank =
    kind === "vendors"
      ? {
          name: "",
          contact: "",
          email: "",
          phone: "",
          address: "",
          notes: "",
          status: "active",
        }
      : {
          title: "",
          slug: "",
          summary: "",
          body: "",
          status: "draft",
          footer: false,
        }
  const isVendor = kind === "vendors"
  return (
    <>
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>
              {isVendor ? "Vendors" : "Content pages"}{" "}
              <span className="admin-muted">{records.length}</span>
            </h2>
            <p>
              {isVendor
                ? "Manage the businesses you source from. Supplier assignment is optional; this store sells directly to customers."
                : "Draft, publish and maintain your store’s information pages."}
            </p>
          </div>
          <Button onClick={() => setEditor(blank)}>
            <Plus size={16} />
            Add {isVendor ? "vendor" : "page"}
          </Button>
        </div>
        <div className="workspace-toolbar">
          <label>
            Status{" "}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
            >
              <option value="all">All statuses</option>
              {(isVendor ? ["active", "archived"] : ["draft", "published"]).map(
                (v) => (
                  <option key={v} value={v}>
                    {statusLabel(v)}
                  </option>
                ),
              )}
            </select>
          </label>
          <Button
            variant="secondary"
            onClick={() =>
              downloadCsv(`london-tech-${kind}.csv`, [
                isVendor
                  ? ["Business", "Contact", "Email", "Phone", "Status"]
                  : ["Title", "URL", "Status", "Updated"],
                ...records.map((r) =>
                  isVendor
                    ? [r.name, r.contact, r.email, r.phone, r.status]
                    : [r.title, pageLink(r), r.status, r.updatedAt],
                ),
              ])
            }
          >
            <Download size={15} />
            Export
          </Button>
        </div>
        {error && <Notice type="error">{error}</Notice>}
        {records.length ? (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{isVendor ? "Business" : "Page"}</th>
                  <th>{isVendor ? "Contact" : "URL"}</th>
                  <th>{isVendor ? "Products" : "Updated"}</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.slice((page - 1) * 12, page * 12).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{isVendor ? r.name : r.title}</strong>
                      {isVendor && (
                        <small className="table-subline">
                          {r.email || r.address || "No contact details"}
                        </small>
                      )}
                    </td>
                    <td>
                      {isVendor ? (
                        <>
                          <span>{r.contact || "—"}</span>
                          <small className="table-subline">{r.phone}</small>
                        </>
                      ) : (
                        <a href={pageLink(r)} target="_blank" rel="noreferrer">
                          {pageLink(r)}
                        </a>
                      )}
                    </td>
                    <td>
                      {isVendor
                        ? data.products.filter((p) => p.vendorId === r.id)
                            .length
                        : dateLabel(r.updatedAt)}
                    </td>
                    <td>
                      <Badge
                        type={
                          ["active", "published"].includes(r.status)
                            ? "success"
                            : ""
                        }
                      >
                        {statusLabel(r.status)}
                      </Badge>
                    </td>
                    <td>
                      <div className="workspace-row-actions">
                        <IconButton
                          label={`Edit ${isVendor ? r.name : r.title}`}
                          onClick={() => setEditor(r)}
                        >
                          <Edit3 size={17} />
                        </IconButton>
                        {!isVendor && preview && (
                          <IconButton
                            label="Preview page"
                            onClick={() => setPagePreview(r)}
                          >
                            <ExternalLink size={17} />
                          </IconButton>
                        )}
                        {!isVendor && !preview && r.status === "published" && (
                          <a
                            className="icon-button"
                            aria-label="Open published page"
                            href={pageLink(r)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink size={17} />
                          </a>
                        )}
                        <IconButton
                          label={`Delete ${isVendor ? r.name : r.title}`}
                          onClick={() => setRemove(r)}
                        >
                          <Trash2 size={17} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            icon={isVendor ? Users : FileText}
            title={
              isVendor
                ? "Your vendor directory starts here."
                : "Create your first content page."
            }
          >
            {isVendor
              ? "Add a supplier, then link products from the product editor."
              : "Published pages can appear in the footer. Drafts remain private."}
          </Empty>
        )}
        <div className="workspace-pagination">
          <span>{records.length} records</span>
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span>
            {page} / {Math.max(1, Math.ceil(records.length / 12))}
          </span>
          <Button
            variant="secondary"
            disabled={page * 12 >= records.length}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </section>
      {pagePreview && (
        <Modal
          title={pagePreview.title}
          onClose={() => setPagePreview(null)}
          wide
        >
          <p>{pagePreview.summary}</p>
          <article>
            {pagePreview.body.split(/\n\s*\n/).map((p, i) => (
              <p key={i} style={{ whiteSpace: "pre-line", lineHeight: 1.85 }}>
                {p}
              </p>
            ))}
          </article>
        </Modal>
      )}
      {editor && (
        <RecordEditor
          kind={kind}
          record={editor}
          close={() => setEditor(null)}
          save={(record) => perform(kind, record, record.id ? "PUT" : "POST")}
        />
      )}
      {remove && (
        <Modal
          title={`Delete ${isVendor ? "vendor" : "page"}?`}
          onClose={() => setRemove(null)}
        >
          <p>
            Delete <strong>{remove.name || remove.title}</strong>?{" "}
            {isVendor
              ? "Vendors linked to products must be archived instead."
              : "A published page and its custom footer link will be removed."}
          </p>
          {error && <Notice type="error">{error}</Notice>}
          <div className="workspace-form-actions">
            <Button variant="secondary" onClick={() => setRemove(null)}>
              Keep record
            </Button>
            <Button
              busy={busy}
              onClick={async () => {
                setBusy(true)
                setError("")
                try {
                  await perform(kind, remove, "DELETE")
                  setRemove(null)
                } catch (e) {
                  setError(e.message)
                } finally {
                  setBusy(false)
                }
              }}
            >
              Delete record
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}

function Wishlists({ data, query }) {
  const [selected, setSelected] = useState(null)
  const rows = data.products
    .map((p) => ({
      ...p,
      people: (data.wishlists || []).filter((w) =>
        w.product_ids.includes(p.id),
      ),
    }))
    .filter(
      (p) =>
        p.people.length &&
        [p.name, p.brand, p.sku]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => b.people.length - a.people.length)
  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <h2>Customer wishlists</h2>
          <p>
            Products saved by signed-in customers. Browser-only guest lists stay
            private.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() =>
            downloadCsv("london-tech-wishlists.csv", [
              ["Product", "SKU", "Customers", "Stock"],
              ...rows.map((p) => [p.name, p.sku, p.people.length, p.stock]),
            ])
          }
        >
          <Download size={15} />
          Export
        </Button>
      </div>
      {rows.length ? (
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Saved by</th>
                <th>Stock</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="admin-product-cell">
                      <img src={p.image} alt="" />
                      <div>
                        <strong>{p.name}</strong>
                        <small>{p.sku}</small>
                      </div>
                    </div>
                  </td>
                  <td>{money(p.price)}</td>
                  <td>
                    <button
                      className="admin-text-link"
                      onClick={() => setSelected(p)}
                    >
                      {p.people.length} customers
                    </button>
                  </td>
                  <td>{p.stock ?? "Unconfirmed"}</td>
                  <td>
                    <a href={productPath(p)} target="_blank" rel="noreferrer">
                      View product
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty icon={Heart} title="Saved products will appear here.">
          Wishlist activity appears when customers save products while signed
          in.
        </Empty>
      )}
      {selected && (
        <Modal
          title={`Customers who saved ${selected.name}`}
          onClose={() => setSelected(null)}
        >
          {selected.people.map((p) => (
            <div className="workspace-person" key={p.user_id}>
              <strong>{p.name}</strong>
              <span>{p.email}</span>
            </div>
          ))}
        </Modal>
      )}
    </section>
  )
}

function Invoice({ order, settings, close }) {
  const subtotal = order.items.reduce((n, p) => n + p.quantity * p.unitPrice, 0)
  return (
    <Modal title="Order invoice" onClose={close} wide className="admin-editor">
      <div className="invoice-toolbar">
        <Button onClick={() => window.print()}>
          <Printer size={16} />
          Print / Save PDF
        </Button>
      </div>
      <article className="invoice-document">
        <header>
          <BrandWordmark width={210} />
          <div>
            <h2>INVOICE</h2>
            <strong>{order.id}</strong>
            <p>{dateLabel(order.createdAt)}</p>
          </div>
        </header>
        <div className="invoice-parties">
          <section>
            <h3>From</h3>
            <strong>London Technology Store</strong>
            <p>{settings.address}</p>
            <p>
              {settings.phone} · {settings.phoneAlt}
            </p>
          </section>
          <section>
            <h3>Bill to</h3>
            <strong>{order.customer.name}</strong>
            <p>{order.customer.email}</p>
            <p>{order.customer.phone}</p>
            <p>{order.customer.address || "Store collection"}</p>
          </section>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Unit price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((p, i) => (
              <tr key={i}>
                <td>
                  {p.name}
                  {p.option && <small>{p.option}</small>}
                  {p.color && <small>{p.color}</small>}
                </td>
                <td>{p.quantity}</td>
                <td>{money(p.unitPrice)}</td>
                <td>{money(p.quantity * p.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl>
          <div>
            <dt>Subtotal</dt>
            <dd>{money(subtotal)}</dd>
          </div>
          <div>
            <dt>Delivery / other order charges</dt>
            <dd>{money(Math.max(0, order.amount - subtotal))}</dd>
          </div>
          <div>
            <dt>Total · UGX</dt>
            <dd>{money(order.amount)}</dd>
          </div>
        </dl>
        <footer>
          <strong>Payment verified</strong>
          <p>Payment reference: {order.transactionId || order.id}</p>
          <p>Keep your order reference when contacting London Tech.</p>
        </footer>
      </article>
    </Modal>
  )
}

function Invoices({ data, query }) {
  const [selected, setSelected] = useState(null),
    [page, setPage] = useState(1)
  useEffect(() => setPage(1), [query])
  const rows = data.orders.filter(
    (o) =>
      o.paymentStatus === "paid" &&
      o.paymentMode !== "test" &&
      [o.id, o.customer.name, o.customer.email]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  )
  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <h2>Invoices</h2>
          <p>
            Printable invoices from verified paid orders. Order totals cannot be
            edited here.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() =>
            downloadCsv("london-tech-invoices.csv", [
              ["Invoice / order", "Customer", "Date", "Amount UGX", "Payment"],
              ...rows.map((o) => [
                o.id,
                o.customer.name,
                o.createdAt,
                o.amount,
                o.paymentMethod,
              ]),
            ])
          }
        >
          <Download size={15} />
          Export
        </Button>
      </div>
      {rows.length ? (
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Invoice / order</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.slice((page - 1) * 12, page * 12).map((o) => (
                <tr key={o.id}>
                  <td>
                    <strong>{o.id}</strong>
                  </td>
                  <td>{o.customer.name}</td>
                  <td>{dateLabel(o.createdAt)}</td>
                  <td>{money(o.amount)}</td>
                  <td>
                    <Badge type="success">Paid</Badge>
                  </td>
                  <td>
                    <Button variant="secondary" onClick={() => setSelected(o)}>
                      <FileText size={16} />
                      View invoice
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          icon={FileText}
          title="Invoices appear after a verified payment."
        >
          Unpaid requests and quotations are managed in Orders.
        </Empty>
      )}
      <div className="workspace-pagination">
        <span>{rows.length} invoices</span>
        <Button
          variant="secondary"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </Button>
        <span>{page}</span>
        <Button
          variant="secondary"
          disabled={page * 12 >= rows.length}
          onClick={() => setPage(page + 1)}
        >
          Next
        </Button>
      </div>
      {selected && (
        <Invoice
          order={selected}
          settings={data.settings}
          close={() => setSelected(null)}
        />
      )}
    </section>
  )
}

const historyTime = new Intl.DateTimeFormat("en-UG", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Kampala",
})

const historyDay = new Intl.DateTimeFormat("en-CA", {
  year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Africa/Kampala",
})

function eventValues(details) {
  return Object.entries(details).filter(([key, value]) =>
    !["id", "name", "changes"].includes(key) && value != null && typeof value !== "object",
  )
}

function History({ data, query }) {
  const [action, setAction] = useState("all"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [page, setPage] = useState(1)
  const productNames = new Map(data.products.map((p) => [p.id, p.name]))
  const recordName = (event) => event.details?.name ||
    (event.action.startsWith("product.") && productNames.get(event.details?.id)) ||
    event.details?.id || statusLabel(event.action.split(".")[0])
  const rows = data.events.filter(
    (e) =>
      (action === "all" || e.action.split(".")[0] === action) &&
      (!from || historyDay.format(new Date(e.created_at)) >= from) &&
      (!to || historyDay.format(new Date(e.created_at)) <= to) &&
      (recordName(e) + " " + JSON.stringify(e)).toLowerCase().includes(query.trim().toLowerCase()),
  )
  const totalPages = Math.max(1, Math.ceil(rows.length / 20))
  const currentPage = Math.min(page, totalPages)
  return (
    <section className="admin-panel history-panel">
      <div className="admin-panel-heading">
        <div>
          <h2>History & audit trail</h2>
          <p>
            Review product edits and store activity. Times are shown in Kampala time.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() =>
            downloadCsv("london-tech-history.csv", [
              ["Time", "Action", "Record", "Changed by", "Details"],
              ...rows.map((e) => [
                e.created_at,
                e.action,
                recordName(e),
                e.actor_name,
                JSON.stringify(e.details),
              ]),
            ])
          }
        >
          <Download size={15} />
          Export
        </Button>
      </div>
      <div className="workspace-toolbar">
        <label>
          Action{" "}
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value)
              setPage(1)
            }}
          >
            <option value="all">All actions</option>
            {[...new Set(data.events.map((e) => e.action.split(".")[0]))].map(
              (a) => (
                <option key={a} value={a}>
                  {statusLabel(a)}
                </option>
              ),
            )}
          </select>
        </label>
        <label>
          From{" "}
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value)
              setPage(1)
            }}
          />
        </label>
        <label>
          To{" "}
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => {
              setTo(e.target.value)
              setPage(1)
            }}
          />
        </label>
      </div>
      {rows.length ? (
        <ol className="history-list">
          {rows.slice((currentPage - 1) * 20, currentPage * 20).map((event) => {
            const details = event.details || {}
            const changes = Array.isArray(details.changes) ? details.changes : []
            const values = eventValues(details)
            return (
              <li key={event.id} className="history-event">
                <div className="history-event-header">
                  <span className="history-event-icon"><Activity size={17} aria-hidden="true" /></span>
                  <div className="history-event-title">
                    <span>{statusLabel(event.action.replaceAll(".", " "))}</span>
                    <h3>{recordName(event)}</h3>
                    {details.id && details.id !== recordName(event) && <small>{details.id}</small>}
                  </div>
                  <div className="history-event-time">
                    <time dateTime={event.created_at}>{historyTime.format(new Date(event.created_at))}</time>
                    {event.actor_name && <span>{event.actor_name}</span>}
                  </div>
                </div>
                {changes.length > 0 && (
                  <details className="history-changes" open={currentPage === 1 && event === rows[0] ? true : undefined}>
                    <summary>{changes.length} {changes.length === 1 ? "change" : "changes"}</summary>
                    <dl>
                      {changes.map(({ field, before, after }) => (
                        <div key={field} className="history-change">
                          <dt>{field}</dt>
                          <dd>
                            <span className="history-before"><span className="photo-sr-only">Before </span>{before}</span>
                            <ArrowRight size={14} aria-hidden="true" />
                            <span className="history-after"><span className="photo-sr-only">After </span>{after}</span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
                {values.length > 0 && (
                  <dl className="history-values">
                    {values.map(([key, value]) => (
                      <div key={key}><dt>{statusLabel(key.replace(/([a-z])([A-Z])/g, "$1 $2"))}</dt><dd>{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</dd></div>
                    ))}
                  </dl>
                )}
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="admin-empty-copy">No events match these filters.</p>
      )}
      <div className="workspace-pagination">
        <span>{rows.length} events</span>
        <Button
          variant="secondary"
          disabled={currentPage === 1}
          onClick={() => setPage(currentPage - 1)}
        >
          Previous
        </Button>
        <span>{currentPage} / {totalPages}</span>
        <Button
          variant="secondary"
          disabled={currentPage >= totalPages}
          onClick={() => setPage(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </section>
  )
}

function Regional({ preferences, setPreferences }) {
  const [draft, setDraft] = useState(preferences),
    [saved, setSaved] = useState(false)
  return (
    <section className="admin-panel workspace-preferences">
      <div className="admin-panel-heading">
        <div>
          <h2>Language & regional preferences</h2>
          <p>
            Saved for this browser. Customer prices remain in Ugandan shillings.
          </p>
        </div>
      </div>
      <form
        className="stack-form"
        onSubmit={(e) => {
          e.preventDefault()
          setPreferences(draft)
          setSaved(true)
        }}
      >
        <div className="form-grid">
          <Field label="Interface language">
            <input value="English" readOnly />
          </Field>
          <Field label="Date and number locale">
            <select
              value={draft.locale}
              onChange={(e) => {
                setSaved(false)
                setDraft({ ...draft, locale: e.target.value })
              }}
            >
              <option value="en-UG">English · Uganda</option>
              <option value="ar-EG">Arabic numerals</option>
            </select>
          </Field>
          <Field label="Time zone">
            <select
              value={draft.timeZone}
              onChange={(e) => setDraft({ ...draft, timeZone: e.target.value })}
            >
              <option value="Africa/Kampala">Kampala · East Africa Time</option>
              <option value="UTC">UTC</option>
            </select>
          </Field>
          <Field label="Product / order rows per page">
            <select
              value={draft.pageSize}
              onChange={(e) =>
                setDraft({ ...draft, pageSize: Number(e.target.value) })
              }
            >
              {[12, 24, 48].map((n) => (
                <option key={n} value={n}>
                  {n} rows
                </option>
              ))}
            </select>
          </Field>
          <Field label="Appearance">
            <select
              value={draft.theme}
              onChange={(e) => setDraft({ ...draft, theme: e.target.value })}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </Field>
          <Field label="Currency">
            <input value="UGX · Ugandan shilling" readOnly />
          </Field>
        </div>
        <p className="admin-muted">
          Interface labels use English. Regional settings control the header
          date and chart numbers; product names and customer messages retain
          their original language.
        </p>
        {saved && <Notice type="success">Preferences saved.</Notice>}
        <Button type="submit">
          <Save size={16} />
          Save preferences
        </Button>
      </form>
    </section>
  )
}

function Security({ preview, user }) {
  const [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("")
  return (
    <section className="admin-panel workspace-preferences">
      <div className="admin-panel-heading">
        <div>
          <h2>Login & security</h2>
          <p>{user?.email || "Preview workspace"}</p>
        </div>
        <LockKeyhole size={22} />
      </div>
      <form
        className="stack-form"
        onSubmit={async (e) => {
          e.preventDefault()
          setError("")
          setMessage("")
          if (preview) {
            setMessage(
              "Account credentials are not changed in the preview workspace.",
            )
            return
          }
          if (password !== confirm) {
            setError("The new passwords do not match.")
            return
          }
          setBusy(true)
          try {
            await api("account/password", {
              method: "POST",
              body: { currentPassword: current, password },
            })
            setCurrent("")
            setPassword("")
            setConfirm("")
            setMessage("Your password has been updated.")
          } catch (e) {
            setError(e.message)
          } finally {
            setBusy(false)
          }
        }}
      >
        <Field
          label="Current password"
          type="password"
          autoComplete="current-password"
          required
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <Field
          label="New password"
          hint="Use at least 12 characters."
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Field
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && <Notice type="error">{error}</Notice>}
        {message && <Notice type="success">{message}</Notice>}
        <Button type="submit" busy={busy}>
          Update password
        </Button>
      </form>
    </section>
  )
}

export function WorkspaceSection({
  section,
  data,
  query,
  perform,
  preview,
  changedMessages,
  syncedMessages,
  messageAlerts,
  preferences,
  setPreferences,
  user,
}) {
  if (["vendors", "pages"].includes(section))
    return (
      <Records
        key={section}
        kind={section}
        data={data}
        query={query}
        perform={perform}
        preview={preview}
      />
    )
  if (section === "wishlist") return <Wishlists data={data} query={query} />
  if (section === "invoices") return <Invoices data={data} query={query} />
  if (section === "history") return <History data={data} query={query} />
  if (section === "messages")
    return (
      <MessageCentre
        admin
        threads={preview ? data.messages : undefined}
        workspaceQuery={query}
        customers={data.customers}
        preview={preview}
        changed={changedMessages}
        synced={syncedMessages}
        alerts={messageAlerts}
      />
    )
  if (section === "language")
    return (
      <Regional preferences={preferences} setPreferences={setPreferences} />
    )
  if (section === "security") return <Security user={user} preview={preview} />
  if (section === "subscribers")
    return <SubscriberList preview={preview} query={query} />
  return null
}
