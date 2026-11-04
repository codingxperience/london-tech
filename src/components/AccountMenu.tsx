import { useEffect, useId, useRef, useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  Heart,
  LogOut,
  Package,
  Settings,
  UserRound,
  CircleHelp,
} from "lucide-react"
import { useStore, navigate } from "../store.jsx"
import { useLocale } from "../lib/locale.jsx"

export function AccountMenu() {
  const { t } = useLocale()
  const { user, wishlist, openAuth, logout, notify } = useStore()
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const focusOnOpen = useRef(false)
  const id = useId()

  useEffect(() => {
    if (!open) return
    if (focusOnOpen.current) {
      focusOnOpen.current = false
      wrapper.current
        ?.querySelector<HTMLButtonElement>(".account-menu-panel button")
        ?.focus()
    }
    const outside = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        trigger.current?.focus({ preventScroll: true })
      }
    }
    document.addEventListener("pointerdown", outside)
    document.addEventListener("keydown", escape)
    return () => {
      document.removeEventListener("pointerdown", outside)
      document.removeEventListener("keydown", escape)
    }
  }, [open])

  const authenticate = (mode: string, next?: string) => {
    setOpen(false)
    trigger.current?.focus({ preventScroll: true })
    openAuth(mode, next)
  }
  const visit = (href: string, needsAccount = true) => {
    if (needsAccount && !user) authenticate("login", href)
    else {
      setOpen(false)
      navigate(href)
    }
  }

  return (
    <div
      className="account-menu"
      ref={wrapper}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false)
      }}
    >
      <button
        className="account-menu-trigger"
        ref={trigger}
        aria-expanded={open}
        aria-controls={id}
        aria-label={t(user ? "Open my account menu" : "Sign in or register")}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault()
            if (open)
              wrapper.current
                ?.querySelector<HTMLButtonElement>(".account-menu-panel button")
                ?.focus()
            else focusOnOpen.current = true
            setOpen(true)
          }
        }}
      >
        <UserRound size={23} strokeWidth={1.7} />
        <span>
          <small>
            {user ? `${t("Hello")}, ${user.name.split(" ")[0]}` : t("Welcome")}
          </small>
          <strong>{t(user ? "My account" : "Sign in / Register")}</strong>
        </span>
        <ChevronDown size={14} className={open ? "is-open" : ""} />
      </button>
      {open && (
        <div className="account-menu-panel" id={id}>
          {user ? (
            <div className="account-menu-person">
              <strong>{user.name}</strong>
              <span>{user.email}</span>
              <button onClick={() => visit("/account/")}>
                {t("Manage your account")}
                <ChevronRight size={14} />
              </button>
            </div>
          ) : (
            <div className="account-menu-auth">
              <button
                className="account-sign-in"
                onClick={() => authenticate("login")}
              >
                {t("Sign in")}
              </button>
              <button
                className="account-register"
                onClick={() => authenticate("register")}
              >
                {t("New here?")} <strong>{t("Create an account")}</strong>
              </button>
            </div>
          )}
          <nav aria-label={t("Your account")}>
            <button onClick={() => visit("/account/orders/")}>
              <Package size={18} />
              <span>{t("My orders")}</span>
              <ChevronRight size={14} />
            </button>
            <button onClick={() => visit("/account/wishlist/", false)}>
              <Heart size={18} />
              <span>{t("Wishlist")}</span>
              <b>{wishlist.length}</b>
            </button>
            <button onClick={() => visit("/account/profile/")}>
              <Settings size={18} />
              <span>{t("Account details")}</span>
              <ChevronRight size={14} />
            </button>
          </nav>
          <div className="account-menu-bottom">
            <a href="/help/" onClick={() => setOpen(false)}>
              <CircleHelp size={17} />
              {t("Help & support")}
            </a>
            {user && (
              <button
                onClick={async () => {
                  try {
                    await logout()
                    setOpen(false)
                  } catch {
                    notify(t("We couldn’t sign you out. Please try again."))
                  }
                }}
              >
                <LogOut size={17} />
                {t("Sign out")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
