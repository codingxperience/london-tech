import { BrandWordmark } from "./BrandWordmark.jsx"
import React, { useEffect, useId, useState } from "react"
import {
  ArrowUpRight,
  ChevronDown,
  MapPin,
  Phone,
  MessageCircle,
} from "lucide-react"
import { useStore } from "../store.jsx"
import { PaymentMarks } from "./storefront.jsx"
import "../store-footer.css"

const sections = [
  {
    title: "Customer care",
    links: [
      ["Contact & support", "/contact/"],
      ["Track my order", "/account/orders/"],
      ["Delivery & collection", "/delivery/"],
      ["Returns & warranty", "/returns/"],
      ["Shopping help", "/help/"],
    ],
  },
  {
    title: "Shop the collection",
    links: [
      ["Phones", "/collections/mobiles/"],
      ["Laptops", "/collections/laptops/"],
      ["Tablets", "/collections/tablets/"],
      ["Audio & earbuds", "/collections/audio/"],
      ["Smart watches", "/collections/watches/"],
      ["Gaming", "/collections/gaming/"],
      ["Cameras", "/collections/cameras/"],
      ["Accessories", "/collections/accessories/"],
    ],
    columns: true,
  },
  {
    title: "London Tech",
    links: [
      ["About us", "/about/"],
      ["Visit the shop", "/contact/"],
      ["Your account", "/account/"],
      ["Privacy policy", "/privacy/"],
      ["Terms & conditions", "/terms/"],
    ],
  },
]

function FooterGroup({ section, compact }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  return (
    <nav
      className={"footer-group" + (section.columns ? " footer-group-wide" : "")}
      aria-label={section.title}
    >
      <h3>
        {compact ? (
          <button
            type="button"
            aria-controls={id}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {section.title === "London Tech" ? (
              <BrandWordmark inverse width={110} />
            ) : (
              section.title
            )}
            <ChevronDown size={15} className={open ? "is-open" : ""} />
          </button>
        ) : section.title === "London Tech" ? (
          <BrandWordmark inverse width={110} />
        ) : (
          section.title
        )}
      </h3>
      <ul id={id} hidden={compact && !open}>
        {section.links.map(([label, href]) => (
          <li key={href}>
            <a href={href}>{label}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function StoreFooter({ logo, quiet = false }) {
  const { settings, pages = [] } = useStore()
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px)")
    const update = () => setCompact(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])
  const phoneLink = (phone) =>
    "tel:" + (phone.startsWith("0") ? "+256" + phone.slice(1) : phone)
  return (
    <footer className={"site-footer shop-footer" + (quiet ? " is-quiet" : "")}>
      <div className="footer-support-band">
        <div className="store-container footer-support-inner">
          <a href="/" aria-label="London Tech home" className="footer-wordmark">
            <img src={logo} alt="London Tech" />
            <span>
              <BrandWordmark inverse width={185} />
              <small>LONDON TECHNOLOGY STORE</small>
            </span>
          </a>
          <div className="footer-support-copy">
            <strong>A little help. The right tech.</strong>
            <span>Talk to our team, or visit us in Arua Park.</span>
          </div>
          <a
            className="footer-chat"
            href="https://wa.me/256788341111"
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={17} />
            Chat with us
            <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
      <div className="store-container footer-directory">
        {sections.map((section) => (
          <FooterGroup
            key={section.title}
            section={
              section.title === "London Tech"
                ? {
                    ...section,
                    links: [
                      ...section.links,
                      ...pages
                        .filter(
                          (p) =>
                            p.footer &&
                            ![
                              "about",
                              "delivery",
                              "returns",
                              "help",
                              "privacy",
                              "terms",
                            ].includes(p.slug),
                        )
                        .map((p) => [p.title, "/pages/" + p.slug + "/"]),
                    ],
                  }
                : section
            }
            compact={compact}
          />
        ))}
        <section className="footer-contact" aria-label="Visit London Tech">
          <h3>Find us in Kampala</h3>
          <p>
            <MapPin size={15} />
            <span>{settings.address}</span>
          </p>
          <div className="footer-contact-phones">
            <Phone size={14} />
            <span>
              <a href={phoneLink(settings.phone)}>{settings.phone}</a>
              {settings.phoneAlt && (
                <a href={phoneLink(settings.phoneAlt)}>{settings.phoneAlt}</a>
              )}
            </span>
          </div>
          {settings.hours && <p className="footer-hours">{settings.hours}</p>}
          <a className="footer-directions" href="/contact/">
            Store details
            <ArrowUpRight size={13} />
          </a>
        </section>
      </div>
      <div className="store-container footer-trust-row">
        <span className="footer-original">
          Original technology. Local expertise.
          <span lang="ar" dir="rtl">
            لندن تكنولوجي ستور
          </span>
        </span>
        <div className="footer-payments">
          <span>Payment options</span>
          <PaymentMarks />
        </div>
      </div>
      <div className="store-container footer-legal-row">
        <span>
          © {new Date().getFullYear()} London Tech. All rights reserved.
        </span>
        <span>
          Kampala, Uganda <i /> <a href="/admin/">Store admin</a>
        </span>
      </div>
    </footer>
  )
}
