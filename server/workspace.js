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

async function readInbox(db, userId, version = "") {
  const admin = userId === null
  const { rows } = await db.query(
    `WITH inbox AS (
       SELECT id, updated_at FROM message_threads
       ${admin ? "" : "WHERE user_id=$2"}
       ORDER BY updated_at DESC, id DESC LIMIT ${admin ? 300 : 100}
     ), revision AS (
       SELECT md5(COALESCE(string_agg(id || ':' || updated_at::text, ',' ORDER BY updated_at DESC, id DESC), '')) AS version
       FROM inbox
     )
     SELECT version, CASE WHEN version <> $1 THEN (
       SELECT COALESCE(jsonb_agg(
         to_jsonb(t) ${
           admin
             ? "|| jsonb_build_object('customer_name', u.name, 'customer_email', u.email)"
             : ""
         }
         ORDER BY i.updated_at DESC, i.id DESC
       ), '[]'::jsonb)
       FROM inbox i JOIN message_threads t ON t.id=i.id
       ${admin ? "JOIN users u ON u.id=t.user_id" : ""}
     ) END AS threads FROM revision`,
    admin ? [version] : [version, userId],
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
    return { body: await readInbox(db, admin ? null : user.id, version) }
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
        "INSERT INTO message_threads(id,user_id,subject,messages) VALUES($1,$2,$3,$4::jsonb) RETURNING *",
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
          "UPDATE message_threads SET messages=messages || $2::jsonb,status='open',updated_at=clock_timestamp() WHERE id=$1 RETURNING *",
          [reply[1], JSON.stringify([message])],
        )
      ).rows[0]
    })
    await audit(db, user.id, "message.replied", { id: reply[1] })
    return { body: { thread } }
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
        "UPDATE message_threads SET status=$2,updated_at=clock_timestamp() WHERE id=$1 RETURNING *",
        [status[1], input.status],
      )
    ).rows[0]
    if (!row) fail(404, "Conversation was not found.")
    await audit(db, user.id, "message." + input.status, { id: status[1] })
    return { body: { thread: row } }
  }
  return null
}
