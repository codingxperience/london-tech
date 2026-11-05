import "../auth-flow.css"
import React, { useEffect, useRef, useState } from "react"
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

const codeDigits = (value) =>
  String(value)
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776))
    .replace(/\D/g, "")
    .slice(0, 6)

function EmailCodeInput({ value, onChange, disabled, invalid }) {
  const { t } = useLocale()
  const inputs = useRef([])
  const write = (index, raw) => {
    const digits = codeDigits(raw)
    if (digits.length > 1) {
      onChange(digits)
      inputs.current[Math.min(digits.length, 5)]?.focus()
      return
    }
    // Keep the code contiguous: pasting, autofill and keyboard entry agree.
    const next = value.slice(0, index) + digits + value.slice(index + 1)
    onChange(next)
    if (digits) inputs.current[Math.min(index + 1, 5)]?.focus()
  }
  return (
    <fieldset className="auth-code-field" disabled={disabled}>
      <legend className="sr-only">{t("Verification code")}</legend>
      <div className="auth-code-digits" dir="ltr">
        {Array.from({ length: 6 }, (_, index) => (
          <input
            key={index}
            ref={(element) => {
              inputs.current[index] = element
            }}
            aria-label={t("Code digit {number}", { number: index + 1 })}
            aria-invalid={invalid || undefined}
            aria-describedby="auth-code-expiry"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            type="text"
            value={value[index] || ""}
            autoFocus={index === 0}
            onChange={(event) => write(index, event.target.value)}
            onFocus={(event) => event.target.select()}
            onPaste={(event) => {
              const digits = codeDigits(event.clipboardData.getData("text"))
              if (!digits) return
              event.preventDefault()
              onChange(digits)
              inputs.current[Math.min(digits.length, 5)]?.focus()
            }}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && !value[index] && index > 0) {
                event.preventDefault()
                onChange(value.slice(0, index - 1))
                inputs.current[index - 1]?.focus()
              }
              if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
                event.preventDefault()
                inputs.current[
                  Math.max(
                    0,
                    Math.min(5, index + (event.key === "ArrowRight" ? 1 : -1)),
                  )
                ]?.focus()
              }
            }}
          />
        ))}
      </div>
    </fieldset>
  )
}

