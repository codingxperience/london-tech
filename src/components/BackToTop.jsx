import React, { useEffect, useState } from "react"
import { ArrowUp } from "lucide-react"

export function BackToTop() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const update = () => setVisible(window.scrollY > 500)
    update()
    window.addEventListener("scroll", update, { passive: true })
    return () => window.removeEventListener("scroll", update)
  }, [])
  if (!visible) return null
  return (
    <button
      className="back-to-top"
      type="button"
      aria-label="Back to top"
      title="Back to top"
      onClick={() => {
        const reduced = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches
        window.scrollTo({ top: 0, behavior: reduced ? "instant" : "smooth" })
        const heading = document.querySelector("main h1")
        if (heading) {
          if (!heading.hasAttribute("tabindex")) {
            heading.setAttribute("tabindex", "-1")
            heading.addEventListener(
              "blur",
              () => heading.removeAttribute("tabindex"),
              { once: true },
            )
          }
          heading.focus({ preventScroll: true })
        }
      }}
    >
      <ArrowUp size={21} aria-hidden="true" />
    </button>
  )
}
