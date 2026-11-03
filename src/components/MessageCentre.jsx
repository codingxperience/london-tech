import "../message-centre.css"
import React, { useEffect, useRef, useState } from "react"
import {
  ArrowLeft,
  CheckCheck,
  MessageSquare,
  Plus,
  Search,
  Send,
} from "lucide-react"
import { api } from "../lib/api.js"
import { Button, Empty, Field, Modal, Notice } from "./ui.jsx"

const shortDate = new Intl.DateTimeFormat("en-UG", {
  month: "short",
  day: "numeric",
  timeZone: "Africa/Kampala",
})
const messageTime = new Intl.DateTimeFormat("en-UG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Kampala",
})

function ConversationAvatar({ admin, name }) {
  return (
    <span className="message-avatar" aria-hidden="true">
      {admin ? (
        name.trim().slice(0, 1).toUpperCase()
      ) : (
        <img src="/assets/london-tech-logo.png" alt="" />
      )}
    </span>
  )
}

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
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const [loading, setLoading] = useState(!supplied)
  const messages = useRef(null)
  const inboxSearch = useRef(null)
  const conversationTitle = useRef(null)
  useEffect(() => {
    if (supplied) setThreads(supplied)
    else
      api("messages")
        .then((d) => setThreads(d.threads))
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false))
  }, [supplied])
  const thread = threads.find((t) => t.id === selected)
  const counterpart = (t) =>
    admin ? t.customer_name || "Customer" : "London Tech"
  const term = query.trim().toLowerCase()
  const ownRole = admin ? "admin" : "customer"
  const shown = threads
    .filter((t) => filter === "all" || t.status === filter)
    .filter((t) =>
      [
        t.subject,
        counterpart(t),
        admin ? t.customer_email : "",
        ...t.messages.map((m) => m.body),
      ].some((value) => value?.toLowerCase().includes(term)),
    )
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
  const messageCount = thread?.messages.length

  useEffect(() => {
    if (messages.current)
      messages.current.scrollTop = messages.current.scrollHeight
  }, [selected, messageCount])

  function openThread(id) {
    setSelected(id)
    setError("")
    setReply("")
    window.requestAnimationFrame(() =>
      conversationTitle.current?.focus({ preventScroll: true }),
    )
  }

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
          openThread(created.id)
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
        if (action === "new") openThread(result.thread.id)
        changed?.()
      }
      if (action === "new") {
        setQuery("")
        setFilter("all")
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
      {error && !compose && <Notice type="error">{error}</Notice>}
      <div className={`message-layout${thread ? " has-conversation" : ""}`}>
        <aside className="message-inbox" aria-label="Inbox">
          <div className="message-inbox-head">
            <h2>{admin ? "Customer messages" : "Messages"}</h2>
            <Button
              onClick={() => {
                setError("")
                setCompose(true)
              }}
              aria-label="New message"
              title="New message"
            >
              <Plus size={19} aria-hidden="true" />
            </Button>
          </div>
          <div className="message-toolbar">
            <label className="message-search">
              <Search size={17} aria-hidden="true" />
              <input
                ref={inboxSearch}
                type="search"
                aria-label="Search conversations"
                placeholder="Search conversations"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              aria-label="Filter conversations"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All conversations</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div className="message-list">
            {shown.length ? (
              shown.map((t) => {
                const last = t.messages.at(-1)
                return (
                  <button
                    type="button"
                    key={t.id}
                    className={t.id === selected ? "selected" : ""}
                    aria-current={t.id === selected ? "true" : undefined}
                    disabled={busy}
                    onClick={() => openThread(t.id)}
                  >
                    <ConversationAvatar admin={admin} name={counterpart(t)} />
                    <span className="message-row-copy">
                      <strong>{t.subject}</strong>
                      <span>
                        {counterpart(t)}
                        {t.status === "resolved" && " · Resolved"}
                      </span>
                      {last && (
                        <small>
                          {last.role === ownRole ? "You: " : ""}
                          {last.body}
                        </small>
                      )}
                    </span>
                    <time dateTime={t.updated_at}>
                      {shortDate.format(new Date(t.updated_at))}
                    </time>
                  </button>
                )
              })
            ) : (
              <p className="message-list-empty" role="status">
                {loading
                  ? "Loading conversations…"
                  : term || filter !== "all"
                    ? "No matching conversations."
                    : "No conversations yet."}
              </p>
            )}
          </div>
        </aside>
        <div className="message-conversation">
          {thread ? (
            <>
              <header>
                <button
                  type="button"
                  className="message-back"
                  aria-label="Back to inbox"
                  onClick={() => {
                    setSelected(null)
                    setReply("")
                    window.requestAnimationFrame(() =>
                      inboxSearch.current?.focus({ preventScroll: true }),
                    )
                  }}
                  disabled={busy}
                >
                  <ArrowLeft size={20} aria-hidden="true" />
                </button>
                <ConversationAvatar admin={admin} name={counterpart(thread)} />
                <div className="message-thread-title">
                  <h3 ref={conversationTitle} tabIndex={-1}>
                    {thread.subject}
                  </h3>
                  <p>
                    {counterpart(thread)} ·{" "}
                    {thread.status === "resolved" ? "Resolved" : "Open"}
                  </p>
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
                    {thread.status === "open" && (
                      <CheckCheck size={16} aria-hidden="true" />
                    )}
                    {thread.status === "open" ? "Resolve" : "Reopen"}
                  </Button>
                )}
              </header>
              <div
                className="message-bubbles"
                ref={messages}
                role="log"
                aria-label="Conversation messages"
                tabIndex={0}
              >
                {thread.messages.map((m) => (
                  <article
                    className={m.role === ownRole ? "from-self" : ""}
                    key={m.id}
                  >
                    <strong>
                      {m.role === ownRole
                        ? "You"
                        : m.role === "admin"
                          ? "London Tech"
                          : m.name}
                    </strong>
                    <p>{m.body}</p>
                    <time dateTime={m.at}>
                      {messageTime.format(new Date(m.at))}
                    </time>
                  </article>
                ))}
              </div>
              <form
                className="message-composer"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (reply.trim().length >= 2)
                    update("reply", { body: reply.trim() })
                }}
              >
                <textarea
                  rows={2}
                  required
                  minLength={2}
                  maxLength={4000}
                  aria-label="Your reply"
                  placeholder="Write a reply…"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                />
                <Button
                  busy={busy}
                  disabled={reply.trim().length < 2}
                  type="submit"
                  aria-label="Send reply"
                  title="Send reply"
                >
                  <Send size={18} aria-hidden="true" />
                </Button>
              </form>
            </>
          ) : (
            <Empty
              icon={MessageSquare}
              title="Choose a conversation"
              action={
                <Button
                  onClick={() => {
                    setError("")
                    setCompose(true)
                  }}
                >
                  New message
                </Button>
              }
            >
              Open a conversation from your inbox or start a new one.
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
