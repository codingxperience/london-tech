import React, { useEffect, useRef, useState } from "react"
import {
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  CheckCircle2,
  Gamepad2,
  Headphones,
  HeartHandshake,
  MapPin,
  MessageCircle,
  Monitor,
  PackageCheck,
  Play,
  Smartphone,
  Watch,
} from "lucide-react"
import { useStore } from "../store.jsx"
import { categories } from "../data/catalog.js"
import { BrandWordmark } from "./BrandWordmark.jsx"
import { Breadcrumb } from "./ui.jsx"
import "../about-page.css"

const sections = [
  ["our-vision", "Our vision"],
  ["inside-the-store", "Inside the store"],
  ["our-community", "Our community"],
  ["visit-us", "Visit us"],
]
const films = [
  {
    id: "store-tour",
    title: "Step inside the store",
    duration: "0:42",
    poster: "store-interior.webp",
    description:
      "A look around the London Tech shop: illuminated display cabinets, phones, watches, audio and accessories.",
  },
  {
    id: "product-recap",
    title: "A few store moments",
    duration: "0:20",
    poster: "product-recap-poster.webp",
    description:
      "A product recap featuring iPhones and London Tech’s branded shopping bags.",
  },
  {
    id: "community-moments",
    title: "Beyond the shop",
    duration: "0:42",
    poster: "community-moments-poster.webp",
    description:
      "Team photos, medals and celebrations at a community football event featuring London Tech jerseys and signage.",
  },
  {
    id: "match-day",
    title: "A day on the pitch",
    duration: "2:25",
    poster: "match-day-poster.webp",
    description:
      "The longer match-day film: team lineups, spectators, the presentation and celebrations.",
  },
]

function StoreFilms() {
  const [film, setFilm] = useState(films[0]),
    video = useRef(null)
  return (
    <div className="about-films">
      <div className="about-film-player">
        <video
          key={film.id}
          ref={video}
          controls
          playsInline
          preload="none"
          poster={"/assets/about/" + film.poster}
          aria-label={film.title}
          aria-describedby="about-film-description"
        >
          <source src={"/assets/about/" + film.id + ".mp4"} type="video/mp4" />
          Your browser does not support embedded video.{" "}
          <a href={"/assets/about/" + film.id + ".mp4"}>Open the film</a>.
        </video>
        <span>From London Tech</span>
      </div>
      <div className="about-film-copy">
        <p className="about-kicker">IN OUR OWN PICTURES</p>
        <h2>A closer look, before you visit.</h2>
        <p id="about-film-description">{film.description}</p>
        <div className="about-film-list" aria-label="Choose a London Tech film">
          {films.map((item) => (
            <button
              key={item.id}
              className={item.id === film.id ? "selected" : ""}
              aria-pressed={item.id === film.id}
              onClick={() => {
                video.current?.pause()
                setFilm(item)
              }}
            >
              <span className="about-film-icon">
                <Play
                  size={16}
                  fill={item.id === film.id ? "currentColor" : "none"}
                />
              </span>
              <span>
                <strong>{item.title}</strong>
                <small>
                  {item.duration} ·{" "}
                  {item.id === film.id ? "Selected" : "Select film"}
                </small>
              </span>
              <ArrowUpRight size={16} />
            </button>
          ))}
        </div>
        <p className="about-video-note">
          Select a film, then press play. Sound is available in the player.
        </p>
      </div>
    </div>
  )
}

