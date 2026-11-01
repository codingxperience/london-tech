import { useEffect, useRef, useState } from "react"

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])
  return reduced
}

/** Decorative hint only: the input keeps a permanent, accessible search label. */
export function TypewriterText({
  words,
  active = true,
  className = "",
}: {
  words: readonly string[]
  active?: boolean
  className?: string
}) {
  const reduced = useReducedMotion()
  const [frame, setFrame] = useState({ index: 0, count: 0, deleting: false })
  const word = words[frame.index % words.length] || "products"
  useEffect(() => {
    if (reduced || !active || !words.length) return
    const complete = frame.count === word.length
    const delay = frame.deleting ? 42 : complete ? 1800 : frame.count ? 85 : 380
    const timeout = window.setTimeout(() => {
      setFrame((current) => {
        if (current.deleting && current.count === 0)
          return {
            index: (current.index + 1) % words.length,
            count: 0,
            deleting: false,
          }
        if (!current.deleting && complete) return { ...current, deleting: true }
        return {
          ...current,
          count: current.count + (current.deleting ? -1 : 1),
        }
      })
    }, delay)
    return () => window.clearTimeout(timeout)
  }, [active, frame, reduced, word, words])
  return (
    <span className={"typewriter-text " + className} aria-hidden="true">
      <strong>
        {reduced ? words[0] || "products" : word.slice(0, frame.count)}
      </strong>
      <span className="search-caret" />
    </span>
  )
}

const CATEGORY_COPY: Record<string, readonly string[]> = {
  phones: [
    "Your day. A little more connected.",
    "Find your next everyday essential.",
    "Explore every angle.",
  ],
  audio: [
    "Make room for your music.",
    "Find your everyday sound.",
    "A new rhythm for your day.",
  ],
  computers: [
    "Make space for your best work.",
    "Ideas deserve a bigger canvas.",
    "Find your everyday workspace.",
  ],
  watches: [
    "Your day, a glance away.",
    "A little detail. A daily companion.",
    "Find your everyday style.",
  ],
  cameras: [
    "Keep the moments that matter.",
    "A new way to tell your story.",
    "Explore your creative side.",
  ],
  gaming: [
    "Make more time for play.",
    "Find your next adventure.",
    "Your setup. Your next level.",
  ],
  accessories: [
    "Small details. Everyday possibilities.",
    "Bring your setup together.",
    "Find your finishing touch.",
  ],
}

function copyFor(category: string) {
  if (/phone|mobile/i.test(category)) return CATEGORY_COPY.phones
  if (/audio|earbud|headphone|speaker/i.test(category))
    return CATEGORY_COPY.audio
  if (/laptop|tablet|computer|pc/i.test(category))
    return CATEGORY_COPY.computers
  if (/watch/i.test(category)) return CATEGORY_COPY.watches
  if (/camera/i.test(category)) return CATEGORY_COPY.cameras
  if (/gaming|game/i.test(category)) return CATEGORY_COPY.gaming
  return CATEGORY_COPY.accessories
}

/** Vertical word reveal previously used in the search bar, with static AT copy. */
export function ProductMotionNote({
  category,
  className = "",
}: {
  category: string
  className?: string
}) {
  const phrases = copyFor(category)
  const reduced = useReducedMotion()
  const element = useRef<HTMLSpanElement>(null)
  const [visible, setVisible] = useState(false)
  const [paused, setPaused] = useState(false)
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const node = element.current
    if (!node) return
    if (!("IntersectionObserver" in window)) {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const card =
      element.current?.closest<HTMLElement>(".pcard, .product-card, article") ||
      element.current
    if (!card) return
    const update = () => setPaused(card.matches(":hover, :focus-within"))
    const blur = (event: FocusEvent) => {
      setPaused(
        card.contains(event.relatedTarget as Node | null) ||
          card.matches(":hover"),
      )
    }
    card.addEventListener("pointerenter", update)
    card.addEventListener("pointerleave", update)
    card.addEventListener("focusin", update)
    card.addEventListener("focusout", blur)
    return () => {
      card.removeEventListener("pointerenter", update)
      card.removeEventListener("pointerleave", update)
      card.removeEventListener("focusin", update)
      card.removeEventListener("focusout", blur)
    }
  }, [])
  useEffect(() => {
    if (reduced || !visible || paused) return
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % phrases.length)
    }, 4400)
    return () => window.clearInterval(timer)
  }, [reduced, visible, paused, phrases])
  return (
    <span ref={element} className={"product-motion-note " + className}>
      <span className="sr-only">{phrases[0]}</span>
      <span
        className="product-motion-line"
        aria-hidden="true"
        key={reduced ? 0 : index}
      >
        {phrases[reduced ? 0 : index]}
      </span>
    </span>
  )
}
