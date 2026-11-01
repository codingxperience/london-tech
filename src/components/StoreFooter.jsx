import { BrandWordmark } from "./BrandWordmark.jsx"
import { NewsletterSignup } from "./NewsletterSignup.jsx"
import { SocialLinks } from "./SocialLinks.jsx"
import { BackToTop } from "./BackToTop.jsx"
import React, { useEffect, useId, useState } from "react"
import { ArrowUpRight, ChevronDown, MapPin, Phone } from "lucide-react"
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
      <div className="footer-newsletter-band">
        <div className="store-container footer-newsletter-inner">
          <a href="/" aria-label="London Tech home" className="footer-wordmark">
            <img src={logo} alt="London Tech" />
            <span>
              <BrandWordmark inverse width={185} />
              <small>LONDON TECHNOLOGY STORE</small>
            </span>
          </a>
          <NewsletterSignup />
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
      <div className="store-container footer-community-row">
        <SocialLinks profiles={settings.socials} />
        <div className="footer-payments">
          <h3>Payment options</h3>
          <PaymentMarks />
        </div>
      </div>
      <BackToTop />
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
