import "../auth-flow.css"
import React, { useEffect, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  X,
} from "lucide-react"
import { useStore, navigate } from "../store.jsx"
import { useLocale } from "../lib/locale.jsx"
import { localReturnPath } from "../lib/navigation.js"
import { api, post } from "../lib/api.js"
import { Button, Field, IconButton, Notice } from "../components/ui.jsx"

function ProviderIcon({ provider }) {
  return provider === "google" ? (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.22c1.88-1.73 2.99-4.28 2.99-7.36Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.61-2.41l-3.22-2.51c-.9.6-2.05.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H3.09v2.59A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.09a10 10 0 0 0 0 9.02l3.32-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.96c1.47 0 2.79.51 3.83 1.51l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.91 5.49l3.32 2.59C7.2 7.72 9.4 5.96 12 5.96Z"
      />
    </svg>
  ) : (
    <svg width="25" height="25" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path
        fill="#fff"
        d="M16.67 15.47 17.2 12h-3.33V9.75c0-.95.47-1.88 1.96-1.88h1.5V4.92s-1.36-.23-2.66-.23c-2.71 0-4.48 1.64-4.48 4.61V12H7.17v3.47h3.02V24a12.2 12.2 0 0 0 3.68 0v-8.53h2.8Z"
      />
    </svg>
  )
}

