export async function api(path, options = {}) {
  const response = await fetch("/api/" + path, {
    ...options,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...options.headers },

    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok)
    throw Object.assign(
      new Error(data.error || "The service is unavailable. Please try again."),
      { status: response.status, fields: data.fields },
    )

  return data
}

export const post = (path, body = {}) => api(path, { method: "POST", body })

export function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

export const dateLabel = (date) =>
  new Intl.DateTimeFormat("en-UG", { dateStyle: "medium" }).format(
    new Date(date),
  )

export const statusLabel = (value) =>
  value === "cash_due"
    ? "Cash due on receipt"
    : value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())

export function downloadCsv(name, rows) {
  const escape = (v) => '"' + String(v ?? "").replaceAll('"', '""') + '"'

  const csv = rows
    .map((r) =>
      r.map((v) => escape(/^[=+\-@]/.test(String(v)) ? "'" + v : v)).join(","),
    )
    .join("\r\n")

  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
  )

  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
