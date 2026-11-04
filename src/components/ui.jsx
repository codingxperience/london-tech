import React, { useEffect, useId, useRef } from "react"
import { useLocale } from "../lib/locale.jsx"

import {
  ArrowRight,
  Check,
  ChevronRight,
  LoaderCircle,
  Minus,
  Plus,
  X,
  ShoppingBag,
} from "lucide-react"

export function Button({
  children,
  variant = "",
  busy = false,
  className = "",
  ...props
}) {
  const { t } = useLocale()
  return (
    <button
      className={"button " + variant + " " + className}
      {...props}
      disabled={busy || props.disabled}
    >
      {busy && <LoaderCircle size={17} className="spin" />}
      {React.Children.map(children, (child) =>
        typeof child === "string" ? t(child) : child,
      )}
    </button>
  )
}

export function ActionLink({ children, href, className = "", ...props }) {
  const { t } = useLocale()
  return (
    <a className={"button " + className} href={href} {...props}>
      {React.Children.map(children, (child) =>
        typeof child === "string" ? t(child) : child,
      )}
      <ArrowRight size={16} />
    </a>
  )
}

export function IconButton({ label, children, className = "", ...props }) {
  const { t } = useLocale()
  return (
    <button
      className={"icon-button " + className}
      aria-label={t(label)}
      title={t(label)}
      {...props}
    >
      {children}
    </button>
  )
}

export function Field({ label, error, hint, children, ...props }) {
  const { t } = useLocale()
  const id = useId()
  return (
    <label className="field" htmlFor={id}>
      <span>{typeof label === "string" ? t(label) : label}</span>
      {children ? (
        React.cloneElement(children, { id, ...props })
      ) : (
        <input
          id={id}
          {...props}
          placeholder={props.placeholder ? t(props.placeholder) : undefined}
          aria-invalid={!!error}
          aria-describedby={hint || error ? id + "-hint" : undefined}
        />
      )}
      {(error || hint) && (
        <small id={id + "-hint"} className={error ? "field-error" : ""}>
          {typeof (error || hint) === "string"
            ? t(error || hint)
            : error || hint}
        </small>
      )}
    </label>
  )
}

export function Notice({ children, type = "info" }) {
  const { t } = useLocale()
  return (
    <div
      className={"notice " + type}
      role={type === "error" ? "alert" : "status"}
    >
      {React.Children.map(children, (child) =>
        typeof child === "string" ? t(child) : child,
      )}
    </div>
  )
}

export function Empty({ icon: Icon = ShoppingBag, title, children, action }) {
  const { t } = useLocale()
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={30} strokeWidth={1.3} />
      </span>
      <h2>{typeof title === "string" ? t(title) : title}</h2>
      <p>
        {React.Children.map(children, (child) =>
          typeof child === "string" ? t(child) : child,
        )}
      </p>
      {action}
    </div>
  )
}

export function Breadcrumb({ items = [] }) {
  const { t } = useLocale()
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <a href="/">{t("Home")}</a>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          <ChevronRight size={12} />
          {it.href ? (
            <a href={it.href}>{t(it.label)}</a>
          ) : (
            <span aria-current="page">{t(it.label)}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}

export function Quantity({ value, onChange, max = 10 }) {
  const { t, formatNumber } = useLocale()
  return (
    <div className="quantity">
      <button
        aria-label={t("Decrease quantity")}
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
      >
        <Minus size={14} />
      </button>
      <span aria-live="polite">{formatNumber(value)}</span>
      <button
        aria-label={t("Increase quantity")}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

export function Modal({
  title,
  children,
  onClose,
  className = "",
  wide = false,
  drawer = false,
}) {
  const { t } = useLocale()
  const el = useRef(null)
  const id = useId()

  useEffect(() => {
    const previous = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const first =
      el.current.querySelector(
        "[data-modal-autofocus],input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]):not([hidden]),textarea,select",
      ) || el.current.querySelector("button,a[href]")
    first?.focus()

    const key = (e) => {
      if (e.key === "Escape") onClose()
      if (e.key === "Tab") {
        const targets = [
          ...el.current.querySelectorAll(
            "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]",
          ),
        ].filter((x) => x.offsetParent !== null)
        const first = targets[0],
          last = targets.at(-1)
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    window.addEventListener("keydown", key)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", key)
      previous?.focus()
    }
  }, [])

  return (
    <div
      className={"modal-backdrop " + (drawer ? "is-drawer" : "")}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        ref={el}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className={
          "modal " +
          (wide ? "wide " : "") +
          (drawer ? "drawer " : "") +
          className
        }
      >
        <header className="modal-heading">
          <h2 id={id}>{typeof title === "string" ? t(title) : title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </header>
        {children}
      </section>
    </div>
  )
}

export function CheckList({ items }) {
  const { t } = useLocale()
  return (
    <ul className="check-list">
      {items.map((item) => (
        <li key={item}>
          <Check size={15} />
          {typeof item === "string" ? t(item) : item}
        </li>
      ))}
    </ul>
  )
}

export function Badge({ children, type = "" }) {
  const { t } = useLocale()
  return (
    <span className={"badge " + type}>
      {typeof children === "string" ? t(children) : children}
    </span>
  )
}

export function PageHeading({ eyebrow, title, children, action }) {
  const { t } = useLocale()
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{t(eyebrow)}</p>}
        <h1>{typeof title === "string" ? t(title) : title}</h1>
        {children && (
          <p className="page-intro">
            {React.Children.map(children, (child) =>
              typeof child === "string" ? t(child) : child,
            )}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}
