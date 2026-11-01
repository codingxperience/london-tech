import { ContactPage } from "../components/ContactPage.jsx"
import React from "react"

import {
  ArrowRight,
  ArrowUpRight,
  Phone,
  ShieldCheck,
  Truck,
  PackageCheck,
} from "lucide-react"

import { useStore } from "../store.jsx"

import { ActionLink, Breadcrumb, PageHeading } from "../components/ui.jsx"

export function Info({ page }) {
  const { settings } = useStore()

  if (page === "contact" || page === "visit") return <ContactPage />

  if (page === "about")
    return (
      <main className="container standard-page">
        <Breadcrumb items={[{ label: "About us" }]} />
        <section className="about-hero">
          <div>
            <p className="eyebrow">ABOUT LONDON TECH</p>
            <h1>
              For your everyday.
              <br />
              For what’s <span>next.</span>
            </h1>
            <p>{settings.about}</p>
            <ActionLink href="/collections/shop/">Find your next</ActionLink>
          </div>
          <div className="about-logo">
            <img
              src="/assets/london-tech-logo.png"
              width="360"
              height="360"
              alt="London Tech — London Technology Store"
            />
          </div>
        </section>
        <div className="about-values">
          <article>
            <span>01</span>
            <h2>A thoughtful collection.</h2>
            <p>
              From your first everyday smartphone to the tools for your next big
              idea, explore technology across work, entertainment and everyday
              essentials.
            </p>
          </article>
          <article>
            <span>02</span>
            <h2>The details matter.</h2>
            <p>
              Clear product information, useful comparisons and a place to save
              your favourites help you take a closer look before you choose.
            </p>
          </article>
          <article>
            <span>03</span>
            <h2>A store you can reach.</h2>
            <p>
              Visit us at {settings.address}, or call us with your questions.
              We’re here to help you confirm the details.
            </p>
          </article>
        </div>
        <div className="collection-band">
          <div>
            <p className="eyebrow">LET’S MAKE IT PERSONAL</p>
            <h2>Your next, right here.</h2>
          </div>
          <ActionLink href="/contact/" className="light">
            Find the store
          </ActionLink>
        </div>
      </main>
    )

  const content = {
    delivery: {
      eyebrow: "FROM THE STORE TO YOUR DAY",
      title: "Delivery & collection.",
      intro: settings.delivery,
      sections: [
        [
          "Store collection",
          `Arrange collection from ${settings.address}. Keep your order reference ready and call the store to confirm when your items are ready. Payment confirmation alone does not mean an item is ready for collection.`,
        ],
        [
          "Delivery arrangements",
          "Enter your district, address, phone number and useful directions at checkout. If a delivery fee is not listed, request confirmation and the store will confirm the delivery charge and timing before you pay.",
        ],
        [
          "Following your order",
          "Sign in to your account to see whether your order is confirmed, processing, ready, shipped or completed. Call the store with your order reference if you need an update.",
        ],
      ],
    },

    returns: {
      eyebrow: "HERE TO HELP",
      title: "Returns & warranty.",
      intro: settings.returns,
      sections: [
        [
          "Before purchase",
          "Check the selected model, condition, colour, configuration, included accessories and warranty details on the product page. If anything is unclear, call the store before paying.",
        ],
        [
          "If something needs attention",
          "Contact the store with your order reference, product name and a description of the issue. Keep the packaging and any included accessories until the store confirms the next steps.",
        ],
        [
          "Warranty information",
          "Any warranty depends on the specific product and confirmed sale terms. Manufacturer coverage and store services are not assumed. Ask the store to confirm eligibility, duration and the service process for your item.",
        ],
      ],
    },

    privacy: {
      eyebrow: "YOUR INFORMATION",
      title: "Privacy, made clearer.",
      intro:
        "This page explains the information used by the London Tech store and your account.",
      sections: [
        [
          "Your account and orders",
          "We use the name, email, phone number and addresses you provide to manage your account, respond to requests, arrange fulfillment and keep your order history. Customer information is available only to authorized store administrators.",
        ],
        [
          "Payments",
          "Flutterwave handles payment authorization on its hosted checkout. London Tech does not collect or store your full card number, CVV, card PIN or mobile money PIN. The store records the payment reference, verified status, currency and amount for your order.",
        ],
        [
          "On this device",
          "Your cart, wishlist, comparison list and recently viewed products are stored in your browser. A secure session cookie keeps you signed in. You can clear browser storage or sign out using your account menu.",
        ],
        [
          "Your choices",
          "Update your profile and saved addresses in your account. Contact the store to ask about your account information, correction or deletion. Order records may need to be retained for operating and recordkeeping requirements.",
        ],
      ],
    },

    terms: {
      eyebrow: "BEFORE YOU CHOOSE",
      title: "Shopping information & terms.",
      intro:
        "Please review the product and final order details before completing a payment.",
      sections: [
        [
          "Product details and guide prices",
          "Draft guide prices are estimates requested for this catalogue and are labelled accordingly. They are subject to confirmation of the exact model, condition, capacity and current stock. A guide price is not a confirmed offer. Only confirmed prices and inventory can be used for online payment.",
        ],
        [
          "Requests and orders",
          "Submitting a confirmation request does not charge you. The store confirms the configuration, price, availability and fulfillment arrangements. A paid order is marked paid only after the server verifies the transaction with Flutterwave.",
        ],
        [
          "Delivery, collection and returns",
          "The final delivery charge and available collection arrangements are confirmed before payment. Review the delivery and returns pages and any specific product terms. Contact the store promptly with your order reference if you need help.",
        ],
        [
          "Your account",
          "Use accurate contact information and keep your password private. Do not share verification codes, payment PINs or reset links. You can change your password and sign out in your account.",
        ],
      ],
    },
  }[page]

  if (page === "help")
    return (
      <main className="container info-page">
        <Breadcrumb items={[{ label: "Help" }]} />
        <PageHeading
          eyebrow="A LITTLE CLARITY"
          title="Good questions. Clear answers."
        >
          A few things that help make your next choice easier.
        </PageHeading>
        <div className="faq-list">
          {[
            [
              "How do I find a product?",
              "Browse the categories, use search, or filter a collection by brand, price and confirmed availability. You can compare up to four products side by side.",
            ],
            [
              "Are guide prices final?",
              "Guide prices are estimates until the store confirms the selected configuration, condition and current price. Unconfirmed items can be requested through checkout without paying.",
            ],
            [
              "How do I pay?",
              "For confirmed items with available stock, select MTN Mobile Money, Airtel Money or Visa / card. You complete authorization on Flutterwave. The store verifies the payment before marking your order paid.",
            ],
            [
              "Do I need an account?",
              "You can browse, compare and keep a cart without signing in. An account is needed to submit an order or confirmation request and to follow its status.",
            ],
            [
              "Can I collect from the store?",
              settings.address +
                " — call " +
                settings.phone +
                " to confirm opening hours and collection readiness.",
            ],
            [
              "What happens if a payment is pending?",
              "A pending payment is not a paid order. Check your order page and call the store if you need help. Do not share your mobile money PIN or card verification information.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <span>+</span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
        <ActionLink href="/contact/">Still have a question?</ActionLink>
      </main>
    )

  return (
    <main className="container info-page">
      <Breadcrumb items={[{ label: content?.title || "Information" }]} />
      <PageHeading eyebrow={content?.eyebrow} title={content?.title}>
        {content?.intro}
      </PageHeading>
      <div className="policy-content">
        {content?.sections.map(([title, text]) => (
          <section key={title}>
            <h2>{title}</h2>
            <p>{text}</p>
          </section>
        ))}
        <section>
          <h2>Talk to London Tech.</h2>
          <p>{settings.address}</p>
          <a className="text-link" href={phoneLink(settings.phone)}>
            <Phone size={15} />
            {settings.phone}
          </a>
        </section>
      </div>
    </main>
  )
}
