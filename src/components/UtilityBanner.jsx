import React, { useEffect, useState } from "react"
import { Pause, Play } from "lucide-react"
import { useReducedMotion } from "./MotionText"
import { useStore } from "../store.jsx"
import { products as catalogue, storeDefaults } from "../data/catalog.js"
import { productOffer } from "../lib/offer-details.js"
import "../utility-banner.css"

const cycle = 2800
const opening = 850

export function UtilityBanner() {
  const store = useStore()
  const products = store?.products || catalogue
  const phone = store?.settings?.phone || storeDefaults.phone
  const maxSaving = Math.max(
    0,
    ...products
      .filter((p) => p.active !== false && p.stock > 0)
      .map((p) => productOffer(p).discountPercent),
  )
  const messages = [
    { text: "UPGRADE FOR LESS.", motion: "rise" },
    { text: "PHONES & LAPTOPS", motion: "drop" },
    {
      text: maxSaving ? `SAVE UP TO ${maxSaving}%` : "UPGRADE TODAY",
      motion: "zoom",
      pill: true,
    },
    { text: "AUDIO & GAMING", motion: "rise" },
    { text: "VISIT ARUA PARK", motion: "drop" },
    { text: "SHOP LONDON TECH", motion: "zoom" },
  ]
  const reduced = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [started, setStarted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    const update = () => setHidden(document.hidden)
    update()
    document.addEventListener("visibilitychange", update)
    return () => document.removeEventListener("visibilitychange", update)
  }, [])
  const stopped = reduced || paused || hidden
  useEffect(() => {
    if (stopped) return
    // The side elements settle first. Subsequent cycles animate only the centre.
    const timer = window.setTimeout(
      () => {
        setStarted(true)
        setIndex((current) => (current + 1) % messages.length)
      },
      cycle + (started ? 0 : opening),
    )
    return () => window.clearTimeout(timer)
  }, [index, started, stopped])
  const message = messages[reduced ? 0 : index]
  const telephone = phone.replace(/[^\d+]/g, "").replace(/^0/, "+256")
  return (
    <div
      className={
        "utility-bar utility-banner" +
        (reduced ? " reduced-motion" : "") +
        (stopped ? " is-paused" : "")
      }
      aria-label="London Tech announcements"
    >
      <div className="utility-banner-stage store-container">
        <a className="utility-call" href={`tel:${telephone}`}>
          <span>Call to order</span>
          <strong>{phone}</strong>
        </a>
        <a
          className="utility-centre"
          href="/collections/shop/"
          aria-label="Shop London Tech offers"
        >
          <span className="sr-only">
            Phones, laptops, audio and gaming. Shop London Tech offers.
          </span>
          <span
            className={`utility-centre-word motion-${message.motion}${
              message.pill ? " is-pill" : ""
            }`}
            aria-hidden="true"
            key={reduced ? "static" : index}
            style={{ animationDelay: started ? "0ms" : `${opening}ms` }}
          >
            {message.text}
          </span>
        </a>
        <div className="utility-brand-lockup" aria-label="London Tech">
          <span>
            LONDON <em>TECH</em>
          </span>
          <small>TECHNOLOGY STORE</small>
        </div>
        {!reduced && (
          <button
            className="utility-motion-toggle"
            type="button"
            aria-label={
              paused ? "Play announcement motion" : "Pause announcement motion"
            }
            aria-pressed={paused}
            onClick={() => setPaused(!paused)}
          >
            {paused ? (
              <Play size={11} fill="currentColor" />
            ) : (
              <Pause size={11} fill="currentColor" />
            )}
          </button>
        )}
      </div>
    </div>
  )
}
