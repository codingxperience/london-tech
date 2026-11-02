import React, { useState } from "react"
import {
  deliveryDistricts,
  deliveryRateSettings,
  calculateDelivery,
} from "../lib/delivery.js"
import { money } from "../data/catalog.js"
import { Field } from "../components/ui.jsx"

export function DeliverySettings({ settings, onChange }) {
  const rates = deliveryRateSettings(settings),
    [district, setDistrict] = useState("UG1008")
  const update = (key, value) =>
    onChange("deliveryPricing", { ...rates, [key]: value })
  const override = rates.overrides.find((o) => o.districtId === district) || {
    districtId: district,
    distanceKm: null,
    fee: null,
  }
  const updateOverride = (key, value) =>
    update(
      "overrides",
      [
        ...rates.overrides.filter((o) => o.districtId !== district),
        { ...override, [key]: value },
      ].filter((o) => o.distanceKm != null || o.fee != null),
    )
  const example = calculateDelivery(
    { ...settings, deliveryPricing: rates },
    district,
  )
  return (
    <section className="delivery-settings">
      <h3>Delivery pricing</h3>
      <p className="admin-muted">
        Free store collection. Set nationwide delivery rates below; each order
        keeps the price accepted at checkout.
      </p>
      <Field label="Pricing method">
        <select
          value={rates.mode}
          onChange={(e) => update("mode", e.target.value)}
        >
          <option value="distance">Distance-based estimate</option>
          <option value="flat">Flat delivery fee</option>
        </select>
      </Field>
      {rates.mode === "flat" ? (
        <Field
          label="Flat delivery fee (UGX)"
          type="number"
          min="0"
          max="10000000"
          required
          value={settings.deliveryFee ?? ""}
          onChange={(e) =>
            onChange(
              "deliveryFee",
              e.target.value === "" ? null : Number(e.target.value),
            )
          }
        />
      ) : (
        <>
          <div className="form-grid">
            {[
              ["baseFee", "Base fee (UGX)", 0, 10000000],
              ["perKm", "Per kilometre (UGX)", 0, 100000],
              ["minimumFee", "Minimum delivery fee (UGX)", 0, 10000000],
              ["maximumFee", "Maximum delivery fee (UGX)", 0, 10000000],
              ["rounding", "Round up to (UGX)", 1, 10000],
              ["distanceMultiplier", "Road distance allowance", 1, 3],
            ].map(([key, label, min, max]) => (
              <Field
                key={key}
                label={label}
                type="number"
                required
                min={min}
                max={max}
                step={key === "distanceMultiplier" ? "any" : "1"}
                value={rates[key]}
                onChange={(e) => update(key, Number(e.target.value))}
              />
            ))}
          </div>
          <details className="delivery-overrides">
            <summary>District overrides and price preview</summary>
            <p className="admin-muted">
              Estimates use district centres from UBOS/UNOSAT, with the road
              allowance above. Set a known distance or a fixed fee for an
              individual district.
            </p>
            <Field label="District">
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              >
                {deliveryDistricts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="form-grid">
              <Field
                label="Distance override (km)"
                type="number"
                min="0"
                max="2000"
                step="any"
                placeholder="Use calculated distance"
                value={override.distanceKm ?? ""}
                onChange={(e) =>
                  updateOverride(
                    "distanceKm",
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
              />
              <Field
                label="Fixed fee override (UGX)"
                type="number"
                min="0"
                max="10000000"
                placeholder="Use distance pricing"
                value={override.fee ?? ""}
                onChange={(e) =>
                  updateOverride(
                    "fee",
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
              />
            </div>
            <p className="delivery-price-preview">
              {example.distanceKm} km estimated ·{" "}
              <strong>{money(example.fee)}</strong>
            </p>
          </details>
        </>
      )}
    </section>
  )
}
