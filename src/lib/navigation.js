export function localReturnPath(value, fallback = "/account/") {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\\\u0000-\u001f]/.test(value) &&
    !/^\/(login|register|forgot-password|reset-password)(?:[/?#]|$)/.test(value)
    ? value
    : fallback
}