function ProviderIcon({ provider }) {
  if (provider === "apple")
    return (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M17.05 12.54c.03 3.07 2.69 4.09 2.72 4.1-.02.07-.43 1.46-1.41 2.9-.85 1.24-1.73 2.47-3.12 2.5-1.36.03-1.8-.81-3.35-.81-1.55 0-2.04.78-3.32.84-1.34.05-2.36-1.34-3.22-2.58-1.75-2.53-3.08-7.16-1.28-10.28a5 5 0 0 1 4.23-2.56c1.32-.03 2.57.89 3.37.89.81 0 2.32-1.1 3.91-.94.67.03 2.54.27 3.74 2.03-.1.06-2.23 1.3-2.21 3.91ZM14.5 4.96c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.26.68-2.99 1.54-.65.75-1.23 1.96-1.08 3.12 1.14.09 2.3-.58 3.01-1.41Z" />
      </svg>
    )
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
  const { t, formatNumber } = useLocale()
  const [stage, setStage] = useState("email")
  const [email, setEmail] = useState("")
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [linking, setLinking] = useState(false)
  const [challenge, setChallenge] = useState(null)
  const [code, setCode] = useState("")
  const [clock, setClock] = useState(Date.now)
  const [codeNotice, setCodeNotice] = useState("")
  const operation = useRef(0)
  const forgot = mode === "forgot",
    reset = mode === "reset"
  const register = stage === "register" && !forgot && !reset
  const next = returnTo ?? new URLSearchParams(location.search).get("next")
  const title = forgot
    ? "Forgot password?"
    : reset
      ? "Set a new password"
      : stage === "code"
        ? "Check your email"
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
    setChallenge(null)
    setCode("")
    setCodeNotice("")
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
      operation.current++
    }
  }, [mode])
  useEffect(() => {
    if (stage !== "code") return
    const tick = () => setClock(Date.now())
    tick()
    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [stage, challenge])
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
    setCodeNotice("")
  }

  const complete = (user) => {
    setUser(user)
    if (dialog) onClose?.()
    const destination = localReturnPath(
      next,
      user.role === "admin" ? "/admin/" : "/account/",
    )
    if (destination !== location.pathname + location.search)
      navigate(destination)
  }
  async function requestCode() {
    if (busy) return
    const request = ++operation.current
    setBusy(true)
    setError("")
    setCodeNotice("")
    try {
      const result = await post("auth/email-code", { email: email.trim() })
      if (request !== operation.current) return
      if (
        !result.challengeId ||
        !Number.isFinite(Date.parse(result.expiresAt)) ||
        !Number.isFinite(Date.parse(result.resendAt))
      )
        throw new Error(t("Sign-in could not start. Please try again."))
      setEmail(email.trim())
      setChallenge(result)
      setCode("")
      setClock(Date.now())
      if (stage === "code") setCodeNotice(t("A new code has been sent."))
      setStage("code")
    } catch (failure) {
      if (request === operation.current) setError(failure.message)
    } finally {
      if (request === operation.current) setBusy(false)
    }
  }

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    if (!forgot && !reset && stage === "email") {
      if (config.emailCodes) {
        await requestCode()
        return
      }
      setEmail(email.trim())
      changeStage("password")
      return
    }
    setBusy(true)
    setError("")
    const request = ++operation.current
    const data = Object.fromEntries(new FormData(event.currentTarget))
    try {
      if (stage === "code" && !forgot && !reset) {
        const result = await post("auth/verify-code", {
          challengeId: challenge.challengeId,
          code,
          terms: true,
        })
        if (request !== operation.current) return
        complete(result.user)
      } else if (forgot) {
        const result = await post("auth/forgot-password", { email })
        if (request !== operation.current) return
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
        if (request !== operation.current) return
        setSuccess(t("Your password is updated. You can sign in now."))
      } else {
        const result = await post(register ? "auth/register" : "auth/login", {
          ...data,
          email,
        })
        if (request !== operation.current) return
        complete(result.user)
      }
    } catch (failure) {
      if (request === operation.current) setError(failure.message)
    } finally {
      if (request === operation.current) setBusy(false)
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
  const verifying = !forgot && !reset && stage === "code"
  const resendIn = challenge
    ? Math.max(0, Math.ceil((Date.parse(challenge.resendAt) - clock) / 1000))
    : 0
  const expiresIn = challenge
    ? Math.max(0, Math.ceil((Date.parse(challenge.expiresAt) - clock) / 1000))
    : 0
  const timeRemaining = `${Math.floor(expiresIn / 60)}:${String(expiresIn % 60).padStart(2, "0")}`
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
        {(forgot || reset || verifying) && (
          <button
            type="button"
            className="auth-back"
            disabled={busy}
            onClick={() =>
              verifying ? changeStage("email") : changeMode("login")
            }
          >
            <ArrowLeft size={16} />
            {t(verifying ? "Change email" : "Back to sign in")}
          </button>
        )}
        <h1 id="auth-form-title">{t(title)}</h1>
        {(initial || verifying) && (
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
            aria-busy={busy}
          >
            {verifying ? (
              <>
                <p className="auth-code-intro">
                  {t("Enter the 6-digit code sent to")}
                  <bdi>{email}</bdi>
                </p>
                <EmailCodeInput
                  value={code}
                  onChange={(value) => {
                    setCode(value)
                    setError("")
                  }}
                  disabled={busy}
                  invalid={Boolean(error)}
                />
                <p className="auth-code-expiry" id="auth-code-expiry">
                  {expiresIn > 0
                    ? t("Code expires in {time}", { time: timeRemaining })
                    : t("This code has expired. Request a new one.")}
                </p>
                <button
                  className="auth-resend"
                  type="button"
                  disabled={busy || resendIn > 0}
                  onClick={requestCode}
                >
                  {resendIn > 0
                    ? t("Resend code in {seconds}s", {
                        seconds: formatNumber(resendIn),
                      })
                    : t("Resend code")}
                </button>
                {codeNotice && (
                  <p className="auth-code-notice" role="status">
                    {codeNotice}
                  </p>
                )}
              </>
            ) : (
              <>
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
                        disabled={busy}
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
                        register || reset
                          ? t("At least 12 characters.")
                          : undefined
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
              </>
            )}
            <Button
              type="submit"
              busy={busy}
              disabled={
                verifying
                  ? code.length !== 6 || expiresIn === 0
                  : (initial || forgot) && !emailReady
              }
            >
              {t(
                verifying
                  ? "Verify & continue"
                  : forgot
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
            {!verifying && (
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
                    disabled={busy}
                    onClick={() =>
                      config.emailCodes
                        ? requestCode()
                        : changeStage("register")
                    }
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
                {config.emailCodes && initial && (
                  <button
                    type="button"
                    className="auth-create-link"
                    disabled={!emailReady || busy}
                    onClick={() => changeStage("password")}
                  >
                    {t("Sign in with password")}
                  </button>
                )}
                <div className="auth-provider-divider">
                  <span>{t("Or continue with")}</span>
                </div>
                <div className="auth-social-options">
                  {[
                    ["google", "Google"],
                    ["facebook", "Facebook"],
                    ["apple", "Apple"],
                  ].map(([provider, name]) => {
                    const available =
                      provider !== "apple" &&
                      config.socialProviders?.[provider] === true
                    return (
                      <button
                        type="button"
                        key={provider}
                        disabled={!available || busy}
                        onClick={() => social(provider)}
                        aria-label={t("Continue with " + name)}
                        title={!available ? t("Available soon") : undefined}
                      >
                        <ProviderIcon provider={provider} />
                        <span>{name}</span>
                      </button>
                    )
                  })}
                </div>
                {!config.socialProviders?.google &&
                  !config.socialProviders?.facebook && (
                    <p className="auth-provider-status">
                      {t("Social sign-in will be available soon.")}
                    </p>
                  )}
                <p className="auth-country">
                  {t("Location")} <strong>{t("Uganda")}</strong>
                </p>
              </>
            )}
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
