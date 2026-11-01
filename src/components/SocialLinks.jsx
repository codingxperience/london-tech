import React from "react"

const networks = [
  { key: "facebook", name: "Facebook", hosts: ["facebook.com", "fb.com"] },
  { key: "x", name: "X", hosts: ["x.com", "twitter.com"] },
  { key: "tiktok", name: "TikTok", hosts: ["tiktok.com"] },
  { key: "instagram", name: "Instagram", hosts: ["instagram.com"] },
  { key: "snapchat", name: "Snapchat", hosts: ["snapchat.com"] },
]

export function socialProfile(key, value) {
  const network = networks.find((item) => item.key === key)
  if (!network || typeof value !== "string") return null
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase().replace(/^www\./, "")
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !network.hosts.some(
        (allowed) => host === allowed || host.endsWith("." + allowed),
      ) ||
      url.pathname === "/"
    )
      return null
    return url.href
  } catch {
    return null
  }
}

function SocialMark({ network }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {network === "facebook" && (
        <path d="M13.4 22v-9.1h3.1l.5-3.6h-3.6V7c0-1 .3-1.8 1.8-1.8h1.9V2.1c-.3 0-1.5-.1-2.8-.1-2.8 0-4.7 1.7-4.7 4.8v2.5H6.5v3.6h3.1V22h3.8Z" />
      )}
      {network === "x" && (
        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.64 7.584H.47l8.6-9.835L0 1.154h7.594l5.243 6.932 6.064-6.933Zm-1.29 19.49h2.039L6.486 3.24H4.298L17.61 20.644Z" />
      )}
      {network === "tiktok" && (
        <path d="M16.7 1h-3.9v14.8a3.1 3.1 0 1 1-2.6-3.1v-4a7.1 7.1 0 1 0 6.5 7.1V8.3a10.1 10.1 0 0 0 5.8 1.8V6.2c-3.2 0-5.8-2.5-5.8-5.2Z" />
      )}
      {network === "instagram" && (
        <>
          <rect
            x="2.6"
            y="2.6"
            width="18.8"
            height="18.8"
            rx="5.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle
            cx="12"
            cy="12"
            r="4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="17.8" cy="6.2" r="1.2" />
        </>
      )}
      {network === "snapchat" && (
        <path d="M12 2.2c-3.3 0-5.2 2.4-5.2 5.8l.1 2.5c-.5.2-1.1-.2-1.6-.4-.6-.2-1.4.3-1.1.9.3.7 1.7.9 2.2 1.3-.3 1.8-1.6 3.6-4.2 4.4-.5.2-.4.8.2 1 1 .4 1.8.5 2.3.6l.5 1.5c.1.3.4.3.8.2 2.1-.6 3.2.5 4.3 1.1.5.3 1.1.5 1.7.5s1.2-.2 1.7-.5c1.1-.6 2.2-1.7 4.3-1.1.4.1.7.1.8-.2l.5-1.5c.5-.1 1.3-.2 2.3-.6.6-.2.7-.8.2-1-2.6-.8-3.9-2.6-4.2-4.4.5-.4 1.9-.6 2.2-1.3.3-.6-.5-1.1-1.1-.9-.5.2-1.1.6-1.6.4L17.2 8c0-3.4-1.9-5.8-5.2-5.8Z" />
      )}
    </svg>
  )
}

export function SocialLinks({ profiles = {} }) {
  const linked = networks.filter((network) =>
    socialProfile(network.key, profiles?.[network.key]),
  )
  return (
    <section className="footer-socials" aria-label="Follow London Tech">
      <h3>Follow us</h3>
      <div className="footer-social-icons">
        {networks.map((network) => {
          const href = socialProfile(network.key, profiles?.[network.key])
          const mark = <SocialMark network={network.key} />
          return href ? (
            <a
              key={network.key}
              className={`footer-social-link social-${network.key}`}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`London Tech on ${network.name} (opens in a new tab)`}
              title={network.name}
            >
              {mark}
            </a>
          ) : (
            <span
              key={network.key}
              className={`footer-social-link social-${network.key} is-pending`}
              title={`${network.name} profile coming soon`}
            >
              {mark}
              <span className="sr-only">
                {network.name} profile coming soon
              </span>
            </span>
          )
        })}
      </div>
      {linked.length < networks.length && (
        <p className="footer-social-note">
          {linked.length
            ? "More channels coming soon."
            : "Our social profiles will be linked here soon."}
        </p>
      )}
    </section>
  )
}
