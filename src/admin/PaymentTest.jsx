import React, { useEffect, useState } from "react"
import { ArrowUpRight, FlaskConical } from "lucide-react"
import { PaymentLogo } from "../components/PaymentLogo.jsx"
import { Badge, Button, Notice } from "../components/ui.jsx"
import { money } from "../data/catalog.js"
import { post } from "../lib/api.js"

const methods = [
  ["mtn", "MTN Mobile Money"],
  ["airtel", "Airtel Money"],
  ["visa", "Visa card"],
]

export function PaymentTest({ amount }) {
  const [method, setMethod] = useState("mtn")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState(null)
  const [returned] = useState(() => {
    const params = new URLSearchParams(
      typeof location === "undefined" ? "" : location.search,
    )
    const proof = params.get("payment_test")
    return proof
      ? {
          proof,
          transactionId: params.get("transaction_id"),
          status: params.get("status"),
        }
      : null
  })

  async function run(body) {
    setBusy(true)
    setError("")
    try {
      const data = await post("admin/payment-test", body)
      if (body.action === "start") location.assign(data.url)
      else setResult(data)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  const verify = () =>
    run({
      action: "verify",
      proof: returned.proof,
      transactionId: returned.transactionId,
    })
  useEffect(() => {
    if (returned?.transactionId) verify()
  }, [returned])

  return (
    <section
      className="admin-panel payment-test-panel"
      aria-labelledby="payment-test-title"
    >
      <div className="admin-panel-heading">
        <h2 id="payment-test-title">Try Flutterwave checkout</h2>
        <FlaskConical size={19} aria-hidden="true" />
      </div>
      <div className="payment-test-content">
        <div className="payment-test-total">
          <div>
            <span>Sample total</span>
            <strong>{money(amount)}</strong>
          </div>
          <Badge type="warning">Test mode</Badge>
        </div>
        <p className="admin-muted">
          Owner demo with a sample order. Stock and customer orders are
          unaffected.
        </p>
        {error && <Notice type="error">{error}</Notice>}
        {result && (
          <Notice type={result.status === "successful" ? "success" : "info"}>
            {result.status === "successful"
              ? "Test payment verified"
              : `Test payment ${result.status}`}{" "}
            · {money(result.amount)}
            <small className="payment-test-reference">{result.reference}</small>
          </Notice>
        )}
        {returned && !returned.transactionId && (
          <Notice>
            {returned.status === "cancelled" || returned.status === "failed"
              ? "Test checkout ended before payment was completed."
              : "Flutterwave returned without a transaction reference."}
          </Notice>
        )}
        {returned?.transactionId &&
          !busy &&
          result?.status !== "successful" && (
            <Button type="button" variant="secondary" onClick={verify}>
              Check test result
            </Button>
          )}
        <fieldset className="payment-test-methods" disabled={busy}>
          <legend>Test payment method</legend>
          {methods.map(([id, label]) => (
            <label key={id} className={method === id ? "selected" : ""}>
              <input
                type="radio"
                name="test-payment-method"
                value={id}
                checked={method === id}
                onChange={() => setMethod(id)}
              />
              <PaymentLogo method={id} decorative />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
        <Button
          type="button"
          busy={busy}
          onClick={() => run({ action: "start", paymentMethod: method })}
        >
          Open Flutterwave test <ArrowUpRight size={16} />
        </Button>
        <details className="payment-test-help">
          <summary>Test payment details</summary>
          <p>
            For Visa, use test card <code>4187 4274 1556 4246</code>, expiry{" "}
            <code>09/32</code>, CVV <code>828</code>, PIN <code>3310</code> and
            OTP <code>12345</code> if prompted.
          </p>
          <p>
            For mobile money, select your network on Flutterwave. Test
            authorisation is automatic.
          </p>
          <a
            className="text-link"
            href="https://developer.flutterwave.com/docs/testing"
            target="_blank"
            rel="noopener noreferrer"
          >
            Flutterwave test credentials <ArrowUpRight size={15} />
          </a>
        </details>
      </div>
    </section>
  )
}
