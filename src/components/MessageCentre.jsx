import "../message-centre.css"
import React, { useEffect, useRef, useState } from "react"
import {
  ArrowLeft,
  CheckCheck,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  Volume2,
  VolumeX,
} from "lucide-react"
import { api } from "../lib/api.js"
import { useLocale } from "../lib/locale.jsx"
import { Button, Empty, Field, Modal, Notice } from "./ui.jsx"

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
  synced,
  alerts,
  workspaceQuery = "",
}) {
  const { t, language } = useLocale()
  const shortDate = new Intl.DateTimeFormat(language === "ar" ? "ar-UG" : "en-UG", {
    month: "short",
    day: "numeric",
    timeZone: "Africa/Kampala",
  })
  const messageTime = new Intl.DateTimeFormat(language === "ar" ? "ar-UG" : "en-UG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kampala",
  })
  const [threads, setThreads] = useState(supplied || []),
    [selected, setSelected] = useState(null)
  const [compose, setCompose] = useState(false),
    [draft, setDraft] = useState({ subject: "", body: "", customerId: "" })
  const [reply, setReply] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const [connection, setConnection] = useState("connecting")
  const refreshInbox = useRef(null)
  const messages = useRef(null)
  const followingLatest = useRef(true)
  const [atLatest, setAtLatest] = useState(true)
  const typing = useRef({
    pending: Promise.resolve(),
    id: null,
    lastSent: 0,
    timer: null,
  })
  const readThrough = useRef(null)
  const inboxSearch = useRef(null)
  const conversationTitle = useRef(null)
  useEffect(() => {
    if (preview) setThreads(supplied || [])
  }, [preview, supplied])
  useEffect(() => {
    if (preview || busy) return
    const controller = new AbortController()
    let timer,
      inFlight = false,
      version = ""
    async function refresh() {
      if (document.hidden || inFlight || controller.signal.aborted) return
      window.clearTimeout(timer)
      inFlight = true
      try {
        const path = admin ? "admin/messages/" : "messages/"
        const result = await api(
          path + (version ? "?version=" + version : ""),
          {
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(12000),
            ]),
            cache: "no-store",
          },
        )
        if (controller.signal.aborted) return
        if (Array.isArray(result.threads)) {
          setThreads(result.threads)
          synced?.(result.threads)
        } else if (!version || result.version !== version) {
          throw new Error("Unexpected inbox response")
        }
        version = result.version || ""
        setConnection("connected")
      } catch (e) {
        if (controller.signal.aborted) return
        if ([401, 403].includes(e.status)) {
          setThreads([])
          setConnection("signed-out")
          return
        }
        setConnection("retrying")
      } finally {
        inFlight = false
      }
      if (!controller.signal.aborted) timer = window.setTimeout(refresh, 3000)
    }
    refreshInbox.current = refresh
    refresh()
    document.addEventListener("visibilitychange", refresh)
    window.addEventListener("focus", refresh)
    window.addEventListener("online", refresh)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
      refreshInbox.current = null
      document.removeEventListener("visibilitychange", refresh)
      window.removeEventListener("focus", refresh)
      window.removeEventListener("online", refresh)
    }
  }, [admin, preview, busy, synced])
  const thread = threads.find((t) => t.id === selected)
  const counterpart = (t) =>
    admin ? t.customer_name || "Customer" : "London Tech"
  const terms = [workspaceQuery, query]
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
  const ownRole = admin ? "admin" : "customer"
  const latestInbound = thread?.messages.findLast(
    (message) => message.role !== ownRole,
  )?.id
  const shown = threads
    .filter((t) => {
      if (filter === "unread") return t.unreadCount > 0
      if (filter === "waiting") return t.queueAhead != null
      return filter === "all" || t.status === filter
    })
    .filter((t) => {
      const fields = [
        t.subject,
        counterpart(t),
        admin ? t.customer_email : "",
        ...t.messages.map((m) => m.body),
      ]
      return terms.every((term) =>
        fields.some((value) => value?.toLowerCase().includes(term)),
      )
    })
    .sort((a, b) =>
      filter === "waiting"
        ? a.queueAhead - b.queueAhead
        : Date.parse(b.updated_at) - Date.parse(a.updated_at),
    )
  const messageCount = thread?.messages.length

  useEffect(() => {
    if (followingLatest.current && messages.current)
      messages.current.scrollTop = messages.current.scrollHeight
  }, [selected, messageCount])

  useEffect(() => {
    if (
      preview ||
      !thread?.id ||
      !latestInbound ||
      !thread.unreadCount ||
      !atLatest
    )
      return
    const id = thread.id
    let active = true
    let retry
    function markViewed() {
      if (
        document.hidden ||
        !document.hasFocus() ||
        readThrough.current === latestInbound
      )
        return
      window.clearTimeout(retry)
      readThrough.current = latestInbound
      api(`messages/${id}/read/`, {
        method: "POST",
        body: { messageId: latestInbound },
        signal: AbortSignal.timeout(10000),
      })
        .then(() => {
          setThreads((current) =>
            current.map((entry) =>
              entry.id === id &&
              entry.messages.findLast((message) => message.role !== ownRole)
                ?.id === latestInbound
                ? { ...entry, unreadCount: 0 }
                : entry,
            ),
          )
          alerts?.refresh()
        })
        .catch((error) => {
          if (readThrough.current === latestInbound) readThrough.current = null
          if (active && (!error.status || error.status >= 500))
            retry = window.setTimeout(markViewed, 3000)
        })
    }
    markViewed()
    window.addEventListener("focus", markViewed)
    document.addEventListener("visibilitychange", markViewed)
    return () => {
      active = false
      window.clearTimeout(retry)
      window.removeEventListener("focus", markViewed)
      document.removeEventListener("visibilitychange", markViewed)
    }
  }, [
    atLatest,
    latestInbound,
    ownRole,
    preview,
    thread?.id,
    thread?.unreadCount,
    alerts?.refresh,
  ])

  function sendTyping(id, active) {
    const state = typing.current
    state.pending = state.pending
      .then(() =>
        api(`messages/${id}/typing/`, {
          method: "POST",
          body: { typing: active },
          signal: AbortSignal.timeout(4000),
          keepalive: !active,
        }),
      )
      .catch(() => {})
  }

  function stopTyping() {
    const state = typing.current
    window.clearTimeout(state.timer)
    if (!state.id) return
    sendTyping(state.id, false)
    state.id = null
    state.lastSent = 0
  }

  function trackTyping(value) {
    if (preview || !selected) return
    if (!value.trim()) return stopTyping()
    const state = typing.current
    const now = Date.now()
    if (state.id !== selected) stopTyping()
    if (now - state.lastSent >= 2500) {
      state.id = selected
      state.lastSent = now
      sendTyping(selected, true)
    }
    window.clearTimeout(state.timer)
    state.timer = window.setTimeout(stopTyping, 3000)
  }

  useEffect(() => {
    const onHide = () => {
      if (document.hidden) stopTyping()
    }
    document.addEventListener("visibilitychange", onHide)
    return () => {
      document.removeEventListener("visibilitychange", onHide)
      stopTyping()
    }
  }, [])

  function openThread(id) {
    stopTyping()
    followingLatest.current = true
    setAtLatest(true)
    setSelected(id)
    setError("")
    setReply("")
    window.requestAnimationFrame(() =>
      conversationTitle.current?.focus({ preventScroll: true }),
    )
  }

  async function update(action, body) {
    if (action === "reply") {
      stopTyping()
      followingLatest.current = true
      setAtLatest(true)
    }
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
      {error && !compose && <Notice type="error">{t(error)}</Notice>}
      <div className={`message-layout${thread ? " has-conversation" : ""}`}>
        <aside className="message-inbox" aria-label={t("Inbox")}>
          <div className="message-inbox-head">
            <div>
              <h2>{t(admin ? "Customer messages" : "Messages")}</h2>
              {preview ? (
                  <a className="message-live-link" href="/admin/messages/">
                  {t("Open live inbox")}
                </a>
              ) : connection !== "connected" ? (
                <span className="message-connection" role="status">
                  {connection === "signed-out"
                    ? t("Sign in to reconnect")
                    : connection === "retrying"
                      ? t("Reconnecting…")
                      : t("Connecting…")}
                </span>
              ) : null}
            </div>
            <div className="message-inbox-actions">
              {!preview && alerts && (
                <button
                  type="button"
                  className="message-refresh"
                  aria-label={t("Message sound")}
                  aria-pressed={alerts.enabled}
                  title={
                    alerts.enabled
                      ? t("Mute message sound")
                      : t("Enable message sound")
                  }
                  onClick={alerts.toggle}
                >
                  {alerts.enabled ? (
                    <Volume2 size={17} aria-hidden="true" />
                  ) : (
                    <VolumeX size={17} aria-hidden="true" />
                  )}
                </button>
              )}
              {!preview && (
                <button
                  type="button"
                  className="message-refresh"
                  aria-label={t("Refresh inbox")}
                  title={t("Refresh inbox")}
                  disabled={busy}
                  onClick={() => refreshInbox.current?.()}
                >
                  <RefreshCw size={16} aria-hidden="true" />
                </button>
              )}
              <Button
                onClick={() => {
                  setError("")
                  setCompose(true)
                }}
                aria-label={t("New message")}
                title={t("New message")}
              >
                <Plus size={19} aria-hidden="true" />
              </Button>
            </div>
          </div>
          <div className="message-toolbar">
            <label className="message-search">
              <Search size={17} aria-hidden="true" />
              <input
                ref={inboxSearch}
                type="search"
                aria-label={t("Search conversations")}
                placeholder={t("Search conversations")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              aria-label={t("Filter conversations")}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">{t("All conversations")}</option>
              {!preview && <option value="unread">{t("Unread")}</option>}
              {admin && !preview && (
                <option value="waiting">{t("Waiting for reply")}</option>
              )}
              <option value="open">{t("Open")}</option>
              <option value="resolved">{t("Resolved")}</option>
            </select>
          </div>
          <div className="message-list">
            {shown.length ? (
              shown.map((entry) => {
                const last = entry.messages.at(-1)
                return (
                  <button
                    type="button"
                    key={entry.id}
                    className={entry.id === selected ? "selected" : ""}
                    aria-current={entry.id === selected ? "true" : undefined}
                    disabled={busy}
                    onClick={() => openThread(entry.id)}
                  >
                    <ConversationAvatar admin={admin} name={counterpart(entry)} />
                    <span className="message-row-copy">
                      <strong>{entry.subject}</strong>
                      <span>
                        {counterpart(entry)}
                        {entry.status === "resolved" && " · " + t("Resolved")}
                        {admin && entry.queueAhead != null && " · " + t("Waiting")}
                      </span>
                      {last && (
                        <small>
                          {last.role === ownRole ? t("You:") + " " : ""}
                          {last.body}
                        </small>
                      )}
                    </span>
                    <span className="message-row-meta">
                      <time dateTime={entry.updated_at}>
                        {shortDate.format(new Date(entry.updated_at))}
                      </time>
                      {entry.unreadCount > 0 && (
                        <span
                          className="message-count"
                          aria-label={t("{count} unread messages", { count: entry.unreadCount })}
                        >
                          {entry.unreadCount > 99 ? "99+" : entry.unreadCount}
                        </span>
                      )}
                    </span>
                  </button>
                )
              })
            ) : (
              <p className="message-list-empty" role="status">
                {!preview && connection === "connecting"
                  ? t("Loading conversations…")
                  : !preview && connection === "signed-out"
                    ? t("Sign in again to open your conversations.")
                    : !preview && connection === "retrying" && !threads.length
                      ? t("Inbox temporarily unavailable. Reconnecting…")
                      : terms.length || filter !== "all"
                        ? t("No matching conversations.")
                        : t("No conversations yet.")}
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
                  aria-label={t("Back to inbox")}
                  onClick={() => {
                    stopTyping()
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
                  <p
                    role="status"
                    className={
                      thread.otherTyping ? "message-typing" : undefined
                    }
                  >
                    {thread.otherTyping
                      ? t("{name} is typing…", { name: counterpart(thread) })
                      : `${counterpart(thread)} · ${
                          t(thread.status === "resolved" ? "Resolved" : "Open")
                        }`}
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
                    {t(thread.status === "open" ? "Resolve" : "Reopen")}
                  </Button>
                )}
              </header>
              {!admin && thread.queueAhead != null && (
                <p className="message-queue" role="status">
                  {thread.queueAhead === 0
                    ? t("You’re next in the support queue.")
                    : t(thread.queueAhead === 1 ? "{count} conversation ahead of you." : "{count} conversations ahead of you.", { count: thread.queueAhead })}
                </p>
              )}
              <div
                className="message-bubbles"
                ref={messages}
                onScroll={(e) => {
                  const { scrollHeight, scrollTop, clientHeight } =
                    e.currentTarget
                  followingLatest.current =
                    scrollHeight - scrollTop - clientHeight < 48
                  setAtLatest(followingLatest.current)
                }}
                role="log"
                aria-label={t("Conversation messages")}
                tabIndex={0}
              >
                {thread.messages.map((m) => (
                  <article
                    className={m.role === ownRole ? "from-self" : ""}
                    key={m.id}
                  >
                    <strong>
                      {m.role === ownRole
                        ? t("You")
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
                  aria-label={t("Your reply")}
                  placeholder={t("Write a reply…")}
                  value={reply}
                  onBlur={stopTyping}
                  onChange={(e) => {
                    setReply(e.target.value)
                    trackTyping(e.target.value)
                  }}
                />
                <Button
                  busy={busy}
                  disabled={reply.trim().length < 2}
                  type="submit"
                  aria-label={t("Send reply")}
                  title={t("Send reply")}
                >
                  <Send size={18} aria-hidden="true" />
                </Button>
              </form>
            </>
          ) : (
            <Empty
              icon={MessageSquare}
              title={t("Choose a conversation")}
              action={
                <Button
                  onClick={() => {
                    setError("")
                    setCompose(true)
                  }}
                >
                  {t("New message")}
                </Button>
              }
            >
              {t("Open a conversation from your inbox or start a new one.")}
            </Empty>
          )}
        </div>
      </div>
      {compose && (
        <Modal title={t("New message")} onClose={() => setCompose(false)}>
          <form
            className="stack-form"
            onSubmit={(e) => {
              e.preventDefault()
              update("new", draft)
            }}
          >
            {admin && (
              <Field label={t("Customer")}>
                <select
                  required
                  value={draft.customerId}
                  onChange={(e) =>
                    setDraft({ ...draft, customerId: e.target.value })
                  }
                >
                  <option value="">{t("Choose a customer")}</option>
                  {customers.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name} · {c.email}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field
              label={t("Subject")}
              required
              minLength={3}
              maxLength={160}
              value={draft.subject}
              onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            />
            <Field label={t("Message")}>
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
              {t("This is an in-app message. No email or SMS is sent.")}
            </p>
            <Button busy={busy} type="submit">
              {t("Send message")} <Send size={16} />
            </Button>
          </form>
        </Modal>
      )}
    </section>
  )
}
