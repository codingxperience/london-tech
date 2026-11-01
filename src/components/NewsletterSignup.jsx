import React, { useId, useState } from "react"
import { ArrowRight, Check, Mail } from "lucide-react"
import { api } from "../lib/api.js"

export function NewsletterSignup() {
  const emailId = useId()
  const consentId = useId()
  const messageId = useId()
  const [email, setEmail] = useState("")
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(null)

  return (
    <section className="footer-newsletter" aria-label="Store newsletter">
      <div className="footer-newsletter-copy">
        <h2>Your next upgrade, first.</h2>
        <p>New arrivals, store offers and tech worth knowing.</p>
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
              "Please agree to receive the newsletter before subscribing.",
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
                "Your subscription could not be saved. Please try again.",
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
              <strong>You’re on the list.</strong>
              <span>
                Your subscription is saved. You can unsubscribe at any time.
              </span>
              {typeof success.unsubscribeUrl === "string" &&
                success.unsubscribeUrl.startsWith("/unsubscribe/?") && (
                  <a href={success.unsubscribeUrl}>Manage subscription</a>
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
              Use another email
            </button>
          </div>
        ) : (
          <>
            <div className="footer-newsletter-fields">
              <label className="footer-email-field" htmlFor={emailId}>
                <Mail size={19} aria-hidden="true" />
                <span className="sr-only">
                  Email address for the newsletter
                </span>
                <input
                  id={emailId}
                  name="newsletter-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  placeholder="Your email address"
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
                {busy ? "Subscribing…" : "Subscribe"}
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
                I agree to receive store news and offers. Read our{" "}
                <a href="/privacy/">Privacy policy</a>. Unsubscribe anytime.
              </span>
            </label>
          </>
        )}
        {error && (
          <p className="footer-newsletter-error" id={messageId} role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  )
}
