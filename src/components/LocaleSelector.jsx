import React, { useEffect, useId, useRef, useState } from "react"
import { ChevronDown, Globe2, X } from "lucide-react"
import { useLocale } from "../lib/locale.jsx"

export function LocaleSelector() {
  const { language, numberStyle, setPreferences, t } = useLocale()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ language, numberStyle })
  const [panelTop, setPanelTop] = useState(null)
  const wrapper = useRef(null)
  const trigger = useRef(null)
  const panel = useRef(null)
  const id = useId()
  useEffect(() => {
    if (!open) return
    const outside = (event) => {
      if (!wrapper.current?.contains(event.target)) setOpen(false)
    }
    const keyboard = (event) => {
      if (event.key === "Escape") {
        setOpen(false)
        trigger.current?.focus()
      }
    }
    const position = () => {
      const bounds = trigger.current?.getBoundingClientRect()
      if (!bounds) return
      if (bounds.bottom < 0 || bounds.top > window.innerHeight) {
        setOpen(false)
        return
      }
      const height = Math.min(
        panel.current?.scrollHeight || 400,
        window.innerHeight - 24,
      )
      setPanelTop(
        Math.max(
          12,
          Math.min(bounds.bottom + 10, window.innerHeight - height - 12),
        ),
      )
    }
    position()
    document.addEventListener("pointerdown", outside)
    document.addEventListener("keydown", keyboard)
    window.addEventListener("resize", position)
    window.addEventListener("scroll", position, true)
    panel.current?.querySelector("select")?.focus()
    return () => {
      document.removeEventListener("pointerdown", outside)
      document.removeEventListener("keydown", keyboard)
      window.removeEventListener("resize", position)
      window.removeEventListener("scroll", position, true)
    }
  }, [open])
  return (
    <div className="locale-selector" ref={wrapper}>
      <button
        type="button"
        className="locale-trigger"
        ref={trigger}
        aria-label={t("Language & currency")}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          setDraft({ language, numberStyle })
          setPanelTop(null)
          setOpen(!open)
        }}
      >
        <Globe2 size={20} strokeWidth={1.6} aria-hidden="true" />
        <span>
          <small>{language === "ar" ? "العربية" : "EN"}</small>
          <strong>UGX</strong>
        </span>
        <ChevronDown size={12} aria-hidden="true" />
      </button>
      {open && (
        <div
          className="locale-panel"
          id={id}
          ref={panel}
          role="region"
          aria-label={t("Language & currency")}
          style={{
            "--locale-panel-top": panelTop == null ? "12px" : panelTop + "px",
            visibility: panelTop == null ? "hidden" : undefined,
          }}
        >
          <div className="locale-panel-heading">
            <strong>{t("Language & currency")}</strong>
            <button
              type="button"
              aria-label={t("Close")}
              onClick={() => {
                setOpen(false)
                trigger.current?.focus()
              }}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              setPreferences(draft)
              setOpen(false)
              trigger.current?.focus()
            }}
          >
            <label>
              <span>{t("Language")}</span>
              <select
                value={draft.language}
                onChange={(e) =>
                  setDraft({ ...draft, language: e.target.value })
                }
              >
                <option value="en" lang="en">
                  English
                </option>
                <option value="ar" lang="ar">
                  العربية
                </option>
              </select>
            </label>
            <label>
              <span>{t("Currency")}</span>
              <select value="UGX" onChange={() => {}}>
                <option value="UGX">{t("Ugandan shilling")} · UGX</option>
              </select>
            </label>
            <label>
              <span>{t("Number format")}</span>
              <select
                value={draft.numberStyle}
                onChange={(e) =>
                  setDraft({ ...draft, numberStyle: e.target.value })
                }
              >
                <option value="latn">{t("English numerals")} · 123</option>
                <option value="arab">{t("Arabic numerals")} · ١٢٣</option>
              </select>
            </label>
            <p>{t("All prices and payments are in Ugandan shillings.")}</p>
            <button className="locale-save" type="submit">
              {t("Save")}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
