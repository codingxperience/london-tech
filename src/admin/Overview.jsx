import React, { useMemo, useRef, useState, useId } from "react"
import {
  ArrowDownToLine,
  ArrowRight,
  Box,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Users,
  WalletCards,
} from "lucide-react"
import { money, productPath } from "../data/catalog.js"
import { downloadCsv } from "../lib/api.js"
import {
  bestSellers,
  destinations,
  salesSeries,
} from "../lib/admin-insights.js"
import { IconButton } from "../components/ui.jsx"

const tones = ["#7773df", "#18a58e", "#efbe22"]
const compact = (value) =>
  new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
function smooth(points) {
  return points
    .map(([x, y], i) =>
      i
        ? `C${(points[i - 1][0] + x) / 2},${points[i - 1][1]} ${(points[i - 1][0] + x) / 2},${y} ${x},${y}`
        : `M${x},${y}`,
    )
    .join(" ")
}

function Plot({ series, grouped = false, multiple = false, locale = "en-UG" }) {
  const gradient = useId()
  const format = (n) =>
    new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n)
  const fields = grouped
    ? ["paid", "pending", "orders"]
    : multiple
      ? ["sales", "total"]
      : ["sales"]
  const max = Math.max(1, ...series.flatMap((p) => fields.map((k) => p[k])))
  const points = (field) =>
    series.map((p, i) => [
      (i * 590) / Math.max(series.length - 1, 1) + 5,
      190 - (p[field] / max) * 170,
    ])
  return (
    <div className="workspace-plot">
      <div className="plot-y-axis">
        {[max, max * 0.75, max * 0.5, max * 0.25, 0].map((n, i) => (
          <span key={i}>{format(n)}</span>
        ))}
      </div>
      <div className="plot-canvas">
        <svg
          viewBox="0 0 600 205"
          role="img"
          aria-label={
            grouped
              ? "Paid, pending and total order counts by period"
              : "Sales in Ugandan shillings by period"
          }
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tones[0]} stopOpacity=".24" />
              <stop offset="100%" stopColor={tones[0]} stopOpacity=".015" />
            </linearGradient>
          </defs>
          {[20, 62, 105, 147, 190].map((y) => (
            <line
              key={y}
              x1="0"
              x2="600"
              y1={y}
              y2={y}
              stroke="#e7e9f1"
              strokeDasharray="4 5"
            />
          ))}
          {grouped
            ? series.map((p, i) =>
                fields.map((field, j) => {
                  const w = 600 / series.length
                  return (
                    <rect
                      key={field + i}
                      x={i * w + w * 0.12 + j * w * 0.25}
                      y={190 - (p[field] / max) * 170}
                      width={w * 0.18}
                      height={Math.max((p[field] / max) * 170, 1)}
                      fill={tones[j]}
                      rx="1"
                    >
                      <title>{`${p.label}: ${field} ${p[field]}`}</title>
                    </rect>
                  )
                }),
              )
            : fields.map((field, i) => (
                <g key={field}>
                  {!multiple && (
                    <path
                      d={smooth(points(field)) + " L595,190 L5,190 Z"}
                      fill={`url(#${gradient})`}
                    />
                  )}
                  <path
                    d={smooth(points(field))}
                    fill="none"
                    stroke={tones[i]}
                    strokeWidth="3.5"
                    vectorEffect="non-scaling-stroke"
                  />
                  {series.map((p, j) => (
                    <circle
                      key={j}
                      cx={points(field)[j][0]}
                      cy={points(field)[j][1]}
                      r="4"
                      fill={tones[i]}
                      opacity="0"
                    >
                      <title>{`${p.label}: ${money(p[field])}`}</title>
                    </circle>
                  ))}
                </g>
              ))}
        </svg>
        <div className="plot-x-axis">
          {series
            .filter(
              (_, i) =>
                i === 0 ||
                i === series.length - 1 ||
                i % Math.ceil(series.length / 6) === 0,
            )
            .map((p) => (
              <span key={p.key}>{p.label}</span>
            ))}
        </div>
      </div>
    </div>
  )
}

