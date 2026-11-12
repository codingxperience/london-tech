import React from "react"
import { ArrowUpRight, Camera, Headphones, Tablet } from "lucide-react"
import { useLocale } from "../lib/locale.jsx"

const categoryIcons = { audio: Headphones, tablets: Tablet }

export function ProductPhotoPlaceholder({ category, requestHref = "" }) {
  const { t } = useLocale()
  const Icon = categoryIcons[category] || Camera

  return (
    <div className={`product-photo-placeholder${requestHref ? " product-photo-placeholder-detail" : ""}`}>
      <span className="product-photo-placeholder-icon" aria-hidden="true">
        <Icon strokeWidth={1.5} />
      </span>
      <span>{t("Photo on request")}</span>
      {requestHref && (
        <a
          href={requestHref}
          target={requestHref.startsWith("https://") ? "_blank" : undefined}
          rel="noreferrer"
        >
          {t("Ask the store for a photo")}
          <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      )}
    </div>
  )
}
