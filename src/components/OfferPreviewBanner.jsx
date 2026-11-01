import React from "react"
import { X } from "lucide-react"
import { useStore } from "../store.jsx"

export function OfferPreviewBanner() {
  const { offerPreview, setOfferPreview } = useStore()
  if (!offerPreview) return null
  return (
    <aside className="offer-preview-banner" aria-label="Demo offer review">
      <div className="store-container">
        <strong>DEMO OFFER REVIEW</strong>
        <span>
          Discounts and stock figures are examples. They are not live offers.
        </span>
        <button
          type="button"
          onClick={() => {
            setOfferPreview(false)
            const url = new URL(location.href)
            url.searchParams.delete("preview")
            history.replaceState(
              history.state,
              "",
              url.pathname + url.search + url.hash,
            )
            window.dispatchEvent(new PopStateEvent("popstate"))
          }}
        >
          Exit demo
          <X size={14} />
        </button>
      </div>
    </aside>
  )
}
