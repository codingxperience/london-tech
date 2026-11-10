import React, { useRef, useState } from "react"
import { ArrowLeft, ArrowRight, ImagePlus, ImageUp, Star, X } from "lucide-react"
import { Button, Field, IconButton, Notice } from "../components/ui.jsx"

export const galleryLimit = 10
export const encodedPhotoPrefix = "data:image/webp;base64,"
const maxSourceBytes = 20 * 1024 * 1024

async function preparePhoto(file, preview) {
  if (file.size > maxSourceBytes)
    throw new Error("Choose a photo under 20 MB.")
  if (!/^image\/(jpeg|png|webp|avif|heic|heif)$/.test(file.type) &&
      !/\.(jpe?g|png|webp|avif|heic|heif)$/i.test(file.name))
    throw new Error("Choose a JPG, PNG, WebP, AVIF or HEIC photo.")
  const src = URL.createObjectURL(file)
  try {
    const photo = new Image()
    photo.src = src
    await photo.decode().catch(() => {
      throw new Error("This browser cannot open the photo. Try JPG, PNG or WebP.")
    })
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")
    const limit = preview ? 90000 : 360000
    for (const size of [1400, 1050, 800, 600, 420]) {
      const scale = Math.min(1, size / Math.max(photo.naturalWidth, photo.naturalHeight))
      canvas.width = Math.max(1, Math.round(photo.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(photo.naturalHeight * scale))
      context.drawImage(photo, 0, 0, canvas.width, canvas.height)
      for (const quality of [0.87, 0.73, 0.60]) {
        const encoded = canvas.toDataURL("image/webp", quality)
        if (!encoded.startsWith(encodedPhotoPrefix))
          throw new Error("This browser cannot save WebP photos.")
        if (encoded.length <= limit) return encoded
      }
    }
    throw new Error("The photo could not be compressed. Choose a smaller image.")
  } finally {
    URL.revokeObjectURL(src)
  }
}

export function ProductPhotoEditor({
  photos, setPhotos, mediaNote, onNote, library, preview, busy, onBusy,
}) {
  const picker = useRef(null)
  const inProgress = useRef(false)
  const [dragging, setDragging] = useState(false)
  const [message, setMessage] = useState("")
  const [link, setLink] = useState("")
  const [query, setQuery] = useState("")
  const remaining = galleryLimit - photos.length
  const choices = library.filter(({ name }) => name.toLowerCase().includes(query.trim().toLowerCase()))

  function addPhoto(src) {
    if (photos.includes(src)) {
      setMessage("This photo is already in the gallery.")
      return
    }
    if (!remaining) {
      setMessage("Remove a photo before adding another.")
      return
    }
    setPhotos((current) => [...current, src])
    setMessage("")
  }

  async function addFiles(fileList) {
    const files = Array.from(fileList)
    if (!files.length || busy || inProgress.current || !remaining) return
    inProgress.current = true
    onBusy(true)
    const results = []
    const errors = []
    try {
      for (const file of files.slice(0, remaining)) {
        try {
          results.push(await preparePhoto(file, preview))
        } catch (error) {
          errors.push(file.name + " · " + error.message)
        }
      }
      setPhotos((current) => [...new Set([...current, ...results])].slice(0, galleryLimit))
      if (files.length > remaining) errors.push("Only " + remaining + " photos fit in the gallery.")
      setMessage(errors.join(" "))
    } finally {
      inProgress.current = false
      onBusy(false)
    }
  }

  function move(index, next) {
    setPhotos((current) => {
      const ordered = current.slice()
      ordered.splice(next, 0, ordered.splice(index, 1)[0])
      return ordered
    })
  }

  function addLink() {
    const url = link.trim()
    if (!/^\/assets\/[a-zA-Z0-9%_.\-/@]+$/.test(url)) {
      try {
        const parsed = new URL(url)
        if (parsed.protocol !== "https:" || parsed.username || parsed.password || url.length > 1000)
          throw new Error()
      } catch {
        setMessage("Enter a complete HTTPS image link or a store asset path.")
        return
      }
    }
    addPhoto(url)
    setLink("")
  }

  return (
    <div className="photo-editor" aria-busy={busy}>
      <div className="photo-editor-heading">
        <div><h3>Product photos</h3><p>The cover is the first photo customers see.</p></div>
        <span className="photo-editor-count">{photos.length} of {galleryLimit}</span>
      </div>
      <div
        className="photo-dropzone"
        data-dragging={dragging || undefined}
        onDragOver={(event) => { event.preventDefault(); if (!busy && remaining) setDragging(true) }}
        onDragLeave={(event) => {
          if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget))
            setDragging(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          void addFiles(event.dataTransfer.files)
        }}
      >
        <span className="photo-drop-icon"><ImageUp size={24} aria-hidden="true" /></span>
        <div>
          <strong>{busy ? "Preparing photos…" : "Drop photos here"}</strong>
          <small>JPG, PNG, WebP, AVIF or HEIC · up to 20 MB each</small>
        </div>
        <input
          type="file" hidden ref={picker} multiple
          accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.heic,.heif"
          onChange={(event) => {
            const files = Array.from(event.target.files || [])
            event.target.value = ""
            void addFiles(files)
          }}
        />
        <Button type="button" variant="secondary" disabled={busy || !remaining} onClick={() => picker.current?.click()}>
          <ImagePlus size={16} aria-hidden="true" /> Choose photos
        </Button>
      </div>
      {message && <Notice type="error">{message}</Notice>}
      <p className="photo-sr-only" role="status">{busy ? "Preparing photos" : photos.length + " photos in gallery"}</p>
      {photos.length > 0 && (
        <ol className="photo-editor-grid" aria-label="Gallery order">
          {photos.map((src, index) => (
            <li key={src} className="photo-editor-item">
              <div className="photo-editor-image">
                <img src={src} alt={index ? "Product photo " + (index + 1) : "Product cover"} loading="lazy" />
                {index === 0 && <span className="photo-cover"><Star size={12} fill="currentColor" /> Cover</span>}
              </div>
              <div className="photo-editor-actions">
                <IconButton type="button" label={"Move photo " + (index + 1) + " earlier"} disabled={busy || index === 0} onClick={() => move(index, index - 1)}><ArrowLeft size={16} /></IconButton>
                <IconButton type="button" label={"Move photo " + (index + 1) + " later"} disabled={busy || index === photos.length - 1} onClick={() => move(index, index + 1)}><ArrowRight size={16} /></IconButton>
                <IconButton type="button" label={"Make photo " + (index + 1) + " the cover"} disabled={busy || index === 0} onClick={() => move(index, 0)}><Star size={16} /></IconButton>
                <IconButton type="button" label={"Remove photo " + (index + 1)} disabled={busy} onClick={() => setPhotos((current) => current.filter((value) => value !== src))}><X size={16} /></IconButton>
              </div>
            </li>
          ))}
        </ol>
      )}
      <details className="photo-editor-more">
        <summary>Use an image link or the product library</summary>
        <div className="photo-link-row">
          <Field
            label="Image link"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="https://…"
            onKeyDown={(event) => {
              if (event.key !== "Enter") return
              event.preventDefault()
              if (link.trim() && !busy && remaining) addLink()
            }}
          />
          <Button type="button" variant="secondary" disabled={!link.trim() || busy || !remaining} onClick={addLink}>Add link</Button>
        </div>
        <Field label="Search the product library" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by product name" />
        <div className="photo-library">
          {choices.slice(0, 36).map(({ src, name }) => (
            <button key={src} type="button" disabled={busy || !remaining || photos.includes(src)} aria-label={"Add photo from " + name} title={name} onClick={() => addPhoto(src)}>
              <img src={src} alt="" loading="lazy" />
              <span>{name}</span>
            </button>
          ))}
        </div>
        {!choices.length && <p>No photos match your search.</p>}
        {choices.length > 36 && <p>Search by product name to find more photos.</p>}
      </details>
      <Field label="Photo note (optional)" hint="Use this when a reference photo shows a different finish or model.">
        <textarea rows={2} maxLength={500} value={mediaNote || ""} onChange={(event) => onNote(event.target.value)} />
      </Field>
    </div>
  )
}
