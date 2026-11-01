import React, { useState } from "react"
import { Activity, Download } from "lucide-react"
import { downloadCsv } from "../lib/api.js"

export function VisitorPanel({ analytics, locale = "en-UG" }) {
  const [days, setDays] = useState(7)
  const daily = analytics?.daily || [],
    rows = daily.slice(-days),
    max = Math.max(1, ...rows.map((d) => d.visitors || 0))
  const format = (n) =>
    n === null || n === undefined
      ? "—"
      : new Intl.NumberFormat(locale).format(n)
  return (
    <section className="admin-panel visitor-panel" id="visitor-analytics">
      <div className="admin-panel-heading">
        <div>
          <h2>Daily visitors</h2>
          <p>
            Distinct browsers per day · Kampala time. Repeated visits count
            once; identified bots and signed-in administrators are excluded.
          </p>
        </div>
        <Activity size={21} />
      </div>
      {!analytics?.available ? (
        <p className="workspace-inline-notice admin-muted">
          Visitor measurement starts when the store database is connected. No
          visitor total has been estimated.
        </p>
      ) : (
        <>
          <div className="visitor-summary">
            <div>
              <span>Today</span>
              <strong>{format(analytics.today)}</strong>
            </div>
            <div>
              <span>Yesterday</span>
              <strong>{format(analytics.yesterday)}</strong>
            </div>
            <div className="chart-period-buttons" aria-label="Visitor period">
              {[7, 30].map((n) => (
                <button
                  key={n}
                  aria-pressed={days === n}
                  className={days === n ? "selected" : ""}
                  onClick={() => setDays(n)}
                >
                  {n} days
                </button>
              ))}
            </div>
          </div>
          <div className="visitor-bars" aria-hidden="true">
            {rows.map((d, i) => (
              <div
                key={d.date}
                className={d.visitors === null ? "not-recorded" : ""}
                title={`${d.date}: ${
                  d.visitors === null
                    ? "not recorded"
                    : format(d.visitors) + " visitors"
                }`}
              >
                <span
                  style={{
                    height:
                      d.visitors === null
                        ? "2px"
                        : `${Math.max(2, (d.visitors / max) * 100)}%`,
                  }}
                />
                <small>
                  {i === 0 ||
                  i === rows.length - 1 ||
                  i === Math.floor(rows.length / 2)
                    ? new Date(d.date + "T12:00:00Z").toLocaleDateString(
                        locale,
                        {
                          day: "numeric",
                          month: "short",
                          timeZone: "Africa/Kampala",
                        },
                      )
                    : ""}
                </small>
              </div>
            ))}
          </div>
          <div className="chart-footer">
            <details>
              <summary>View visitor data</summary>
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <caption>Daily browser visits · Africa/Kampala</caption>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Visitors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((d) => (
                      <tr key={d.date}>
                        <td>{d.date}</td>
                        <td>
                          {d.visitors === null
                            ? "Not recorded"
                            : format(d.visitors)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <button
              onClick={() =>
                downloadCsv("london-tech-visitors.csv", [
                  ["Date", "Distinct browsers", "Time zone"],
                  ...rows.map((d) => [
                    d.date,
                    d.visitors === null ? "Not recorded" : d.visitors,
                    "Africa/Kampala",
                  ]),
                ])
              }
            >
              <Download size={14} />
              Export
            </button>
          </div>
          <p className="chart-note">
            {analytics.preview
              ? "Illustrative visitor records in the local preview."
              : analytics.startedAt
                ? `Measurement started ${new Date(analytics.startedAt).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Kampala" })}. Earlier days are marked “Not recorded”.`
                : ""}{" "}
            Browser privacy preferences and blocked requests can reduce the
            measured total.
          </p>
        </>
      )}
    </section>
  )
}
