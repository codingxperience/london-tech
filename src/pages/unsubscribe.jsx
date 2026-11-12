import React, { useState } from "react"
import { MailCheck, MailMinus } from "lucide-react"
import { api } from "../lib/api.js"
import { Button, Notice, ActionLink } from "../components/ui.jsx"
import { BrandWordmark } from "../components/BrandWordmark.jsx"
import { useLocale } from "../lib/locale.jsx"

export function Unsubscribe({ token }) {
  const { t } = useLocale()
  const [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState("")
  const valid = /^[a-f0-9]{64}$/.test(token || "")
  return (
    <main className="container standard-page subscription-page">
      <section>
        <BrandWordmark width={180} />
        {done ? <MailCheck size={36} /> : <MailMinus size={36} />}
        <h1>{t(done ? "You’re unsubscribed." : "Your inbox, your choice.")}</h1>
        <p>
          {done
            ? t("You will no longer receive London Tech marketing updates for this subscription.")
            : valid
              ? t("Unsubscribe from London Tech product news and offers. Your store account and order updates will stay the same.")
              : t("Open the manage-subscription link provided when you subscribed to update your preference.")}
        </p>
        {error && <Notice type="error">{error}</Notice>}
        {valid && !done && (
          <Button
            busy={busy}
            onClick={async () => {
              setBusy(true)
              setError("")
              try {
                const result = await api("newsletter/unsubscribe", {
                  method: "POST",
                  body: { token },
                })
                if (!result.unsubscribed)
                  throw new Error(
                    t("Your subscription could not be updated. Please try again."),
                  )
                setDone(true)
              } catch (e) {
                setError(e.message)
              } finally {
                setBusy(false)
              }
            }}
          >
            {t("Unsubscribe")}
          </Button>
        )}
        <ActionLink href="/">{t("Back to the store")}</ActionLink>
      </section>
    </main>
  )
}
