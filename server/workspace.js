import { randomUUID } from "node:crypto"
import { z } from "zod"
import {
  audit,
  fail,
  requireAdmin,
  requireUser,
  rateLimit,
} from "./security.js"

const text = (max) => z.string().trim().max(max)
const optionalEmail = z.union([z.email(), z.literal("")]).default("")
const vendorSchema = z.object({
  name: text(140).min(2),
  contact: text(100).default(""),
  email: optionalEmail,
  phone: text(30).default(""),
  address: text(400).default(""),
  notes: text(2000).default(""),
  status: z.enum(["active", "archived"]).default("active"),
})
const pageSchema = z.object({
  title: text(160).min(2),
  slug: text(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  summary: text(300).default(""),
  body: text(20000).min(10),
  status: z.enum(["draft", "published"]).default("draft"),
  footer: z.boolean().default(false),
})
const messageSchema = z.object({
  subject: text(160).min(3),
  body: text(4000).min(2),
})

const threadFields = "id,user_id,subject,status,messages,created_at,updated_at"

async function readInbox(db, userId, version = "", summaryOnly = false) {
  const admin = userId === null
  const reader = admin ? "admin" : "customer"
  const sender = admin ? "customer" : "admin"
  const params = admin ? [] : [userId]
  const versionParam = summaryOnly ? null : params.push(version)
  const { rows } = await db.query(
    `WITH scoped AS (
       SELECT t.* FROM message_threads t ${admin ? "" : "WHERE t.user_id=$1"}
     ), inbound AS (
       SELECT t.id, m.value->>'id' AS message_id, (m.value->>'at')::timestamptz AS sent_at,
              m.position > t.${reader}_read_count AS unread
       FROM scoped t
       CROSS JOIN LATERAL jsonb_array_elements(t.messages) WITH ORDINALITY AS m(value, position)
       WHERE m.value->>'role'='${sender}'
     ), summary AS (
       SELECT (SELECT COUNT(*)::int FROM inbound WHERE unread) AS "unreadTotal",
              latest.message_id AS "latestInboundId",
              latest.sent_at AS "latestInboundAt"
       FROM (SELECT 1) base
       LEFT JOIN LATERAL (
         SELECT message_id, sent_at FROM inbound ORDER BY sent_at DESC, message_id DESC LIMIT 1
       ) latest ON true
     ) ${
       summaryOnly
         ? "SELECT * FROM summary"
         : `, waiting AS (
       SELECT t.id, (
         SELECT MIN((value->>'at')::timestamptz)
         FROM (
           SELECT m.*, MAX(CASE WHEN value->>'role'='admin' THEN position ELSE 0 END) OVER () AS last_reply
           FROM jsonb_array_elements(t.messages) WITH ORDINALITY AS m(value, position)
         ) suffix
         WHERE position > last_reply
       ) AS waiting_since
       FROM message_threads t WHERE t.status='open' AND t.messages->-1->>'role'='customer'
     ), queue AS (
       SELECT id, (ROW_NUMBER() OVER (ORDER BY waiting_since, id) - 1)::int AS ahead FROM waiting
     ), unread AS (
       SELECT id, COUNT(*)::int AS unread_count FROM inbound WHERE unread GROUP BY id
     ), inbox AS (
       SELECT t.id, t.updated_at, COALESCE(u.unread_count,0) AS unread_count,
              COALESCE(t.${sender}_typing_until > statement_timestamp(), false) AS other_typing,
              q.ahead AS queue_ahead
       FROM scoped t LEFT JOIN unread u ON u.id=t.id LEFT JOIN queue q ON q.id=t.id
       ORDER BY t.updated_at DESC, t.id DESC LIMIT ${admin ? 300 : 100}
     ), revision AS (
       SELECT md5(COALESCE(string_agg(
         concat_ws(':',id,updated_at::text,unread_count,other_typing,queue_ahead),
         ',' ORDER BY updated_at DESC,id DESC
       ), '')) AS version
       FROM inbox
     )
     SELECT summary.*, version, CASE WHEN version <> $${versionParam} THEN (
       SELECT COALESCE(jsonb_agg(
         (to_jsonb(t) - '{admin_read_count,customer_read_count,admin_typing_until,customer_typing_until}'::text[])
         || jsonb_build_object('unreadCount',i.unread_count,'otherTyping',i.other_typing,'queueAhead',i.queue_ahead) ${
           admin
             ? "|| jsonb_build_object('customer_name', u.name, 'customer_email', u.email)"
             : ""
         }
         ORDER BY i.updated_at DESC, i.id DESC
       ), '[]'::jsonb)
       FROM inbox i JOIN message_threads t ON t.id=i.id
       ${admin ? "JOIN users u ON u.id=t.user_id" : ""}
     ) END AS threads FROM revision CROSS JOIN summary`
     }`,
    params,
  )
  return rows[0]
}

export async function publishedPages(db) {
  const rows = await db.query(
    "SELECT data FROM content_pages WHERE data->>'status'='published' ORDER BY data->>'title'",
  )
  return rows.rows.map(({ data }) => ({
    title: data.title,
    slug: data.slug,
    footer: data.footer,
    summary: data.summary,
    body: data.body,
    updatedAt: data.updatedAt,
  }))
}

export async function workspaceSummary(db) {
  const [vendors, pages, messages, wishlists] = await Promise.all([
    db.query("SELECT id,data FROM vendors ORDER BY data->>'name'"),
    db.query("SELECT id,data FROM content_pages ORDER BY updated_at DESC"),
    readInbox(db, null),
    db.query(
      "SELECT w.user_id,w.product_ids,u.name,u.email FROM wishlists w JOIN users u ON u.id=w.user_id WHERE jsonb_array_length(w.product_ids)>0",
    ),
  ])
  return {
    vendors: vendors.rows.map(({ id, data }) => ({ ...data, id })),
    pages: pages.rows.map(({ id, data }) => ({ ...data, id })),
    messages: messages.threads,
    messageUnreadTotal: messages.unreadTotal,
    wishlists: wishlists.rows,
  }
}

/** Persisted workspace tools. Every write shares the API's origin and session checks. */
export async function workspaceRoute({ route, method, body, db, user, query }) {
  const page = route.match(/^pages\/([a-z0-9-]+)$/)
  if (page && method === "GET") {
    const row = (
      await db.query(
        "SELECT data FROM content_pages WHERE data->>'slug'=$1 AND data->>'status'='published'",
        [page[1]],
      )
    ).rows[0]
    if (!row) fail(404, "Page was not found.")
    return { body: { page: row.data } }
  }

  if (
    (route === "messages" || route === "admin/messages") &&
    method === "GET"
  ) {
    requireUser(user)
    const admin = route === "admin/messages"
    if (admin) requireAdmin(user)
    const token = query.get("version") || ""
    const version = /^[a-f0-9]{32}$/.test(token) ? token : ""
    return {
      body: await readInbox(
        db,
        admin ? null : user.id,
        version,
        query.get("summary") === "1",
      ),
    }
  }
  if (
    (route === "messages" || route === "admin/messages") &&
    method === "POST"
  ) {
    requireUser(user)
    if (route === "admin/messages") requireAdmin(user)
    await rateLimit(db, "message-create:" + user.id, 20, 60)
    const input = messageSchema.parse(body),
      id = randomUUID()
    const ownerId =
      route === "admin/messages"
        ? z.string().uuid().parse(body.customerId)
        : user.id
    if (
      route === "admin/messages" &&
      !(
        await db.query("SELECT id FROM users WHERE id=$1 AND role='customer'", [
          ownerId,
        ])
      ).rows.length
    )
      fail(404, "Customer was not found.")
    const message = {
      id: randomUUID(),
      body: input.body,
      role: user.role,
      name: user.name,
      at: new Date().toISOString(),
    }
    const row = (
      await db.query(
        `INSERT INTO message_threads(id,user_id,subject,messages) VALUES($1,$2,$3,$4::jsonb) RETURNING ${threadFields}`,
        [id, ownerId, input.subject, JSON.stringify([message])],
      )
    ).rows[0]
    await audit(db, user.id, "message.created", { id })
    return { body: { thread: row }, status: 201 }
  }
  const reply = route.match(/^messages\/([^/]+)\/replies$/)
  if (reply && method === "POST") {
    requireUser(user)
    await rateLimit(db, "message-reply:" + user.id, 60, 60)
    const input = z.object({ body: text(4000).min(2) }).parse(body)
    const thread = await db.transaction(async (tx) => {
      const record = (
        await tx.query("SELECT * FROM message_threads WHERE id=$1 FOR UPDATE", [
          reply[1],
        ])
      ).rows[0]
      if (!record || (record.user_id !== user.id && user.role !== "admin"))
        fail(404, "Conversation was not found.")
      if (record.messages.length >= 100)
        fail(409, "Please start a new conversation for further questions.")
      const message = {
        id: randomUUID(),
        body: input.body,
        role: user.role,
        name: user.name,
        at: new Date().toISOString(),
      }
      return (
        await tx.query(
          `UPDATE message_threads SET messages=messages || $2::jsonb,status='open',updated_at=clock_timestamp(),
            ${
              user.role === "admin"
                ? "admin_typing_until"
                : "customer_typing_until"
            }=NULL
            WHERE id=$1 RETURNING ${threadFields}`,
          [reply[1], JSON.stringify([message])],
        )
      ).rows[0]
    })
    await audit(db, user.id, "message.replied", { id: reply[1] })
    return { body: { thread } }
  }

  const presence = route.match(/^messages\/([^/]+)\/(typing|read)$/)
  if (presence && method === "POST") {
    requireUser(user)
    const [, id, action] = presence
    const admin = user.role === "admin"
    const reader = admin ? "admin" : "customer"
    const sender = admin ? "customer" : "admin"
    if (action === "typing") {
      const { typing } = z.object({ typing: z.boolean() }).parse(body)
      await rateLimit(db, "message-typing:" + user.id, 180, 60)
      const result = await db.query(
        `UPDATE message_threads SET ${reader}_typing_until=
          CASE WHEN $4::boolean THEN clock_timestamp()+INTERVAL '7 seconds' ELSE NULL END
          WHERE id=$1 AND ($2::boolean OR user_id=$3) RETURNING id`,
        [id, admin, user.id, typing],
      )
      if (!result.rows.length) fail(404, "Conversation was not found.")
    } else {
      const { messageId } = z
        .object({ messageId: z.string().uuid() })
        .parse(body)
      await rateLimit(db, "message-read:" + user.id, 180, 60)
      const result = await db.query(
        `WITH viewed AS (
           SELECT t.id,m.position::int AS position
           FROM message_threads t
           CROSS JOIN LATERAL jsonb_array_elements(t.messages) WITH ORDINALITY AS m(value,position)
           WHERE t.id=$1 AND ($2::boolean OR t.user_id=$3)
             AND m.value->>'id'=$4 AND m.value->>'role'='${sender}'
         )
         UPDATE message_threads t SET ${reader}_read_count=GREATEST(t.${reader}_read_count,viewed.position)
         FROM viewed WHERE t.id=viewed.id RETURNING t.id`,
        [id, admin, user.id, messageId],
      )
      if (!result.rows.length) fail(404, "Message was not found.")
    }
    return { body: { ok: true } }
  }

  const resource = route.match(/^admin\/(vendors|pages)(?:\/([^/]+))?$/)
  if (resource) {
    requireAdmin(user)
    const [, kind, id] = resource,
      table = kind === "vendors" ? "vendors" : "content_pages"
    const schema = kind === "vendors" ? vendorSchema : pageSchema
    if (method === "GET") {
      const rows = await db.query(
        `SELECT id,data FROM ${table} ORDER BY updated_at DESC LIMIT 1000`,
      )
      return {
        body: { records: rows.rows.map(({ id, data }) => ({ ...data, id })) },
      }
    }
    if (["POST", "PUT"].includes(method)) {
      if ((method === "PUT") !== !!id) fail(400, "Invalid resource path.")
      const value = schema.parse(body),
        recordId = id || randomUUID()
      const data = {
        ...value,
        id: recordId,
        updatedAt: new Date().toISOString(),
      }
      if (kind === "pages") {
        const duplicate = (
          await db.query(
            "SELECT id FROM content_pages WHERE data->>'slug'=$1 AND id<>$2",
            [value.slug, recordId],
          )
        ).rows[0]
        if (duplicate) fail(409, "Another page already uses that URL.")
      }
      if (id) {
        const changed = await db.query(
          `UPDATE ${table} SET data=$2::jsonb,updated_at=NOW() WHERE id=$1 RETURNING id`,
          [id, JSON.stringify(data)],
        )
        if (!changed.rows.length) fail(404, "Record was not found.")
      } else
        await db.query(`INSERT INTO ${table}(id,data) VALUES($1,$2::jsonb)`, [
          recordId,
          JSON.stringify(data),
        ])
      await audit(db, user.id, kind + (id ? ".updated" : ".created"), {
        id: recordId,
      })
      return { body: { record: data }, status: id ? 200 : 201 }
    }
    if (method === "DELETE" && id) {
      if (
        kind === "vendors" &&
        (
          await db.query(
            "SELECT id FROM products WHERE data->>'vendorId'=$1 LIMIT 1",
            [id],
          )
        ).rows.length
      )
        fail(
          409,
          "This vendor has products. Archive the vendor or reassign those products first.",
        )
      const deleted = await db.query(
        `DELETE FROM ${table} WHERE id=$1 RETURNING id`,
        [id],
      )
      if (!deleted.rows.length) fail(404, "Record was not found.")
      await audit(db, user.id, kind + ".deleted", { id })
      return { body: { ok: true } }
    }
  }
  const status = route.match(/^admin\/messages\/([^/]+)$/)
  if (status && method === "PATCH") {
    requireAdmin(user)
    const input = z.object({ status: z.enum(["open", "resolved"]) }).parse(body)
    const row = (
      await db.query(
        `UPDATE message_threads SET status=$2,updated_at=clock_timestamp() WHERE id=$1 RETURNING ${threadFields}`,
        [status[1], input.status],
      )
    ).rows[0]
    if (!row) fail(404, "Conversation was not found.")
    await audit(db, user.id, "message." + input.status, { id: status[1] })
    return { body: { thread: row } }
  }
  return null
}
