import { BrandWordmark } from "./BrandWordmark.jsx"
import { NewsletterSignup } from "./NewsletterSignup.jsx"
import { SocialLinks } from "./SocialLinks.jsx"
import { BackToTop } from "./BackToTop.jsx"
import React, { useEffect, useId, useState } from "react"
import { ArrowUpRight, ChevronDown, MapPin, Phone } from "lucide-react"
import { useStore } from "../store.jsx"
import { PaymentMarks } from "./storefront.jsx"
import { useLocale } from "../lib/locale.jsx"
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
      ["Shop all electronics", "/collections/shop/"],
      ["Phones", "/collections/mobiles/"],
      ["Tablets", "/collections/tablets/"],
      ["Audio & earbuds", "/collections/audio/"],
      ["Wristwatches", "/collections/wristwatches/"],
      ["Accessories", "/collections/accessories/"],
      ["Perfumes", "/collections/perfumes/"],
      ["Hot Deals", "/collections/hot-deals/"],
    ],
    columns: true,
  },
  {
    title: "London Tech",
    links: [
      ["About London Tech", "/about/"],
      ["Visit our Kampala store", "/contact/"],
      ["Your account", "/account/"],
      ["Privacy policy", "/privacy/"],
      ["Terms & conditions", "/terms/"],
    ],
  },
]

function FooterGroup({ section, compact }) {
  const { t } = useLocale()
  const id = useId()
  const [open, setOpen] = useState(false)
  return (
    <nav
      className={"footer-group" + (section.columns ? " footer-group-wide" : "")}
      aria-label={t(section.title)}
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
              t(section.title)
            )}
            <ChevronDown size={15} className={open ? "is-open" : ""} />
          </button>
        ) : section.title === "London Tech" ? (
          <BrandWordmark inverse width={110} />
        ) : (
          t(section.title)
        )}
      </h3>
      <ul id={id} hidden={compact && !open}>
        {section.links.map(([label, href]) => (
          <li key={href}>
            <a href={href}>{t(label)}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function StoreFooter({ logo, quiet = false }) {
  const { t } = useLocale()
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
          <a href="/" aria-label={t("London Tech home")} className="footer-wordmark">
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
        <section className="footer-contact" aria-label={t("Visit London Tech")}>
          <h3>{t("Find us in Kampala")}</h3>
          <p>
            <MapPin size={15} />
            <span>{t(settings.address)}</span>
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
          {settings.hours && <p className="footer-hours">{t(settings.hours)}</p>}
          <a className="footer-directions" href="/contact/">
            {t("Store details")}
            <ArrowUpRight size={13} />
          </a>
        </section>
      </div>
      <div className="store-container footer-community-row">
        <SocialLinks profiles={settings.socials} />
        <div className="footer-payments">
          <h3>{t("Payment options")}</h3>
          <PaymentMarks />
        </div>
      </div>
      <BackToTop />
      <div className="store-container footer-legal-row">
        <span>
          © {new Date().getFullYear()} London Tech. {t("All rights reserved.")}
        </span>
        <span>
          {t("Kampala, Uganda")} <i /> <a href="/admin/">{t("Store admin")}</a>
        </span>
      </div>
    </footer>
  )
}
