import React, { useEffect, useState } from "react"
import { Download, Mail, RotateCcw } from "lucide-react"
import { api, dateLabel, downloadCsv } from "../lib/api.js"
import { Badge, Button, Empty, Notice } from "../components/ui.jsx"

export function SubscriberList({ preview = false, query = "" }) {
  const [records, setRecords] = useState([]),
    [total, setTotal] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("active"),
    [page, setPage] = useState(1)
  async function load() {
    if (preview) return
    setBusy(true)
    setError("")
    try {
      const data = await api("admin/subscribers")
      setRecords(data.subscribers)
      setTotal(data.total)
      setPage(1)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    load()
  }, [preview])
  useEffect(() => setPage(1), [query, status])
  const rows = records.filter(
    (r) =>
      (status === "all" || r.status === status) &&
      r.email.toLowerCase().includes(query.toLowerCase()),
  )
  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <h2>Newsletter subscribers</h2>
          <p>
            Consented email subscriptions. Export active subscribers for your
            email service; messages are not sent from this screen.
          </p>
        </div>
        <div className="workspace-toolbar-actions">
          <Button variant="secondary" busy={busy} onClick={load}>
            <RotateCcw size={15} />
            Refresh
          </Button>
          <Button
            variant="secondary"
            disabled={!rows.length}
            onClick={() =>
              downloadCsv(`london-tech-subscribers-${status}.csv`, [
                [
                  "Email",
                  "Status",
                  "Subscribed at",
                  "Unsubscribed at",
                  "Consent version",
                ],
                ...rows.map((r) => [
                  r.email,
                  r.status,
                  r.subscribedAt,
                  r.unsubscribedAt || "",
                  r.consentVersion,
                ]),
              ])
            }
          >
            <Download size={15} />
            Export filtered list
          </Button>
        </div>
      </div>
      {preview && (
        <div className="workspace-inline-notice">
          <Notice>
            This preview contains no customer email addresses. Real
            subscriptions appear in the connected live workspace.
          </Notice>
        </div>
      )}
      {error && (
        <div className="workspace-inline-notice">
          <Notice type="error">{error}</Notice>
        </div>
      )}
      <div className="workspace-toolbar">
        <span>{total} subscriptions</span>
        <label>
          Status{" "}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All subscriptions</option>
            <option value="active">Active</option>
            <option value="unsubscribed">Unsubscribed</option>
          </select>
        </label>
      </div>
      {busy ? (
        <p className="workspace-inline-notice">Loading subscriptions…</p>
      ) : rows.length ? (
        <>
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Subscribed</th>
                  <th>Unsubscribed</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice((page - 1) * 24, page * 24).map((r) => (
                  <tr key={r.id}>
                    <td>{r.email}</td>
                    <td>
                      <Badge type={r.status === "active" ? "success" : ""}>
                        {r.status === "active" ? "Active" : "Unsubscribed"}
                      </Badge>
                    </td>
                    <td>{dateLabel(r.subscribedAt)}</td>
                    <td>
                      {r.unsubscribedAt ? dateLabel(r.unsubscribedAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="workspace-pagination">
            <span>
              {rows.length} matching subscriptions
              {total > records.length
                ? ` · latest ${records.length} loaded`
                : ""}
            </span>
            <div>
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span>
                {page} / {Math.ceil(rows.length / 24)}
              </span>
              <Button
                variant="secondary"
                disabled={page * 24 >= rows.length}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : (
        <Empty
          icon={Mail}
          title={
            records.length
              ? "No matching subscriptions."
              : "Your audience starts here."
          }
        >
          Subscriptions from the footer appear here after they are saved.
          Unsubscribed addresses stay excluded from the active list.
        </Empty>
      )}
    </section>
  )
}
