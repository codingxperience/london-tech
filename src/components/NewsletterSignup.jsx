import React, { useId, useState } from "react"
import { ArrowRight, Check, Mail } from "lucide-react"
import { api } from "../lib/api.js"
import { useLocale } from "../lib/locale.jsx"

export function NewsletterSignup() {
  const { t } = useLocale()
  const emailId = useId()
  const consentId = useId()
  const messageId = useId()
  const [email, setEmail] = useState("")
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(null)

  return (
    <section className="footer-newsletter" aria-label={t("Store newsletter")}>
      <div className="footer-newsletter-copy">
        <h2>{t("Your next upgrade, first.")}</h2>
        <p>{t("New arrivals, store offers and tech worth knowing.")}</p>
      </div>
      <form
        className="footer-newsletter-form"
        onSubmit={async (event) => {
          event.preventDefault()
          if (busy) return
          setError("")
          setSuccess(null)
          if (!consent) {
            setError(
              t("Please agree to receive the newsletter before subscribing."),
            )
            return
          }
          setBusy(true)
          try {
            const result = await api("newsletter/subscribe", {
              method: "POST",
              body: { email: email.trim(), consent: true },
            })
            if (!result.subscribed)
              throw new Error(
                t("Your subscription could not be saved. Please try again."),
              )
            setSuccess(result)
          } catch (failure) {
            setError(failure.message)
          } finally {
            setBusy(false)
          }
        }}
      >
        {success ? (
          <div className="footer-newsletter-success" role="status">
            <Check size={21} aria-hidden="true" />
            <div>
              <strong>{t("You’re on the list.")}</strong>
              <span>
                {t("Your subscription is saved. You can unsubscribe at any time.")}
              </span>
              {typeof success.unsubscribeUrl === "string" &&
                success.unsubscribeUrl.startsWith("/unsubscribe/?") && (
                  <a href={success.unsubscribeUrl}>{t("Manage subscription")}</a>
                )}
            </div>
            <button
              type="button"
              onClick={() => {
                setSuccess(null)
                setEmail("")
                setConsent(false)
              }}
            >
              {t("Use another email")}
            </button>
          </div>
        ) : (
          <>
            <div className="footer-newsletter-fields">
              <label className="footer-email-field" htmlFor={emailId}>
                <Mail size={19} aria-hidden="true" />
                <span className="sr-only">
                  {t("Email address for the newsletter")}
                </span>
                <input
                  id={emailId}
                  name="newsletter-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  placeholder={t("Your email address")}
                  value={email}
                  disabled={busy}
                  aria-describedby={error ? messageId : undefined}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <button
                className="footer-subscribe-button"
                type="submit"
                disabled={busy}
              >
                {busy ? t("Subscribing…") : t("Subscribe")}
                {!busy && <ArrowRight size={17} aria-hidden="true" />}
              </button>
            </div>
            <label className="footer-newsletter-consent" htmlFor={consentId}>
              <input
                id={consentId}
                type="checkbox"
                required
                checked={consent}
                disabled={busy}
                onChange={(event) => setConsent(event.target.checked)}
              />
              <span>
                {t("I agree to receive store news and offers. Read our")}{" "}
                <a href="/privacy/">{t("Privacy policy")}</a>. {t("Unsubscribe anytime.")}
              </span>
            </label>
          </>
        )}
        {error && (
          <p className="footer-newsletter-error" id={messageId} role="alert">
            {t(error)}
          </p>
        )}
      </form>
    </section>
  )
}
