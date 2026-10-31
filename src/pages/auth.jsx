import React, { useEffect, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Heart,
  Package,
  ShieldCheck,
  X,
} from "lucide-react"
import { useStore, navigate } from "../store.jsx"
import { localReturnPath } from "../lib/navigation.js"
import { post } from "../lib/api.js"
import { Button, Field, IconButton, Notice } from "../components/ui.jsx"
import logoImage from "../imports/london/london-tech-logo.png"
import phoneImage from "../imports/london/iphone-18-pro.png"
import audioImage from "../imports/london/soundcore-earbuds.jpeg"

export function Auth({
  mode = "login",
  onClose,
  onModeChange,
  next: returnTo,
  dialog = false,
}) {
  const { setUser } = useStore()
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const register = mode === "register",
    forgot = mode === "forgot",
    reset = mode === "reset"
  const next = returnTo ?? new URLSearchParams(location.search).get("next")
  const title = register
    ? "Create your account"
    : forgot
      ? "Forgot your password?"
      : reset
        ? "Set a new password"
        : "Welcome back"
  useEffect(() => {
    setError("")
    setSuccess("")
    setShow(false)
  }, [mode])
  const modePath = (value) =>
    ({ login: "/login/", register: "/register/", forgot: "/forgot-password/" })[
      value
    ] + (next ? "?next=" + encodeURIComponent(localReturnPath(next, "/")) : "")
  const changeMode = (value) =>
    onModeChange ? onModeChange(value) : navigate(modePath(value))

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError("")
    const data = Object.fromEntries(new FormData(event.currentTarget))
    try {
      if (forgot) {
        const result = await post("auth/forgot-password", { email: data.email })
        setSuccess(result.message)
      } else if (reset) {
        const token = new URLSearchParams(location.search).get("token")
        if (!token)
          throw new Error(
            "This reset link is incomplete. Request a new password reset link.",
          )
        await post("auth/reset-password", { token, password: data.password })
        setSuccess("Your password is updated. You can sign in now.")
      } else {
        const result = await post(
          register ? "auth/register" : "auth/login",
          data,
        )
        setUser(result.user)
        if (dialog) onClose?.()
        const destination = localReturnPath(
          next,
          result.user.role === "admin" ? "/admin/" : "/account/",
        )
        if (destination !== location.pathname + location.search)
          navigate(destination)
      }
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-card">
      {!dialog && (
        <IconButton
          label="Close and return to shopping"
          className="auth-route-close"
          onClick={onClose || (() => navigate(localReturnPath(next, "/")))}
        >
          <X size={21} />
        </IconButton>
      )}
      <aside className="auth-welcome">
        <a href="/" className="auth-brand" aria-label="London Tech home">
          <img src={logoImage} alt="London Tech" />
        </a>
        <h2>
          Welcome to
          <br />
          <span>London Tech.</span>
        </h2>
        <p>Your favourites, your orders and a more personal way to shop.</p>
        <div className="auth-product-composition" aria-hidden="true">
          <div className="auth-product-circle" />
          <div className="auth-phone-card">
            <img src={phoneImage} alt="" loading="lazy" decoding="async" />
          </div>
          <div className="auth-audio-card">
            <img src={audioImage} alt="" loading="lazy" decoding="async" />
          </div>
          <span className="auth-saved-note">
            <Heart size={16} />A place for your favourites
          </span>
        </div>
        <div className="auth-welcome-benefits">
          <span>
            <Heart size={17} />
            Save what you love
          </span>
          <span>
            <Package size={17} />
            Keep track of your orders
          </span>
        </div>
      </aside>
      <section className="auth-form-panel" aria-labelledby="auth-form-title">
        {!forgot && !reset ? (
          <div
            className="auth-mode-switch"
            aria-label="Choose sign in or registration"
          >
            <button
              type="button"
              aria-pressed={!register}
              onClick={() => changeMode("login")}
            >
              Sign in
            </button>
            <button
              type="button"
              aria-pressed={register}
              onClick={() => changeMode("register")}
            >
              Register
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="auth-back"
            onClick={() => changeMode("login")}
          >
            <ArrowLeft size={16} />
            Back to sign in
          </button>
        )}
        <h1 id="auth-form-title">{title}</h1>
        <p className="auth-form-intro">
          {register
            ? "A few details, then you’re ready to explore."
            : forgot
              ? "We’ll email you a link to reset your password."
              : reset
                ? "Choose a password with at least 12 characters."
                : "Sign in to your London Tech account."}
        </p>
        {error && <Notice type="error">{error}</Notice>}
        {success ? (
          <div className="auth-success">
            <Notice type="success">{success}</Notice>
            <Button onClick={() => changeMode("login")}>
              Back to sign in
              <ArrowRight size={16} />
            </Button>
          </div>
        ) : (
          <form
            key={mode}
            className="stack-form auth-email-form"
            onSubmit={submit}
          >
            {register && (
              <Field
                label="Full name"
                name="name"
                autoComplete="name"
                minLength={2}
                maxLength={100}
                placeholder="Your full name"
                required
              />
            )}
            {!reset && (
              <Field
                label="Email address"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            )}
            {!forgot && (
              <div className="password-field">
                <Field
                  label={reset ? "New password" : "Password"}
                  name="password"
                  type={show ? "text" : "password"}
                  autoComplete={
                    register || reset ? "new-password" : "current-password"
                  }
                  minLength={register || reset ? 12 : undefined}
                  maxLength={128}
                  hint={
                    register || reset
                      ? "At least 12 characters. A memorable phrase works well."
                      : undefined
                  }
                  required
                />
                <IconButton
                  label={show ? "Hide password" : "Show password"}
                  type="button"
                  aria-pressed={show}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </IconButton>
              </div>
            )}
            {mode === "login" && (
              <button
                className="auth-forgot"
                type="button"
                onClick={() => changeMode("forgot")}
              >
                Forgot password?
              </button>
            )}
            {register && (
              <label className="auth-terms">
                <input type="checkbox" name="terms" required />
                <span>
                  I agree to the <a href="/terms/">Terms of use</a> and{" "}
                  <a href="/privacy/">Privacy policy</a>.
                </span>
              </label>
            )}
            <Button type="submit" busy={busy}>
              {register
                ? "Create your account"
                : forgot
                  ? "Send reset link"
                  : reset
                    ? "Update password"
                    : "Sign in"}
              <ArrowRight size={17} />
            </Button>
          </form>
        )}
        <div className="auth-private-note">
          <ShieldCheck size={15} />
          <span>Your details are kept private and secure.</span>
        </div>
        <div className="auth-country">
          <span>Shopping in</span>
          <strong>Uganda · UGX</strong>
        </div>
      </section>
    </div>
  )
}
