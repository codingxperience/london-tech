import { products, storeDefaults } from "../data/catalog.js"
export const previewKey = "lt.admin.preview.v4"
export const preferenceDefaults = {
  theme: "light",
  locale: "en-UG",
  timeZone: "Africa/Kampala",
  pageSize: 12,
}
export function previewData(now = new Date()) {
  const customers = Array.from({ length: 6 }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    name: `Preview customer ${i + 1}`,
    email: `customer${i + 1}@example.com`,
    phone: "Preview record",
    created_at: new Date(now.getTime() - i * 86400000 * 12).toISOString(),
    orders: 6,
  }))
  const vendorId = "10000000-0000-4000-8000-000000000001"
  const orders = Array.from({ length: 36 }, (_, i) => {
    const product = products[(i * 3) % products.length],
      quantity = (i % 3) + 1
    return {
      id: `PREVIEW-${String(1036 - i)}`,
      status: [
        "completed",
        "processing",
        "ready",
        "shipped",
        "completed",
        "quote_requested",
        "pending_payment",
        "completed",
      ][i % 8],
      paymentStatus: [5, 6].includes(i % 8) ? "unpaid" : "paid",
      amount: product.price * quantity,
      currency: "UGX",
      items: [{ ...product, quantity, unitPrice: product.price }],
      customer: {
        ...customers[i % 6],
        district: ["Kampala", "Wakiso", "Arua"][i % 3],
        address: "Preview address",
      },
      fulfillment: i % 2 ? "delivery" : "collection",
      paymentMethod: ["mtn", "visa", "airtel"][i % 3],
      createdAt: new Date(now.getTime() - i * 9 * 86400000).toISOString(),
      timeline: [],
    }
  })
  return {
    version: 4,
    products: products.map((p, i) => ({
      ...p,
      vendorId: i < 8 ? vendorId : "",
    })),
    orders,
    customers,
    vendors: [
      {
        id: vendorId,
        name: "Preview supply partner",
        contact: "Preview contact",
        email: "supplier@example.com",
        phone: "",
        address: "Sample supplier address",
        notes: "Illustrative vendor for testing the workspace.",
        status: "active",
        updatedAt: now.toISOString(),
      },
    ],
    pages: [],
    messages: [],
    wishlists: [
      {
        user_id: customers[0].id,
        name: customers[0].name,
        email: customers[0].email,
        product_ids: products.slice(0, 4).map((p) => p.id),
      },
    ],
    events: [
      {
        id: "preview-event",
        action: "workspace.preview",
        details: { id: "Local browser workspace" },
        created_at: now.toISOString(),
      },
    ],
    settings: storeDefaults,
    connection: { database: false, payments: false, email: false },
  }
}