export function AboutPage() {
  const { settings, products } = useStore(),
    [active, setActive] = useState("our-vision")
  const available = products.filter((p) => p.active !== false),
    collectionCount = categories.filter((c) =>
      available.some((p) => p.category === c.id),
    ).length
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: "-15% 0px -55% 0px" },
    )
    sections.forEach(([id]) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])
  const phone = settings.phone.replace(/[^\d+]/g, "").replace(/^0/, "+256")
  return (
    <main className="container about-page">
      <Breadcrumb items={[{ label: "About us" }]} />
      <header className="about-intro">
        <BrandWordmark width={190} />
        <h1>Your local technology store.</h1>
        <p>Explore online. See it in person. Find us in Arua Park, Kampala.</p>
      </header>
      <nav className="about-section-nav" aria-label="About London Tech">
        {sections.map(([id, label]) => (
          <a
            key={id}
            href={"#" + id}
            className={active === id ? "active" : ""}
            aria-current={active === id ? "location" : undefined}
            onClick={() => setActive(id)}
          >
            {label}
          </a>
        ))}
      </nav>
      <section id="our-vision" className="about-vision">
        <div>
          <p className="about-kicker">OUR VISION</p>
          <h2>
            Great technology.
            <br />A personal connection.
          </h2>
          <p>{settings.about}</p>
          <a className="about-cta" href="/collections/shop/">
            Explore the collection <ArrowRight size={18} />
          </a>
          <span className="about-brand-promise">
            Quality and trust{" "}
            <span lang="ar" dir="rtl">
              الجودة والثقة
            </span>
          </span>
        </div>
        <figure>
          <img
            src="/assets/about/store-interior.webp"
            alt="Inside London Tech: a wood-lined shop with glass phone and accessory displays"
            width="720"
            height="960"
            fetchPriority="high"
          />
          <figcaption>
            <MapPin size={15} /> Our shop in Arua Park
          </figcaption>
        </figure>
      </section>
      <section className="about-promises" aria-label="What to expect">
        {[
          [
            CheckCircle2,
            "Know what you’re choosing",
            "Clear model, condition and configuration details.",
          ],
          [
            MessageCircle,
            "A conversation away",
            "Speak with the team before you decide.",
          ],
          [
            PackageCheck,
            "Your way to shop",
            "Browse online and arrange collection or delivery.",
          ],
          [
            HeartHandshake,
            "A store you can visit",
            "Real people, right here in Arua Park.",
          ],
        ].map(([Icon, title, copy]) => (
          <article key={title}>
            <span>
              <Icon size={25} strokeWidth={1.5} />
            </span>
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </section>
      <section id="inside-the-store" className="about-store-section">
        <div className="about-section-title">
          <div>
            <p className="about-kicker">INSIDE THE STORE</p>
            <h2>For work, play and everything between.</h2>
          </div>
          <a href="/collections/shop/">
            Shop all <ArrowUpRight size={16} />
          </a>
        </div>
        <div className="about-collection-links">
          {[
            ["mobiles", "Phones", Smartphone],
            ["laptops", "Laptops", Monitor],
            ["audio", "Audio", Headphones],
            ["watches", "Watches", Watch],
            ["gaming", "Gaming", Gamepad2],
            ["accessories", "Accessories", AudioLines],
          ].map(([id, label, Icon]) => (
            <a key={id} href={"/collections/" + id + "/"}>
              <Icon size={25} strokeWidth={1.4} />
              <span>{label}</span>
              <ArrowUpRight size={14} />
            </a>
          ))}
        </div>
        <StoreFilms />
        <div className="about-store-facts">
          <div>
            <strong>{available.length}</strong>
            <span>products to explore online</span>
          </div>
          <div>
            <strong>{collectionCount}</strong>
            <span>collections, in one place</span>
          </div>
          <div>
            <strong>FN:19</strong>
            <span>your destination in Arua Park</span>
          </div>
        </div>
      </section>
      <section id="our-community" className="about-community">
        <figure>
          <img
            src="/assets/about/community-team.webp"
            alt="Football players wearing London Tech jerseys pose together at a community event"
            width="1100"
            height="620"
            loading="lazy"
          />
          <figcaption>A shared moment on the pitch.</figcaption>
        </figure>
        <div>
          <p className="about-kicker">OUR COMMUNITY</p>
          <h2>
            Part of the everyday.
            <br />
            Part of the community.
          </h2>
          <p>
            Our story goes beyond the display cabinet. These moments from the
            football pitch show the people, team spirit and shared celebrations
            around London Tech.
          </p>
          <p>
            From a visit to the shop to a day with the team, connection is at
            the heart of it.
          </p>
          {settings.socials?.tiktok && (
            <a
              className="about-text-link"
              href={settings.socials.tiktok}
              target="_blank"
              rel="noreferrer"
            >
              See more on TikTok <ArrowUpRight size={16} />
            </a>
          )}
        </div>
      </section>
      <section id="visit-us" className="about-visit">
        <div>
          <p className="about-kicker">COME SAY HELLO</p>
          <h2>Make your next visit count.</h2>
          <p>{settings.address}, Kampala, Uganda.</p>
          <div>
            <a className="about-cta" href="/contact/">
              Plan your visit <ArrowRight size={17} />
            </a>
            <a href={"tel:" + phone}>Call {settings.phone}</a>
          </div>
        </div>
        <div className="about-visit-marker">
          <MapPin size={32} strokeWidth={1.5} />
          <strong>Arua Park</strong>
          <span>Second floor · Shop FN:19</span>
          <span>NYUMBA KUBUA building</span>
        </div>
      </section>
    </main>
  )
}
