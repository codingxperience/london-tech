import React from "react"
import { renderToString } from "react-dom/server"
import CommerceApp from "./CommerceApp.jsx"
export function renderPage(data, requestPath) {
  return renderToString(
    <CommerceApp initialData={data} initialPath={requestPath} />,
  )
}
