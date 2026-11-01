import "../message-centre.css"
import React, { useEffect, useState } from "react"
import { CheckCheck, MessageSquare, Plus, Send } from "lucide-react"
import { api } from "../lib/api.js"
import { Button, Empty, Field, Modal, Notice } from "./ui.jsx"

export function MessageCentre({
  threads: supplied,
  customers = [],
  admin = false,
  preview = false,
  changed,
}) {
  const [threads, setThreads] = useState(supplied || []),
    [selected, setSelected] = useState(null)
  const [compose, setCompose] = useState(false),
    [draft, setDraft] = useState({ subject: "", body: "", customerId: "" })
  const [reply, setReply] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("")
  useEffect(() => {
    if (supplied) setThreads(supplied)
    else
      api("messages")
        .then((d) => setThreads(d.threads))
        .catch((e) => setError(e.message))
  }, [supplied])
  const thread = threads.find((t) => t.id === selected)
  async function update(action, body) {
    setBusy(true)
    setError("")
    try {
      if (preview) {
        const now = new Date().toISOString()
        const message = {
          id: crypto.randomUUID(),
          role: "admin",
          name: "Store administrator",
          body: body.body,
          at: now,
        }
        let next
        if (action === "new") {
          const customer = customers.find((c) => c.id === body.customerId)
          const created = {
            id: crypto.randomUUID(),
            user_id: body.customerId,
            subject: body.subject,
            status: "open",
            messages: [message],
            updated_at: now,
            customer_name: customer?.name || "Preview customer",
            customer_email: customer?.email || "",
          }
          next = [created, ...threads]
          setSelected(created.id)
        } else
          next = threads.map((t) =>
            t.id === selected
              ? {
                  ...t,
                  status: action === "status" ? body.status : "open",
                  messages:
                    action === "reply" ? [...t.messages, message] : t.messages,
                  updated_at: now,
                }
              : t,
          )
        setThreads(next)
        changed?.(next)
      } else {
        const path =
          action === "new"
            ? admin
              ? "admin/messages"
              : "messages"
            : action === "reply"
              ? `messages/${selected}/replies`
              : `admin/messages/${selected}`
        const result = await api(path, {
          method: action === "status" ? "PATCH" : "POST",
          body,
        })
        setThreads((current) =>
          action === "new"
            ? [result.thread, ...current]
            : current.map((t) =>
                t.id === selected ? { ...t, ...result.thread } : t,
              ),
        )
        if (action === "new") setSelected(result.thread.id)
        changed?.()
      }
      setCompose(false)
      setDraft({ subject: "", body: "", customerId: "" })
      setReply("")
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="admin-panel message-centre">
      <div className="admin-panel-heading">
        <div>
          <h2>{admin ? "Customer messages" : "Messages"}</h2>
          <p>Private conversations with London Tech. Replies appear here.</p>
        </div>
        <Button onClick={() => setCompose(true)}>
          <Plus size={16} /> New message
        </Button>
      </div>
      {error && <Notice type="error">{error}</Notice>}
      <div className="message-layout">
        <aside className="message-list" aria-label="Conversations">
          {threads.length ? (
            threads.map((t) => (
              <button
                key={t.id}
                className={t.id === selected ? "selected" : ""}
                onClick={() => {
                  setSelected(t.id)
                  setError("")
                  setReply("")
                }}
              >
                <strong>{t.subject}</strong>
                <span>
                  {admin ? t.customer_name || "Customer" : "London Tech"}
                </span>
                <small>
                  {t.status === "resolved" ? "Resolved" : "Open"} ·{" "}
                  {new Date(t.updated_at).toLocaleDateString("en-UG")}
                </small>
              </button>
            ))
          ) : (
            <p className="admin-empty-copy">No conversations yet.</p>
          )}
        </aside>
        <div className="message-conversation">
          {thread ? (
            <>
              <header>
                <div>
                  <h3>{thread.subject}</h3>
                  <p>{admin ? thread.customer_email : "London Tech support"}</p>
                </div>
                {admin && (
                  <Button
                    variant="secondary"
                    busy={busy}
                    onClick={() =>
                      update("status", {
                        status: thread.status === "open" ? "resolved" : "open",
                      })
                    }
                  >
                    <CheckCheck size={16} />
                    {thread.status === "open" ? "Resolve" : "Reopen"}
                  </Button>
                )}
              </header>
              <div className="message-bubbles">
                {thread.messages.map((m) => (
                  <article
                    className={
                      m.role === "admin" ? "from-store" : "from-customer"
                    }
                    key={m.id}
                  >
                    <strong>
                      {m.role === "admin" ? "London Tech" : m.name}
                    </strong>
                    <p>{m.body}</p>
                    <time>
                      {new Date(m.at).toLocaleString("en-UG", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                  </article>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  update("reply", { body: reply })
                }}
              >
                <Field label="Your reply">
                  <textarea
                    rows={3}
                    required
                    minLength={2}
                    maxLength={4000}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                </Field>
                <Button busy={busy} type="submit">
                  <Send size={16} /> Send reply
                </Button>
              </form>
            </>
          ) : (
            <Empty icon={MessageSquare} title="Your conversations, together.">
              Choose a conversation or start a new one.
            </Empty>
          )}
        </div>
      </div>
      {compose && (
        <Modal title="New message" onClose={() => setCompose(false)}>
          <form
            className="stack-form"
            onSubmit={(e) => {
              e.preventDefault()
              update("new", draft)
            }}
          >
            {admin && (
              <Field label="Customer">
                <select
                  required
                  value={draft.customerId}
                  onChange={(e) =>
                    setDraft({ ...draft, customerId: e.target.value })
                  }
                >
                  <option value="">Choose a customer</option>
                  {customers.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name} · {c.email}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field
              label="Subject"
              required
              minLength={3}
              maxLength={160}
              value={draft.subject}
              onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            />
            <Field label="Message">
              <textarea
                required
                rows={6}
                minLength={2}
                maxLength={4000}
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              />
            </Field>
            {error && <Notice type="error">{error}</Notice>}
            <p className="admin-muted">
              This is an in-app message. No email or SMS is sent.
            </p>
            <Button busy={busy} type="submit">
              Send message <Send size={16} />
            </Button>
          </form>
        </Modal>
      )}
    </section>
  )
}
