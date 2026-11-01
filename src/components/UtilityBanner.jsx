import React, { useEffect, useState } from "react"
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
  const [frame, setFrame] = useState(0)
  const index = frame % messages.length
  const round = Math.floor(frame / messages.length)
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    const update = () => setHidden(document.hidden)
    update()
    document.addEventListener("visibilitychange", update)
    return () => document.removeEventListener("visibilitychange", update)
  }, [])
  const stopped = reduced || hidden
  useEffect(() => {
    if (stopped) return
    // Every loop opens with the side slides, followed by the centre sequence.
    const timer = window.setTimeout(
      () => {
        setFrame((current) => current + 1)
      },
      cycle + (index === 0 ? opening : 0),
    )
    return () => window.clearTimeout(timer)
  }, [frame, stopped])
  const message = messages[reduced ? 0 : index]
  const telephone = phone.replace(/[^\d+]/g, "").replace(/^0/, "+256")
  return (
    <div
      className={
        "utility-bar utility-banner" +
        (reduced ? " reduced-motion" : "") +
        (hidden ? " is-suspended" : "")
      }
      aria-label="London Tech announcements"
    >
      <div className="utility-banner-stage store-container">
        <a
          className="utility-call"
          href={`tel:${telephone}`}
          style={{
            animationName:
              round % 2 ? "utility-call-return" : "utility-call-arrive",
          }}
        >
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
            key={reduced ? "static" : frame}
            style={{ animationDelay: index === 0 ? `${opening}ms` : "0ms" }}
          >
            {message.text}
          </span>
        </a>
        <div
          className="utility-brand-lockup"
          aria-label="London Tech"
          style={{
            animationName:
              round % 2 ? "utility-brand-return" : "utility-brand-arrive",
          }}
        >
          <span>
            LONDON <em>TECH</em>
          </span>
          <small>TECHNOLOGY STORE</small>
        </div>
      </div>
    </div>
  )
}