export function Auth({
  mode = "login",
  onClose,
  onModeChange,
  next: returnTo,
  dialog = false,
}) {
  const { setUser, config } = useStore()
  const { t } = useLocale()
  const [stage, setStage] = useState("email")
  const [email, setEmail] = useState("")
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [linking, setLinking] = useState(false)
  const forgot = mode === "forgot",
    reset = mode === "reset"
  const register = stage === "register" && !forgot && !reset
  const next = returnTo ?? new URLSearchParams(location.search).get("next")
  const title = forgot
    ? "Forgot password?"
    : reset
      ? "Set a new password"
      : register
        ? "Create your account"
        : stage === "password"
          ? "Sign in"
          : "Register / Sign in"
  useEffect(() => {
    let active = true
    const params = new URLSearchParams(location.search)
    setError(params.get("social_error")?.slice(0, 300) || "")
    setSuccess("")
    setShow(false)
    setStage("email")
    setLinking(false)
    if (!forgot && !reset && params.get("social") === "link") {
      api("auth/social-link")
        .then(({ link }) => {
          if (!active) return
          if (link) {
            setEmail(link.email)
            setStage("password")
            setLinking(true)
          } else setError(t("This sign-in session expired. Please try again."))
        })
        .catch((failure) => {
          if (active) setError(failure.message)
        })
    }
    return () => {
      active = false
    }
  }, [mode])
  const changeMode = (value) => {
    if (onModeChange) onModeChange(value)
    else {
      const route = value === "forgot" ? "/forgot-password/" : "/login/"
      navigate(
        route +
          (next
            ? "?next=" + encodeURIComponent(localReturnPath(next, "/"))
            : ""),
      )
    }
  }
  const changeStage = (value) => {
    setStage(value)
    setError("")
    setShow(false)
  }

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    if (!forgot && !reset && stage === "email") {
      setEmail(email.trim())
      changeStage("password")
      return
    }
    setBusy(true)
    setError("")
    const data = Object.fromEntries(new FormData(event.currentTarget))
    try {
      if (forgot) {
        const result = await post("auth/forgot-password", { email })
        setSuccess(result.message)
      } else if (reset) {
        const token = new URLSearchParams(location.search).get("token")
        if (!token)
          throw new Error(
            t(
              "This reset link is incomplete. Request a new password reset link.",
            ),
          )
        await post("auth/reset-password", { token, password: data.password })
        setSuccess(t("Your password is updated. You can sign in now."))
      } else {
        const result = await post(register ? "auth/register" : "auth/login", {
          ...data,
          email,
        })
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
  async function social(provider) {
    setBusy(true)
    setError("")
    try {
      const result = await post("auth/social/" + provider, {
        next: localReturnPath(next, ""),
      })
      const target = new URL(result.url)
      const expected =
        provider === "google" ? "accounts.google.com" : "www.facebook.com"
      if (target.protocol !== "https:" || target.hostname !== expected)
        throw new Error(t("Sign-in could not start. Please try again."))
      location.assign(target.href)
    } catch (failure) {
      setError(failure.message)
      setBusy(false)
    }
  }
  const initial = !forgot && !reset && stage === "email"
  const emailReady = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  return (
    <div className="auth-card auth-card-simple auth-unified">
      {!dialog && (
        <IconButton
          label={t("Close and return to shopping")}
          className="auth-route-close"
          onClick={onClose || (() => navigate(localReturnPath(next, "/")))}
        >
          <X size={21} />
        </IconButton>
      )}
      <section className="auth-form-panel" aria-labelledby="auth-form-title">
        {(forgot || reset) && (
          <button
            type="button"
            className="auth-back"
            onClick={() => changeMode("login")}
          >
            <ArrowLeft size={16} />
            {t("Back to sign in")}
          </button>
        )}
        <h1 id="auth-form-title">{t(title)}</h1>
        {initial && (
          <p className="auth-security">
            <ShieldCheck size={14} aria-hidden="true" />
            {t("Your information is protected")}
          </p>
        )}
        {linking && (
          <p className="auth-link-confirmation">
            {t(
              "Enter your London Tech password to connect this sign-in option.",
            )}
          </p>
        )}
        {error && <Notice type="error">{t(error)}</Notice>}
        {success ? (
          <div className="auth-success">
            <Notice type="success">{t(success)}</Notice>
            <Button onClick={() => changeMode("login")}>
              {t("Back to sign in")}
              <ArrowRight size={16} />
            </Button>
          </div>
        ) : (
          <form
            key={forgot ? "forgot" : reset ? "reset" : stage}
            className="stack-form auth-email-form"
            onSubmit={submit}
          >
            {!reset &&
              (initial || forgot ? (
                <Field
                  label={t("Email address")}
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t("Email")}
                  value={email}
                  maxLength={254}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              ) : (
                <div className="auth-email-choice">
                  <bdi>{email}</bdi>
                  <button
                    type="button"
                    onClick={() => {
                      setLinking(false)
                      changeStage("email")
                    }}
                  >
                    {t("Edit")}
                  </button>
                  <input
                    type="hidden"
                    name="email"
                    autoComplete="username"
                    value={email}
                  />
                </div>
              ))}
            {register && (
              <Field
                label={t("Full name")}
                name="name"
                autoComplete="name"
                minLength={2}
                maxLength={100}
                placeholder={t("Your full name")}
                required
              />
            )}
            {!initial && !forgot && (
              <div className="password-field">
                <Field
                  label={t(reset ? "New password" : "Password")}
                  name="password"
                  type={show ? "text" : "password"}
                  autoComplete={
                    register || reset ? "new-password" : "current-password"
                  }
                  minLength={register || reset ? 12 : undefined}
                  maxLength={128}
                  hint={
                    register || reset ? t("At least 12 characters.") : undefined
                  }
                  required
                />
                <IconButton
                  label={t(show ? "Hide password" : "Show password")}
                  type="button"
                  aria-pressed={show}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </IconButton>
              </div>
            )}
            {register && (
              <label className="auth-terms">
                <input type="checkbox" name="terms" required />
                <span>
                  {t("I agree to the")}{" "}
                  <a href="/terms/">{t("Terms of use")}</a> {t("and")}{" "}
                  <a href="/privacy/">{t("Privacy policy")}</a>.
                </span>
              </label>
            )}
            <Button
              type="submit"
              busy={busy}
              disabled={(initial || forgot) && !emailReady}
            >
              {t(
                forgot
                  ? "Send reset link"
                  : reset
                    ? "Update password"
                    : register
                      ? "Create your account"
                      : initial
                        ? "Continue"
                        : "Sign in",
              )}
            </Button>
          </form>
        )}
        {!forgot && !reset && !success && (
          <>
            <button
              type="button"
              className="auth-forgot"
              onClick={() => changeMode("forgot")}
            >
              {t("Trouble signing in?")}
            </button>
            {stage === "password" && !linking && (
              <button
                type="button"
                className="auth-create-link"
                onClick={() => changeStage("register")}
              >
                {t("New to London Tech? Create an account")}
              </button>
            )}
            {register && (
              <button
                type="button"
                className="auth-create-link"
                onClick={() => changeStage("password")}
              >
                {t("Already have an account? Sign in")}
              </button>
            )}
            <div className="auth-provider-divider">
              <span>{t("Or continue with")}</span>
            </div>
            <div className="auth-social-options">
              {["google", "facebook"].map((provider) => {
                const available = config.socialProviders?.[provider] === true
                return (
                  <button
                    type="button"
                    key={provider}
                    disabled={!available || busy}
                    onClick={() => social(provider)}
                    aria-label={t(
                      provider === "google"
                        ? "Continue with Google"
                        : "Continue with Facebook",
                    )}
                    title={!available ? t("Available soon") : undefined}
                  >
                    <ProviderIcon provider={provider} />
                    <span>{provider === "google" ? "Google" : "Facebook"}</span>
                  </button>
                )
              })}
            </div>
            {!config.socialProviders?.google &&
              !config.socialProviders?.facebook && (
                <p className="auth-provider-status">
                  {t("Google and Facebook sign-in will be available soon.")}
                </p>
              )}
            <p className="auth-country">
              {t("Location")} <strong>{t("Uganda")}</strong>
            </p>
            <p className="auth-policy">
              {t("By continuing, you agree to our")}{" "}
              <a href="/terms/">{t("Terms of use")}</a> {t("and")}{" "}
              <a href="/privacy/">{t("Privacy policy")}</a>.
            </p>
          </>
        )}
      </section>
    </div>
  )
}
