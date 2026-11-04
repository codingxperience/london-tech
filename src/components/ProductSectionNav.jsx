import { useLocale } from "../lib/locale.jsx"
import React, { useEffect, useId, useRef, useState } from "react"

const sections = [
  ["overview", "Overview"],
  ["specifications", "Specifications"],
  ["reviews", "Reviews"],
  ["description", "Description"],
  ["guides", "Guides"],
  ["delivery", "Delivery & returns"],
  ["questions", "Questions"],
  ["store", "Our store"],
]
const hashSection = () => {
  const id = window.location.hash.replace(/^#product-/, "")
  return sections.some(([section]) => section === id) ? id : "overview"
}

export function ProductSectionNav({ productId, reviewCount = 0 }) {
  const { t, formatNumber } = useLocale()
  const [active, setActive] = useState("overview")
  const selectId = useId()
  const nav = useRef(null)
  const rail = useRef(null)
  const pending = useRef(null)
  const timer = useRef(null)
  const update = useRef(() => {})

  const reveal = (link) => {
    const element = rail.current
    if (!element || !link) return
    const bounds = element.getBoundingClientRect()
    const target = link.getBoundingClientRect()
    const inset = 12
    const left =
      target.left < bounds.left + inset
        ? target.left - bounds.left - inset
        : target.right > bounds.right - inset
          ? target.right - bounds.right + inset
          : 0
    if (left) element.scrollBy({ left, behavior: "auto" })
  }

  useEffect(() => {
    const element = nav.current
    const page = element?.closest(".product-page") || element?.parentElement
    const previousOffset = page?.style.getPropertyValue(
      "--product-section-offset",
    )
    const alignmentLine = () => {
      const height = element?.getBoundingClientRect().height || 56
      const offset = `${height + 20}px`
      if (page?.style.getPropertyValue("--product-section-offset") !== offset)
        page?.style.setProperty("--product-section-offset", offset)
      return height + 24
    }
    const targets = sections
      .map(([id]) => ({ id, element: page?.querySelector(`#product-${id}`) }))
      .filter((target) => target.element)
    let frame = null
    let mounted = true
    const release = () => {
      pending.current = null
      window.clearTimeout(timer.current)
    }
    const measure = () => {
      frame = null
      if (!mounted || !targets.length) return
      // Matches the section scroll margin while the bar is pinned to the top.
      const line = alignmentLine()
      const intended =
        pending.current && targets.find(({ id }) => id === pending.current)
      if (
        intended &&
        Math.abs(intended.element.getBoundingClientRect().top - line) > 40
      )
        return
      release()
      let current = targets[0].id
      for (const target of targets) {
        if (target.element.getBoundingClientRect().top <= line)
          current = target.id
      }
      const pageHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
      )
      if (
        pageHeight > window.innerHeight &&
        window.scrollY + window.innerHeight >= pageHeight - 2
      )
        current = targets.at(-1).id
      setActive(current)
    }
    const queue = () => {
      if (mounted && frame == null)
        frame = window.requestAnimationFrame(measure)
    }
    const resize = () => {
      queue()
      reveal(rail.current?.querySelector('a[aria-current="location"]'))
    }
    update.current = queue
    const readHash = () => {
      release()
      const selected = hashSection()
      setActive(selected)
      pending.current = selected
      timer.current = window.setTimeout(() => {
        release()
        queue()
      }, 1200)
      queue()
    }
    const interrupt = () => {
      release()
      queue()
    }
    const key = (event) => {
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "PageUp",
          "PageDown",
          "Home",
          "End",
          " ",
        ].includes(event.key) &&
        !event.defaultPrevented
      )
        interrupt()
    }
    window.addEventListener("scroll", queue, { passive: true })
    window.addEventListener("resize", resize)
    window.addEventListener("hashchange", readHash)
    window.addEventListener("wheel", interrupt, { passive: true })
    window.addEventListener("touchstart", interrupt, { passive: true })
    window.addEventListener("keydown", key)
    const observer =
      typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null
    if (element) observer?.observe(element)
    targets.forEach(({ element: target }) => observer?.observe(target))
    setActive(hashSection())
    alignmentLine()
    if (window.location.hash.startsWith("#product-")) {
      const target = targets.find(({ id }) => id === hashSection())
      target?.element.scrollIntoView({ block: "start", behavior: "instant" })
    }
    queue()
    return () => {
      mounted = false
      release()
      if (frame != null) window.cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener("scroll", queue)
      window.removeEventListener("resize", resize)
      window.removeEventListener("hashchange", readHash)
      window.removeEventListener("wheel", interrupt)
      window.removeEventListener("touchstart", interrupt)
      window.removeEventListener("keydown", key)
      update.current = () => {}
      if (previousOffset)
        page?.style.setProperty("--product-section-offset", previousOffset)
      else page?.style.removeProperty("--product-section-offset")
    }
  }, [productId])

  useEffect(() => {
    reveal(rail.current?.querySelector(`[href="#product-${active}"]`))
  }, [active, reviewCount, t])

  return (
    <nav
      className="detail-section-nav"
      ref={nav}
      aria-label="Explore product information"
    >
      <div className="detail-mobile-nav">
        <label htmlFor={selectId}>{t("Product details")}</label>
        <select
          id={selectId}
          value={active}
          onChange={(event) => {
            const id = event.target.value
            setActive(id)
            pending.current = id
            window.clearTimeout(timer.current)
            timer.current = window.setTimeout(() => {
              pending.current = null
              update.current()
            }, 1200)
            window.history.pushState(window.history.state, "", `#product-${id}`)
            document
              .getElementById(`product-${id}`)
              ?.scrollIntoView({ block: "start", behavior: "instant" })
          }}
        >
          {sections.map(([id, label]) => (
            <option key={id} value={id}>
              {id === "reviews"
                ? `${t(label)} (${formatNumber(reviewCount)})`
                : t(label)}
            </option>
          ))}
        </select>
      </div>
      <div
        className="detail-section-rail"
        ref={rail}
        onKeyDown={(event) => {
          const links = [...event.currentTarget.querySelectorAll("a")]
          const index = links.indexOf(event.target)
          if (index < 0) return
          const next =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? links.length - 1
                : event.key === "ArrowRight"
                  ? (index + 1) % links.length
                  : event.key === "ArrowLeft"
                    ? (index + links.length - 1) % links.length
                    : null
          if (next != null) {
            event.preventDefault()
            links[next].focus({ preventScroll: true })
            reveal(links[next])
          }
        }}
      >
        {sections.map(([id, label]) => (
          <a
            key={id}
            href={`#product-${id}`}
            aria-current={active === id ? "location" : undefined}
            onFocus={(event) => reveal(event.currentTarget)}
            onClick={(event) => {
              if (
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return
              setActive(id)
              pending.current = id
              window.clearTimeout(timer.current)
              timer.current = window.setTimeout(() => {
                pending.current = null
                update.current()
              }, 1200)
              // The native anchor changes the fragment and scrolls the section. Only
              // the horizontal navigation rail is moved by this component.
              reveal(event.currentTarget)
            }}
          >
            {id === "reviews"
              ? `${t(label)} (${formatNumber(reviewCount)})`
              : t(label)}
          </a>
        ))}
      </div>
    </nav>
  )
}
