import React from "react"
import { ArrowUpRight, Clock3, MessageCircle, Phone } from "lucide-react"
import { useStore } from "../store.jsx"
import { Breadcrumb } from "./ui.jsx"
import "../contact-page.css"

export function ContactPage() {
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
      <Breadcrumb items={[{ label: "Store information" }]} />
      <header className="contact-heading">
        <p className="eyebrow">LONDON TECH · KAMPALA</p>
        <h1>Find us in Arua Park.</h1>
        <p>Visit the shop, take a closer look, or speak with our team.</p>
      </header>
      <div className="contact-layout">
        <section
          className="contact-details"
          aria-label="Store address and contact details"
        >
          <div className="contact-location">
            <h2>Visit London Tech</h2>
            <p className="contact-address">{settings.address}</p>
            <a className="button" href={maps} target="_blank" rel="noreferrer">
              Get directions <ArrowUpRight size={16} />
            </a>
          </div>
          <div className="contact-call-row">
            <Phone size={20} />
            <div>
              <h2>Call the store</h2>
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
              <h2>Opening hours</h2>
              <p>
                {settings.hours || "Please call to confirm before you visit."}
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
            <MessageCircle size={18} /> Ask a product question{" "}
            <ArrowUpRight size={15} />
          </a>
        </section>
        <figure className="contact-city">
          <img
            src="/assets/store/kampala.jpg"
            width="1280"
            height="682"
            alt="A view across Kampala’s city centre and skyline"
          />
          <figcaption>
            <span>Kampala, Uganda</span>
            <small>
              Photo:{" "}
              <a
                href="https://commons.wikimedia.org/wiki/File:View_of_Kampala_city_1.jpg"
                target="_blank"
                rel="noreferrer"
              >
                Dr. S-mon
              </a>{" "}
              ·{" "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noreferrer"
              >
                CC BY 4.0
              </a>
            </small>
          </figcaption>
        </figure>
      </div>
    </main>
  )
}
