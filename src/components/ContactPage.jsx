import { BrandWordmark } from "./BrandWordmark.jsx"
import React from "react"
import {
  ArrowUpRight,
  Clock3,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react"
import { useStore } from "../store.jsx"
import { useLocale } from "../lib/locale.jsx"
import { Breadcrumb } from "./ui.jsx"
import "../contact-page.css"

export function ContactPage() {
  const { t } = useLocale()
  const { settings } = useStore()
  const phoneLink = (phone) =>
    "tel:" + phone.replace(/[^\d+]/g, "").replace(/^0/, "+256")
  const maps =
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(settings.address + ", Kampala, Uganda")
  const chat = (settings.whatsapp || settings.phone)
    .replace(/\D/g, "")
    .replace(/^0/, "256")
  return (
    <main className="container contact-page">
      <Breadcrumb items={[{ label: t("Store information") }]} />
      <header className="contact-heading">
        <p className="eyebrow">
          <BrandWordmark width={142} />
          <span>{t("KAMPALA")}</span>
        </p>
        <h1>{t("Find us in Arua Park.")}</h1>
        <p>{t("Visit the shop, take a closer look, or speak with our team.")}</p>
      </header>
      <div className="contact-layout">
        <section
          className="contact-details"
          aria-label={t("Store address and contact details")}
        >
          <div className="contact-location">
            <h2>{t("Visit the shop")}</h2>
            <p className="contact-address">{settings.address}</p>
            <a className="button" href={maps} target="_blank" rel="noreferrer">
              {t("Get directions")} <ArrowUpRight size={16} />
            </a>
          </div>
          <div className="contact-call-row">
            <Phone size={20} />
            <div>
              <h2>{t("Call the store")}</h2>
              <div className="contact-phone-links">
                {[settings.phone, settings.phoneAlt]
                  .filter(Boolean)
                  .map((phone) => (
                    <a key={phone} href={phoneLink(phone)}>
                      {phone}
                    </a>
                  ))}
              </div>
            </div>
          </div>
          <div className="contact-hours-row">
            <Clock3 size={20} />
            <div>
              <h2>{t("Opening hours")}</h2>
              <p>
                {settings.hours || t("Please call to confirm before you visit.")}
              </p>
            </div>
          </div>
          {settings.email && (
            <a className="contact-email" href={`mailto:${settings.email}`}>
              {settings.email}
            </a>
          )}
          <a
            className="contact-chat-link"
            href={`https://wa.me/${chat}`}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={18} /> {t("Ask a product question")}{" "}
            <ArrowUpRight size={15} />
          </a>
        </section>
        <section className="contact-map" aria-label={t("Map and store directions")}>
          <header>
            <MapPin size={19} />
            <div>
              <strong>{t("Arua Park, Kampala")}</strong>
              <span>{t("Find the area, then visit us on the second floor.")}</span>
            </div>
          </header>
          <iframe
            title={t("Interactive map of the Arua Park area in Kampala")}
            src="https://www.openstreetmap.org/export/embed.html?bbox=32.5718%2C0.3135%2C32.5784%2C0.3190&layer=mapnik"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <footer>
            <div>
              <strong>{t("NYUMBA KUBUA building")}</strong>
              <span>{t("Second floor · Shop FN:19")}</span>
            </div>
            <a
              href="https://www.openstreetmap.org/#map=17/0.31625/32.57506"
              target="_blank"
              rel="noreferrer"
            >
              {t("Larger map")} <ArrowUpRight size={15} />
            </a>
          </footer>
        </section>
      </div>
    </main>
  )
}
