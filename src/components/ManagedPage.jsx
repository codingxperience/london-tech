import "../managed-page.css"
import React, { useEffect, useState } from "react"
import { api } from "../lib/api.js"
import { Breadcrumb, Notice } from "./ui.jsx"

export function PageDocument({ page }) {
  useEffect(() => {
    document.title = page.title + " | London Tech"
  }, [page.title])
  return (
    <main className="container info-page managed-page">
      <Breadcrumb items={[{ label: page.title }]} />
      <header>
        <h1>{page.title}</h1>
        {page.summary && <p>{page.summary}</p>}
      </header>
      <article>
        {page.body.split(/\n\s*\n/).map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </article>
    </main>
  )
}
export function ManagedPage({ slug, fallback = null }) {
  const [page, setPage] = useState(null),
    [loaded, setLoaded] = useState(false)
  useEffect(() => {
    let active = true
    setLoaded(false)
    setPage(null)
    api("pages/" + encodeURIComponent(slug))
      .then((d) => {
        if (active) setPage(d.page)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoaded(true)
      })
    return () => {
      active = false
    }
  }, [slug])
  return page ? (
    <PageDocument page={page} />
  ) : (
    fallback || (
      <main className="container standard-page">
        {loaded ? (
          <Notice>This page is unavailable or has not been published.</Notice>
        ) : (
          <p>Opening page…</p>
        )}
      </main>
    )
  )
}
