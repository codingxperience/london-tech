import { useEffect, useRef, useState } from "react"
import { HandCoins, MapPin, MessageCircle, Tag, Truck } from "lucide-react"
import { productOffer } from "../lib/offer-details.js"
import { useLocale } from "../lib/locale.jsx"
import "../product-card-motion.css"

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
  const wordsContent = JSON.stringify(words)
  const wordCount = words.length
  const word = words[frame.index % words.length] || "products"
  useEffect(() => {
    setFrame({ index: 0, count: 0, deleting: false })
  }, [wordsContent])
  useEffect(() => {
    if (reduced || !active || !wordCount) return
    const complete = frame.count === word.length
    const delay = frame.deleting ? 42 : complete ? 1800 : frame.count ? 85 : 380
    const timeout = window.setTimeout(() => {
      setFrame((current) => {
        if (current.deleting && current.count === 0)
          return {
            index: (current.index + 1) % wordCount,
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
  }, [active, frame, reduced, word, wordCount, wordsContent])
  return (
    <span className={"typewriter-text " + className} aria-hidden="true">
      <strong>
        {reduced ? words[0] || "products" : word.slice(0, frame.count)}
      </strong>
      <span className="search-caret" />
    </span>
  )
}

/** A short service or offer line. Price and stock remain visible beside it. */
export function ProductMotionNote({
  product,
  className = "",
}: {
  product: {
    id?: string
    price?: number | null
    comparePrice?: number | null
    priceConfirmed?: boolean
    stock?: number | null
  }
  className?: string
}) {
  const { language, formatNumber } = useLocale()
  const arabic = language === "ar"
  const offer = productOffer(product)
  const savings =
    offer.discounted && offer.originalPrice !== null && offer.price !== null
      ? formatNumber(offer.originalPrice - offer.price)
      : null
  const canOrder =
    product.priceConfirmed &&
    typeof product.stock === "number" &&
    product.stock > 0
  const notes = canOrder
    ? [
        ...(savings !== null
          ? [
              {
                text: arabic
                  ? `وفّر ${savings} شلن أوغندي`
                  : `Save UGX ${savings}`,
                icon: Tag,
                tone: "saving",
              },
            ]
          : []),
        {
          text: arabic ? "الدفع عند الاستلام" : "Cash on delivery",
          icon: HandCoins,
          tone: "payment",
        },
        {
          text: arabic ? "استلام مجاني من المتجر" : "Free store pickup",
          icon: MapPin,
          tone: "pickup",
        },
        {
          text: arabic ? "توصيل في جميع أنحاء أوغندا" : "Uganda-wide delivery",
          icon: Truck,
          tone: "delivery",
        },
      ]
    : [
        {
          text:
            product.stock === 0
              ? arabic
                ? "اسأل عن توفّر المنتج مجددًا"
                : "Ask about restocking"
              : arabic
                ? "تحقّق من التوفّر مع المتجر"
                : "Check with the store",
          icon: MessageCircle,
          tone: "support",
        },
        ...(product.stock === 0 ? [] : [
          {
            text: arabic ? "اسأل عن الاستلام من المتجر" : "Ask about store pickup",
            icon: MapPin,
            tone: "pickup",
          },
          {
            text: arabic ? "اسأل عن خيارات التوصيل" : "Ask about delivery",
            icon: Truck,
            tone: "delivery",
          },
        ]),
      ]
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
  }, [product.id])
  useEffect(() => {
    const card =
      element.current?.closest<HTMLElement>(
        ".pcard, .product-card, .deal-item, article",
      ) || element.current
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
    if (reduced || !visible || paused || notes.length < 2) return
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % notes.length)
    }, 5200)
    return () => window.clearInterval(timer)
  }, [reduced, visible, paused, notes.length])
  const note = notes[reduced ? 0 : index % notes.length]
  const Icon = note.icon
  return (
    <span
      ref={element}
      className={"product-motion-note card-service-note " + className}
      data-tone={note.tone}
      title={note.text}
    >
      <span className="sr-only">
        {notes.map((item) => item.text).join(" · ")}
      </span>
      <span
        className="product-motion-line"
        aria-hidden="true"
        key={reduced ? 0 : index}
      >
        <Icon size={14} strokeWidth={2} />
        <span>{note.text}</span>
      </span>
    </span>
  )
}
