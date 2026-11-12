import React, { useEffect, useRef, useState } from "react"
import { ChevronRight } from "lucide-react"
import { useLocale } from "../lib/locale.jsx"

export function DiscoveryRail({ id, labelledBy, resetKey, children }) {
  const { t } = useLocale()
  const rail = useRef(null)
  const [canAdvance, setCanAdvance] = useState(false)
  const count = React.Children.count(children)
  useEffect(() => {
    const element = rail.current
    if (!element) return
    element.scrollLeft = 0
    const measure = () => {
      const rtl = getComputedStyle(element).direction === "rtl"
      const items = [...element.children]
      const edge = items.at(-1)?.getBoundingClientRect()
      const bounds = element.getBoundingClientRect()
      setCanAdvance(
        rtl ? Boolean(edge && edge.left < bounds.left - 2) : Boolean(edge && edge.right > bounds.right + 2),
      )
    }
    measure()
    const observer =
      typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null
    observer?.observe(element)
    window.addEventListener("resize", measure)
    element.addEventListener("scroll", measure, { passive: true })
    return () => {
      observer?.disconnect()
      window.removeEventListener("resize", measure)
      element.removeEventListener("scroll", measure)
    }
  }, [resetKey, count])
  const move = (direction = 1) => {
    const element = rail.current
    if (!element) return
    const rtl = getComputedStyle(element).direction === "rtl"
    element.scrollBy({
      left: direction * (rtl ? -1 : 1) * Math.max(150, element.clientWidth * 0.8),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    })
  }
  return (
    <div className="discovery-window">
      <div
        className="discovery-rail"
        id={id}
        ref={rail}
        role="tabpanel"
        aria-labelledby={labelledBy}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault()
            move(event.key === "ArrowRight" ? 1 : -1)
          }
          if (event.key === "Home" || event.key === "End") {
            event.preventDefault()
            event.currentTarget.scrollLeft =
              event.key === "Home" ? 0 : event.currentTarget.scrollWidth
          }
        }}
      >
        {children}
      </div>
      <button
        type="button"
        className="discovery-next"
        aria-label={t("See more categories or brands")}
        disabled={!canAdvance}
        aria-controls={id}
        onClick={() => move()}
      >
        <ChevronRight size={34} strokeWidth={2.2} />
      </button>
    </div>
  )
}
