import commerceHandler from "../server/handler.js"

const routeKey = "__lt_route"

function routeError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode })
}

/** Vercel forwards the wildcard as a query value, not a catch-all filename. */
export function apiRequestUrl(req) {
  const url = new URL(req.url || "/api/router", "http://localhost")
  const urlValues = url.searchParams.getAll(routeKey)
  const queryValue = req.query?.[routeKey]
  const queryValues =
    queryValue === undefined
      ? []
      : Array.isArray(queryValue)
        ? queryValue
        : [queryValue]
  if (
    urlValues.length > 1 ||
    queryValues.length > 1 ||
    queryValues.some((value) => typeof value !== "string")
  )
    throw routeError(400, "Invalid API route.")
  if (
    urlValues[0] !== undefined &&
    queryValues[0] !== undefined &&
    urlValues[0] !== queryValues[0]
  )
    throw routeError(400, "Conflicting API route.")
  const captured = urlValues[0] ?? queryValues[0]
  if (captured === undefined || captured === "")
    throw routeError(404, "API route not found.")
  const route = captured.replace(/^\/+|\/+$/g, "")
  if (!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(route))
    throw routeError(400, "Invalid API route.")
  url.searchParams.delete(routeKey)
  // Some runtimes expose rewritten query values only on req.query. Preserve
  // business values there as well, including repeated and empty query values.
  for (const [key, value] of Object.entries(req.query || {})) {
    if (key === routeKey || url.searchParams.has(key)) continue
    for (const item of Array.isArray(value) ? value : [value]) {
      if (typeof item === "string") url.searchParams.append(key, item)
    }
  }
  return `/api/${route}${url.search}`
}

export function createApiRouter(handleRequest = commerceHandler) {
  return async function router(req, res) {
    let routedUrl
    try {
      routedUrl = apiRequestUrl(req)
    } catch (error) {
      res.statusCode = error.statusCode || 400
      res.setHeader("Content-Type", "application/json; charset=utf-8")
      res.setHeader("Cache-Control", "no-store")
      res.end(JSON.stringify({ error: error.message }))
      return
    }
    req.url = routedUrl
    if (req.query && typeof req.query === "object")
      Reflect.deleteProperty(req.query, routeKey)
    // The original IncomingMessage, parsed body, cookies and origin headers
    // reach the existing commerce handler unchanged.
    return handleRequest(req, res)
  }
}

export default createApiRouter()
