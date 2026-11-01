import React, { useEffect, useId, useRef } from "react"

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
  return (
    <button
      className={"button " + variant + " " + className}
      {...props}
      disabled={busy || props.disabled}
    >
      {busy && <LoaderCircle size={17} className="spin" />}
      {children}
    </button>
  )
}

export function ActionLink({ children, href, className = "", ...props }) {
  return (
    <a className={"button " + className} href={href} {...props}>
      {children}
      <ArrowRight size={16} />
    </a>
  )
}

export function IconButton({ label, children, className = "", ...props }) {
  return (
    <button
      className={"icon-button " + className}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  )
}

export function Field({ label, error, hint, children, ...props }) {
  const id = useId()
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      {children ? (
        React.cloneElement(children, { id, ...props })
      ) : (
        <input
          id={id}
          {...props}
          aria-invalid={!!error}
          aria-describedby={hint || error ? id + "-hint" : undefined}
        />
      )}
      {(error || hint) && (
        <small id={id + "-hint"} className={error ? "field-error" : ""}>
          {error || hint}
        </small>
      )}
    </label>
  )
}

export function Notice({ children, type = "info" }) {
  return (
    <div
      className={"notice " + type}
      role={type === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  )
}

export function Empty({ icon: Icon = ShoppingBag, title, children, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={30} strokeWidth={1.3} />
      </span>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  )
}

export function Breadcrumb({ items = [] }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          <ChevronRight size={12} />
          {it.href ? (
            <a href={it.href}>{it.label}</a>
          ) : (
            <span aria-current="page">{it.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}

export function Quantity({ value, onChange, max = 10 }) {
  return (
    <div className="quantity">
      <button
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
      >
        <Minus size={14} />
      </button>
      <span aria-live="polite">{value}</span>
      <button
        aria-label="Increase quantity"
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
          <h2 id={id}>{title}</h2>
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
  return (
    <ul className="check-list">
      {items.map((item) => (
        <li key={item}>
          <Check size={15} />
          {item}
        </li>
      ))}
    </ul>
  )
}

export function Badge({ children, type = "" }) {
  return <span className={"badge " + type}>{children}</span>
}

export function PageHeading({ eyebrow, title, children, action }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {children && <p className="page-intro">{children}</p>}
      </div>
      {action}
    </div>
  )
}
