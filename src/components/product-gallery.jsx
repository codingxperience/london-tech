import React, { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Expand, Play, ZoomIn } from "lucide-react"
import { IconButton, Modal } from "./ui.jsx"
import { galleryImages, zoomOrigin } from "../lib/product-experience.js"
import { productImagePlaceholder, showProductImageFallback } from "../lib/product-image.js"

export function ProductGallery({ product }) {
  const images = galleryImages(product)
  const [selected, setSelected] = useState(0)
  const [enlarged, setEnlarged] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [origin, setOrigin] = useState("50% 50%")
  const rail = useRef(null)
  const current = images[selected] || images[0]

  useEffect(() => {
    setSelected(0)
    setEnlarged(false)
  }, [product.id, images.length])
  useEffect(() => {
    setHovered(false)
    setOrigin("50% 50%")
    if (enlarged || !rail.current) return
    const thumbnail = rail.current.querySelector(
      `[data-image-index="${selected}"]`,
    )
    if (!thumbnail) return
    const target = thumbnail.getBoundingClientRect()
    const bounds = rail.current.getBoundingClientRect()
    // Move only the thumbnail rail. scrollIntoView can jump the whole page
    // below the large product image, especially on initial mobile page load.
    if (target.left < bounds.left)
      rail.current.scrollBy({
        left: target.left - bounds.left,
        behavior: "auto",
      })
    else if (target.right > bounds.right)
      rail.current.scrollBy({
        left: target.right - bounds.right,
        behavior: "auto",
      })
    if (target.top < bounds.top)
      rail.current.scrollBy({ top: target.top - bounds.top, behavior: "auto" })
    else if (target.bottom > bounds.bottom)
      rail.current.scrollBy({
        top: target.bottom - bounds.bottom,
        behavior: "auto",
      })
  }, [selected, enlarged, current?.src])
  useEffect(() => {
    if (!enlarged) return
    const key = (event) => {
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault()
        setSelected(
          (index) =>
            (index + (event.key === "ArrowRight" ? 1 : -1) + images.length) %
            images.length,
        )
      }
    }
    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
  }, [enlarged, images.length])

  const selectWithKeyboard = (event, index) => {
    let next
    if (event.key === "ArrowRight" || event.key === "ArrowDown")
      next = Math.min(index + 1, images.length - 1)
    if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      next = Math.max(index - 1, 0)
    if (event.key === "Home") next = 0
    if (event.key === "End") next = images.length - 1
    if (next == null) return
    event.preventDefault()
    setSelected(next)
    rail.current
      ?.querySelector(`[data-image-index="${next}"]`)
      ?.focus({ preventScroll: true })
  }

  const scrollThumbnails = (distance) => {
    if (!rail.current) return
    const vertical =
      window.getComputedStyle(rail.current).flexDirection === "column"
    rail.current.scrollBy({
      [vertical ? "top" : "left"]: distance,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    })
  }

  if (!current) return (
    <div className="product-gallery">
      <div className="product-main-image">
        <img src={productImagePlaceholder} alt={`Photo unavailable for ${product.name}`} />
      </div>
    </div>
  )

  return (
    <div className="product-gallery">
      <div className="detail-gallery-stage">
        {current.type === "video" ? (
          <div className="product-main-image detail-video-stage">
            {current.embedSrc ? (
              <iframe
                key={current.embedSrc}
                src={current.embedSrc}
                title={current.alt}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <video
                key={current.videoSrc}
                src={current.videoSrc}
                poster={current.src}
                aria-label={current.alt}
                controls
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
            )}
            <span className="image-count">
              {selected + 1} / {images.length}
            </span>
            <button
              type="button"
              className="image-expand"
              aria-label={`Open ${product.name} video`}
              onClick={() => setEnlarged(true)}
            >
              <Expand size={18} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={
              "product-main-image detail-zoom-image" +
              (hovered ? " is-zoomed" : "")
            }
            aria-label={`Enlarge ${product.name}, image ${selected + 1} of ${images.length}`}
            onPointerEnter={(event) => {
              if (event.pointerType !== "mouse") return
              setOrigin(
                zoomOrigin(
                  event.clientX,
                  event.clientY,
                  event.currentTarget.getBoundingClientRect(),
                ),
              )
              setHovered(true)
            }}
            onPointerMove={(event) => {
              if (event.pointerType !== "mouse") return
              setOrigin(
                zoomOrigin(
                  event.clientX,
                  event.clientY,
                  event.currentTarget.getBoundingClientRect(),
                ),
              )
              setHovered(true)
            }}
            onPointerLeave={() => setHovered(false)}
            onBlur={() => setHovered(false)}
            onClick={() => {
              setHovered(false)
              setEnlarged(true)
            }}
          >
            <img
              src={current.src}
              alt={current.alt}
              onError={showProductImageFallback}
              fetchPriority="high"
              decoding="async"
              style={{ transformOrigin: origin }}
            />
            <span className="image-count">
              {selected + 1} / {images.length}
            </span>
            <span className="image-expand">
              <Expand size={18} />
            </span>
          </button>
        )}
        <div className="gallery-thumbnail-row">
          {images.length > 5 && (
            <IconButton
              label="Previous thumbnails"
              onClick={() => scrollThumbnails(-240)}
            >
              <ChevronLeft size={18} />
            </IconButton>
          )}
          <div
            className="product-thumbnails"
            ref={rail}
            role="group"
            aria-label="Product images. Hover, focus or select a thumbnail to preview."
          >
            {images.map((image, index) => (
              <button
                key={image.type === "video" ? image.videoSrc || image.embedSrc : image.src}
                type="button"
                data-image-index={index}
                data-media-type={image.type || "image"}
                className={selected === index ? "selected" : ""}
                aria-label={`View ${image.alt}, ${index + 1} of ${images.length}`}
                aria-pressed={selected === index}
                onPointerEnter={(event) => {
                  if (event.pointerType !== "touch") setSelected(index)
                }}
                onFocus={() => setSelected(index)}
                onClick={() => setSelected(index)}
                onKeyDown={(event) => selectWithKeyboard(event, index)}
              >
                <img src={image.src} alt="" loading="lazy" decoding="async" onError={showProductImageFallback} />
                {image.type === "video" && (
                  <span className="gallery-video-play" aria-hidden="true">
                    <Play size={14} fill="currentColor" />
                  </span>
                )}
              </button>
            ))}
          </div>
          {images.length > 5 && (
            <IconButton
              label="Next thumbnails"
              onClick={() => scrollThumbnails(240)}
            >
              <ChevronRight size={18} />
            </IconButton>
          )}
        </div>
      </div>
      <p className="gallery-instruction">
        <ZoomIn size={15} />
        <span className="desktop-zoom-hint">Hover to zoom · </span>Click or tap
        to explore
      </p>
      <p className="gallery-note">
        {product.mediaNote ||
          "Images show the product design. Confirm your colour, configuration and included accessories with the store."}
        {current.src.startsWith("/assets/catalogue-references/") && (
          <>
            {" "}
            <a
              href="/assets/catalogue-references/credits.txt"
              target="_blank"
              rel="noreferrer"
            >
              Photo credits
            </a>
          </>
        )}
      </p>
      {enlarged && (
        <Modal
          title={product.name}
          wide
          className="image-modal detail-lightbox"
          onClose={() => setEnlarged(false)}
        >
          {current.type === "video" ? (
            current.embedSrc ? (
              <iframe
                className="gallery-lightbox-video"
                src={current.embedSrc}
                title={current.alt}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <video
                className="gallery-lightbox-video"
                src={current.videoSrc}
                poster={current.src}
                aria-label={current.alt}
                controls
                autoPlay
                muted
                playsInline
                preload="metadata"
              />
            )
          ) : (
            <img src={current.src} alt={current.alt} onError={showProductImageFallback} />
          )}
          <div className="image-controls">
            <IconButton
              label="Previous product image"
              disabled={images.length < 2}
              onClick={() =>
                setSelected((selected - 1 + images.length) % images.length)
              }
            >
              <ChevronLeft />
            </IconButton>
            <span aria-live="polite">
              {current.type === "video" ? "Video" : "Image"} {selected + 1} of {images.length}
            </span>
            <IconButton
              label="Next product image"
              disabled={images.length < 2}
              onClick={() => setSelected((selected + 1) % images.length)}
            >
              <ChevronRight />
            </IconButton>
          </div>
          <p>{current.alt}</p>
        </Modal>
      )}
    </div>
  )
}