function Ring({ value, total, color }) {
  const progress = total ? (value / total) * 100 : 0
  return (
    <div className="workspace-ring">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="#edf0f5"
          strokeWidth="6"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={color}
          strokeWidth="6"
          pathLength="100"
          strokeDasharray={`${progress} 100`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <strong>
        {value}
        <small>/{total}</small>
      </strong>
    </div>
  )
}

export function Overview({
  data,
  base,
  onOrder,
  OrdersTable,
  locale = "en-UG",
}) {
  const [period, setPeriod] = useState("year"),
    [showData, setShowData] = useState(false)
  const rail = useRef(null),
    series = useMemo(
      () => salesSeries(data.orders, period),
      [data.orders, period],
    )
  const paid = data.orders.filter((o) => o.paymentStatus === "paid"),
    sales = paid.reduce((n, o) => n + (o.amount || 0), 0)
  const low = data.products.filter(
    (p) => p.stock !== null && p.stock < 5,
  ).length
  const stocked = data.products.filter((p) => p.active && p.stock > 0).length,
    completed = paid.filter((o) => o.status === "completed").length
  const top = bestSellers(data.products, data.orders),
    places = destinations(data.orders)
  const exportData = () =>
    downloadCsv("london-tech-sales.csv", [
      [
        "Period",
        "Verified sales UGX",
        "Order value UGX",
        "Orders",
        "Paid orders",
      ],
      ...series.map((s) => [s.label, s.sales, s.total, s.orders, s.paid]),
    ])
  return (
    <>
      <div className="admin-metrics">
        {[
          [
            "Total sales",
            money(sales),
            WalletCards,
            "Verified payments",
            base + "invoices/",
            "teal",
          ],
          [
            "Total orders",
            data.orders.length,
            ShoppingBag,
            "View all orders",
            base + "orders/",
            "red",
          ],
          [
            "Customers",
            data.customers.length,
            Users,
            "Registered accounts",
            base + "customers/",
            "violet",
          ],
          [
            "Low-stock products",
            low,
            Box,
            "Review inventory",
            base + "inventory/?status=low",
            "amber",
          ],
        ].map(([title, value, Icon, note, href, tone]) => (
          <a className="admin-panel workspace-metric" href={href} key={title}>
            <span className={`metric-float ${tone}`}>
              <Icon size={22} />
            </span>
            <span>{title}</span>
            <strong>
              {typeof value === "number"
                ? new Intl.NumberFormat(locale).format(value)
                : value}
            </strong>
            <small>
              {note}
              <ArrowRight size={13} />
            </small>
          </a>
        ))}
      </div>
      <div className="workspace-chart-grid">
        <div className="workspace-sales-column">
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <h2>Total sales</h2>
              <div className="chart-period-buttons" aria-label="Sales period">
                {[
                  ["week", "7 days"],
                  ["month", "Monthly"],
                  ["year", "Yearly"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    aria-pressed={period === id}
                    className={period === id ? "selected" : ""}
                    onClick={() => setPeriod(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <Plot locale={locale} series={series} />
            <div className="chart-footer">
              <button onClick={() => setShowData(!showData)}>
                {showData ? "Hide" : "View"} chart data
              </button>
              <button onClick={exportData}>
                <ArrowDownToLine size={14} />
                Export
              </button>
            </div>
          </section>
          <div className="workspace-mini-grid">
            <a
              href={base + "inventory/"}
              className="admin-panel workspace-mini"
            >
              <div>
                <span>Stock availability</span>
                <strong>{stocked} available</strong>
                <small>Published products with stock</small>
              </div>
              <Ring
                value={stocked}
                total={data.products.length}
                color={tones[2]}
              />
            </a>
            <a href={base + "orders/"} className="admin-panel workspace-mini">
              <div>
                <span>Completed orders</span>
                <strong>{completed} delivered</strong>
                <small>Of all paid orders</small>
              </div>
              <Ring value={completed} total={paid.length} color={tones[1]} />
            </a>
          </div>
        </div>
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Order statistics</h2>
            <span className="admin-muted">Same selected period</span>
          </div>
          <div className="workspace-legend">
            {[
              ["Paid", tones[0], series.reduce((n, s) => n + s.paid, 0)],
              ["Pending", tones[1], series.reduce((n, s) => n + s.pending, 0)],
              [
                "All orders",
                tones[2],
                series.reduce((n, s) => n + s.orders, 0),
              ],
            ].map(([label, color, value]) => (
              <span key={label}>
                <i style={{ background: color }} />
                {label}
                <strong>{value}</strong>
              </span>
            ))}
          </div>
          <Plot locale={locale} series={series} grouped />
          <p className="chart-note">
            Order counts. Cancelled orders remain in the total.
          </p>
        </section>
      </div>
      {showData && (
        <section className="admin-panel admin-table-scroll">
          <table className="admin-table">
            <caption>Sales data · by order date · UGX</caption>
            <thead>
              <tr>
                <th>Period</th>
                <th>Verified sales</th>
                <th>Order value</th>
                <th>Paid / total</th>
              </tr>
            </thead>
            <tbody>
              {series.map((s) => (
                <tr key={s.key}>
                  <td>{s.label}</td>
                  <td>{money(s.sales)}</td>
                  <td>{money(s.total)}</td>
                  <td>
                    {s.paid} / {s.orders}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      <section className="admin-panel recent-orders-panel">
        <div className="admin-panel-heading">
          <h2>Recent orders</h2>
          <a className="admin-text-link" href={base + "orders/"}>
            View all orders <ArrowRight size={15} />
          </a>
        </div>
        <OrdersTable orders={data.orders.slice(0, 6)} onOrder={onOrder} />
      </section>
      <div className="workspace-chart-grid workspace-bottom-charts">
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Revenue</h2>
            <span className="admin-muted">UGX · by order date</span>
          </div>
          <div className="workspace-legend">
            <span>
              <i style={{ background: tones[0] }} />
              Verified sales
            </span>
            <span>
              <i style={{ background: tones[1] }} />
              All order value
            </span>
          </div>
          <Plot locale={locale} series={series} multiple />
        </section>
        <section className="admin-panel workspace-destinations">
          <div className="admin-panel-heading">
            <h2>Sales by destination</h2>
            <span className="admin-muted">Uganda</span>
          </div>
          <img
            src="/assets/admin/world.svg"
            alt="World map with Uganda highlighted"
            width="600"
            height="275"
          />
          {places.length ? (
            <div className="destination-list">
              {places.slice(0, 4).map(([name, value]) => (
                <div key={name}>
                  <span>{name}</span>
                  <strong>{money(value)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="admin-empty-copy">
              Destinations appear after verified sales.
            </p>
          )}
        </section>
      </div>
      <section className="admin-panel workspace-best-sellers">
        <div className="admin-panel-heading">
          <h2>Top products</h2>
          <div>
            <IconButton
              label="Previous products"
              onClick={() =>
                rail.current?.scrollBy({ left: -340, behavior: "smooth" })
              }
            >
              <ChevronLeft size={19} />
            </IconButton>
            <IconButton
              label="Next products"
              onClick={() =>
                rail.current?.scrollBy({ left: 340, behavior: "smooth" })
              }
            >
              <ChevronRight size={19} />
            </IconButton>
          </div>
        </div>
        <div className="workspace-product-rail" ref={rail}>
          {top.map((p) => (
            <a
              href={productPath(p)}
              key={p.id}
              target="_blank"
              rel="noreferrer"
            >
              <div>
                <img src={p.image} alt="" loading="lazy" />
              </div>
              <h3>{p.name}</h3>
              <strong>{money(p.price)}</strong>
              <small>
                {p.units} sold{" "}
                <span>
                  {p.stock == null
                    ? "Stock unconfirmed"
                    : `${p.stock} in stock`}
                </span>
              </small>
            </a>
          ))}
        </div>
      </section>
    </>
  )
}
