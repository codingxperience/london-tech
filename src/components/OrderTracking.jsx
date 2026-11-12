import React, { useState } from "react"
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  MapPin,
  Package,
  PackageCheck,
  RefreshCw,
  Store,
  Truck,
} from "lucide-react"
import { statusLabel } from "../lib/api.js"
import { useLocale } from "../lib/locale.jsx"

const kampala = "Africa/Kampala"
const statuses = {
  pending_payment: "Awaiting payment",
  quote_requested: "Request received",
  quoted: "Quote ready",
  review: "Under review",
  ready: "Ready for dispatch",
}

function CopyReference({ value, label }) {
  const { t } = useLocale()
  const [result, setResult] = useState("")
  return (
    <button
      className="tracking-copy"
      type="button"
      aria-label={t("Copy {label}", { label: t(label) })}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setResult(t("Copied"))
        } catch {
          setResult(t("Select to copy"))
        }
      }}
    >
      {result === "Copied" ? (
        <Check size={15} aria-hidden="true" />
      ) : (
        <Copy size={15} aria-hidden="true" />
      )}
      <span aria-live="polite">{result || t("Copy")}</span>
    </button>
  )
}

export function OrderTracking({ order, refreshing, refresh }) {
  const { t, language } = useLocale()
  const eventTime = new Intl.DateTimeFormat(language === "ar" ? "ar-UG" : "en-UG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: kampala,
  })
  const dayLabel = new Intl.DateTimeFormat(language === "ar" ? "ar-UG" : "en-UG", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: kampala,
  })
  const pickup = order.fulfillment === "collection"
  const mode = t(pickup ? "Store pickup" : "Delivery")
  const stages = [
    ["confirmed", t("Confirmed"), Check],
    ["processing", t("Preparing"), Package],
    ...(pickup
      ? [["ready", t("Ready for pickup"), Store]]
      : [["shipped", t("Dispatched"), Truck]]),
    ["completed", t(pickup ? "Collected" : "Delivered"), PackageCheck],
  ]
  const timeline = order.timeline || []
  const history = [...timeline].reverse()
  const labels = Object.fromEntries(stages.map(([key, label]) => [key, label]))
  const statusTitle = (status) =>
    labels[status] || t(statuses[status] || statusLabel(status))
  const expired =
    ["pending_payment", "quoted"].includes(order.status) &&
    order.expiresAt &&
    new Date(order.expiresAt) <= new Date()
  const displayStatus = expired
    ? order.status === "quoted"
      ? t("Quote expired")
      : t("Payment window expired")
    : statusTitle(order.status)
  const active =
    !expired && !["cancelled", "review", "expired"].includes(order.status)
  const tracking = order.tracking || {}
  const estimated =
    !pickup && active && order.status !== "completed" && tracking.estimatedDate
  const latest = history[0]?.at || order.updatedAt || order.createdAt
  const hasCourier =
    !pickup &&
    [tracking.carrier, tracking.reference, tracking.url].some(Boolean)
  const itemCount = (order.items || []).reduce(
    (sum, item) => sum + item.quantity,
    0,
  )
  const ModeIcon = pickup ? Store : Truck

  return (
    <section className="tracking-card" aria-labelledby="tracking-title">
      <div className="tracking-hero">
        <span className="tracking-kicker">
          <ModeIcon size={15} aria-hidden="true" />
          {mode}
        </span>
        <div className="tracking-hero-main">
          <div aria-live="polite">
            <h3 id="tracking-title">{displayStatus}</h3>
            {!pickup && order.customer?.district && (
              <p className="tracking-destination">
                <MapPin size={16} aria-hidden="true" />
                {order.customer.district}
              </p>
            )}
            {pickup && (
              <p className="tracking-destination">
                <MapPin size={16} aria-hidden="true" />
          {t("London Tech · Arua Park")}
              </p>
            )}
          </div>
        </div>
        {estimated && (
          <div className="tracking-time-panel">
            <CalendarDays size={18} aria-hidden="true" />
            <div>
              <span>{t("Estimated delivery")}</span>
              <strong>
                {dayLabel.format(new Date(`${estimated}T12:00:00Z`))}
              </strong>
            </div>
          </div>
        )}
        <div className="tracking-update">
          <span aria-live="polite">
            {refreshing
              ? t("Checking for updates…")
              : latest && (
                  <>
                    {t("Last update")}{" "}
                    <time dateTime={latest}>
                      {eventTime.format(new Date(latest))} EAT
                    </time>
                  </>
                )}
          </span>
          <button
            className="tracking-refresh"
            type="button"
            aria-label={t("Check for tracking updates")}
            title={t("Check for tracking updates")}
            disabled={refreshing}
            onClick={refresh}
          >
            <RefreshCw size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="tracking-body">
        <div className="tracking-reference-row">
          <div>
            <span>{t("Order reference")}</span>
            <strong>{order.id}</strong>
          </div>
          <CopyReference
            key={order.id}
            value={order.id}
            label="order reference"
          />
          {itemCount > 0 && (
            <span className="tracking-item-count">
              {t(itemCount === 1 ? "{count} item" : "{count} items", { count: itemCount })}
            </span>
          )}
        </div>
        {active && (
        <ol className="tracking-stages" aria-label={t("Order milestones")}>
            {stages.map(([key, label, Icon]) => {
              const recorded = timeline.find(
                (event) =>
                  event.status === key &&
                  !["tracking", "note"].includes(event.kind) &&
                  (event.kind !== "payment" || key === "confirmed"),
              )
              const current =
                order.status === key ||
                (key === "processing" && !pickup && order.status === "ready")
              const StepIcon = recorded && !current ? Check : Icon
              return (
                <li
                  key={key}
                  className={current ? "current" : recorded ? "recorded" : ""}
                  aria-current={current ? "step" : undefined}
                >
                  <span className="tracking-stage-icon">
                    <StepIcon size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{label}</strong>
                    {recorded && (
                      <time dateTime={recorded.at}>
                        {dayLabel.format(new Date(recorded.at))}
                      </time>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
        {hasCourier && (
          <div className="tracking-courier">
            <dl>
              {tracking.carrier && (
                <div>
                  <dt>{t("Courier")}</dt>
                  <dd>{tracking.carrier}</dd>
                </div>
              )}
              {tracking.reference && (
                <div>
                  <dt>{t("Tracking reference")}</dt>
                  <dd>{tracking.reference}</dd>
                </div>
              )}
            </dl>
            <div className="tracking-courier-actions">
              {tracking.reference && (
                <CopyReference
                  key={tracking.reference}
                  value={tracking.reference}
                  label="courier reference"
                />
              )}
              {tracking.url && (
                <a
                  className="text-link"
                  href={tracking.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("Track with courier")}{" "}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        )}
        {history.length > 0 && (
          <details className="tracking-history">
            <summary>
              <Clock3 size={18} aria-hidden="true" />
              <span>{t("Activity history")}</span>
              <span className="tracking-history-count">{history.length}</span>
              <ChevronDown size={17} aria-hidden="true" />
            </summary>
            <ol>
              {history.map((event, i) => (
                <li key={`${event.at}-${i}`}>
                  <div>
                    <strong>
                      {event.kind === "payment"
                        ? t("Payment received")
                        : event.kind === "tracking"
                          ? t("Delivery details updated")
                          : event.kind === "note"
                            ? t("Store update")
                            : statusTitle(event.status)}
                    </strong>
                    <time dateTime={event.at}>
                      {eventTime.format(new Date(event.at))} EAT
                    </time>
                  </div>
                  {event.note && <p>{event.note}</p>}
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </section>
  )
}
