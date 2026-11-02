import React from "react"
import ReactDOM from "react-dom/client"
import App from "./CommerceApp.jsx"
import "./index.css"

let initialData
try {
  initialData = JSON.parse(
    document.getElementById("store-bootstrap")?.textContent || "null",
  )
} catch {}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App initialData={initialData} />
  </React.StrictMode>,
)
