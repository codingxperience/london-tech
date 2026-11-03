import React from "react"
import {
  ArrowUpRight,
  Check,
  Clock3,
  PackageCheck,
  RefreshCw,
  Store,
  Truck,
} from "lucide-react"
import { statusLabel } from "../lib/api.js"

const eventTime = new Intl.DateTimeFormat("en-UG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Kampala",
})
const estimatedDay = new Intl.DateTimeFormat("en-UG", {
  dateStyle: "full",
  timeZone: "Africa/Kampala",
})

export function OrderTracking({ order, refreshing, refresh }) {
  const pickup = order.fulfillment === "collection"
  const stages = [
    ["confirmed", "Confirmed", Check],
    ["processing", "Preparing", PackageCheck],
    [
      pickup ? "ready" : "shipped",
      pickup ? "Ready for pickup" : "Dispatched",
      pickup ? Store : Truck,
    ],
    ["completed", pickup ? "Collected" : "Delivered", PackageCheck],
  ]
  const timeline = order.timeline || []
  const history = [...timeline].reverse()
  const labels = Object.fromEntries(stages.map(([key, label]) => [key, label]))
  const paymentWindowExpired =
    ["pending_payment", "quoted"].includes(order.status) &&
    order.expiresAt &&
    new Date(order.expiresAt) <= new Date()
  const displayStatus = paymentWindowExpired
    ? order.status === "quoted"
      ? "Quote expired"
      : "Payment window expired"
    : labels[order.status] ||
      (order.status === "ready"
        ? "Ready for dispatch"
        : statusLabel(order.status))
  const tracking = order.tracking || {}
  const active =
    !paymentWindowExpired &&
    !["cancelled", "review", "expired"].includes(order.status)
  return (
    <section className="tracking-card" aria-labelledby="tracking-title">
      <div className="tracking-heading">
        <div>
          <span className="tracking-kicker">
            {pickup ? "STORE PICKUP" : "DELIVERY"}
          </span>
          <h3 id="tracking-title">{displayStatus}</h3>
        </div>
        <button
          className="tracking-refresh"
          type="button"
          disabled={refreshing}
          onClick={refresh}
        >
          <RefreshCw size={16} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {active && (
        <ol className="tracking-stages" aria-label="Order milestones">
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
            return (
              <li
                key={key}
                className={current ? "current" : recorded ? "recorded" : ""}
                aria-current={current ? "step" : undefined}
              >
                <span className="tracking-stage-icon">
                  <Icon size={19} aria-hidden="true" />
                </span>
                <strong>{label}</strong>
                {recorded && (
                  <time dateTime={recorded.at}>
                    {eventTime.format(new Date(recorded.at))}
                  </time>
                )}
              </li>
            )
          })}
        </ol>
      )}
      {!pickup &&
        [
          tracking.carrier,
          tracking.reference,
          tracking.estimatedDate,
          tracking.url,
        ].some(Boolean) && (
          <div className="tracking-courier">
            <dl>
              {tracking.carrier && (
                <div>
                  <dt>Courier</dt>
                  <dd>{tracking.carrier}</dd>
                </div>
              )}
              {tracking.reference && (
                <div>
                  <dt>Tracking reference</dt>
                  <dd>{tracking.reference}</dd>
                </div>
              )}
              {tracking.estimatedDate &&
                active &&
                order.status !== "completed" && (
                  <div>
                    <dt>Estimated delivery</dt>
                    <dd>
                      {estimatedDay.format(
                        new Date(`${tracking.estimatedDate}T12:00:00Z`),
                      )}
                    </dd>
                  </div>
                )}
            </dl>
            {tracking.url && (
              <a
                className="text-link"
                href={tracking.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Courier tracking <ArrowUpRight size={15} />
              </a>
            )}
          </div>
        )}
      {history.length > 0 && (
        <details className="tracking-history" open>
          <summary>
            <Clock3 size={17} /> Activity history
          </summary>
          <ol>
            {history.map((event, i) => (
              <li key={`${event.at}-${i}`}>
                <div>
                  <strong>
                    {event.kind === "payment"
                      ? "Payment received"
                      : event.kind === "tracking"
                        ? "Delivery details updated"
                        : event.kind === "note"
                          ? "Store update"
                          : labels[event.status] || statusLabel(event.status)}
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
    </section>
  )
}
