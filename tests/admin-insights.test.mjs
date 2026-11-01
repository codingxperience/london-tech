import { test } from "node:test"
import assert from "node:assert/strict"
import {
  bestSellers,
  destinations,
  salesSeries,
} from "../src/lib/admin-insights.js"

test("dashboard periods group Kampala dates correctly and never treat unpaid orders as revenue", () => {
  const now = new Date("2026-11-01T12:00:00Z")
  const orders = [
    {
      createdAt: "2026-10-31T23:00:00Z",
      paymentStatus: "paid",
      status: "completed",
      amount: 100000,
    },
    {
      createdAt: "2026-11-01T06:00:00Z",
      paymentStatus: "unpaid",
      status: "pending_payment",
      amount: 80000,
    },
    {
      createdAt: "2026-10-28T06:00:00Z",
      paymentStatus: "paid",
      status: "completed",
      amount: 50000,
    },
    {
      createdAt: "2026-11-10T06:00:00Z",
      paymentStatus: "paid",
      status: "completed",
      amount: 900000,
    },
  ]
  const daily = salesSeries(orders, "week", now)
  assert.equal(daily.length, 7)
  assert.equal(daily.at(-1).key, "2026-11-01")
  assert.equal(daily.at(-1).sales, 100000)
  assert.equal(daily.at(-1).total, 180000)
  assert.equal(daily.at(-1).paid, 1)
  assert.equal(daily.at(-1).pending, 1)
  assert.equal(salesSeries(orders, "month", now).length, 30)
  const months = salesSeries(orders, "year", now)
  assert.equal(months.length, 12)
  assert.equal(months.at(-1).sales, 100000)
  assert.equal(months.at(-2).sales, 50000)
  assert.equal(
    salesSeries([], "year", now).every((p) => p.sales === 0),
    true,
  )
})

test("best sellers and destinations derive from verified line quantities and fulfillment details", () => {
  const products = [
    { id: "a", featured: true },
    { id: "b", featured: false },
  ]
  const orders = [
    {
      paymentStatus: "paid",
      amount: 100000,
      fulfillment: "delivery",
      customer: { district: "Kampala" },
      items: [{ id: "b", quantity: 2, unitPrice: 50000 }],
    },
    {
      paymentStatus: "paid",
      amount: 50000,
      fulfillment: "collection",
      customer: { district: "Arua" },
      items: [{ id: "a", quantity: 1, unitPrice: 50000 }],
    },
    {
      paymentStatus: "unpaid",
      amount: 2000000,
      fulfillment: "delivery",
      customer: { district: "Wakiso" },
      items: [{ id: "a", quantity: 9, unitPrice: 50000 }],
    },
  ]
  assert.deepEqual(
    bestSellers(products, orders).map(({ id, units, revenue }) => ({
      id,
      units,
      revenue,
    })),
    [
      { id: "b", units: 2, revenue: 100000 },
      { id: "a", units: 1, revenue: 50000 },
    ],
  )
  assert.deepEqual(destinations(orders), [
    ["Kampala", 100000],
    ["Store collection", 50000],
  ])
  assert.equal(
    products[0].units,
    undefined,
    "The source catalogue is never mutated",
  )
})
