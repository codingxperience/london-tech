import React from "react"
import "../brand-wordmark.css"

/**
 * The supplied logo's own letter artwork, not a typeset approximation.
 * @param {{ inverse?: boolean, stacked?: boolean, decorative?: boolean, width?: number|string, className?: string, style?: import('react').CSSProperties }} props
 */
export function BrandWordmark({
  inverse = false,
  stacked = false,
  decorative = false,
  width,
  className = "",
  style,
}) {
  return (
    <span
      className={`brand-wordmark${stacked ? " is-stacked" : ""} ${className}`}
      style={{
        ...(width == null
          ? {}
          : {
              "--brand-wordmark-width":
                typeof width === "number" ? `${width}px` : width,
            }),
        ...style,
      }}
      aria-hidden={decorative || undefined}
    >
      <img
        src={`/assets/london-tech-wordmark${stacked ? "-stacked" : ""}${
          inverse ? "-inverse" : ""
        }.svg`}
        alt={decorative ? "" : "London Tech"}
        width={stacked ? 408 : 651}
        height={stacked ? 233 : 80}
        decoding="async"
      />
    </span>
  )
}
