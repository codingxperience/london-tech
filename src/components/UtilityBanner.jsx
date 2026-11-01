import React, { useEffect, useState } from "react"
import { Pause, Play } from "lucide-react"
import { useReducedMotion } from "./MotionText"
import "../utility-banner.css"

const messages = [
  "THE TECH YOU LOVE.",
  "MORE FOR EVERY DAY.",
  "FIND YOUR NEXT.",
  "LET’S TALK TECH.",
]

export function UtilityBanner() {
  const reduced = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (reduced || paused) return
    const timer = window.setInterval(() => {
      if (!document.hidden)
        setIndex((current) => (current + 1) % messages.length)
    }, 6200)
    return () => window.clearInterval(timer)
  }, [reduced, paused])
  return (
    <div
      className={
        "utility-bar utility-banner" +
        (reduced ? " reduced-motion" : "") +
        (paused ? " is-paused" : "")
      }
      aria-label="London Tech announcements"
    >
      <div className="utility-banner-stage store-container">
        <div className="utility-brand-lockup" aria-label="London Tech">
          <span>
            LONDON <em>TECH</em>
          </span>
        </div>
        <div className="utility-centre">
          <span className="sr-only">
            Original technology and local expertise at London Tech, Kampala.
          </span>
          <span
            className="utility-centre-word"
            aria-hidden="true"
            key={reduced ? "static" : index}
          >
            {messages[reduced ? 0 : index]}
          </span>
        </div>
        <div className="utility-promise">
          <strong>ORIGINAL TECH.</strong>
          <span>LOCAL EXPERTISE.</span>
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
              <Play size={12} fill="currentColor" />
            ) : (
              <Pause size={12} fill="currentColor" />
            )}
          </button>
        )}
      </div>
    </div>
  )
}
