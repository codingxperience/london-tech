import React, { useEffect, useRef, useState } from "react"
import {
  ImagePlus,
  LoaderCircle,
  ScanSearch,
  ShieldCheck,
  ArrowRight,
} from "lucide-react"
import { Modal, Button } from "./ui.jsx"
import { useStore } from "../store.jsx"
import { productPath, categoryName } from "../data/catalog.js"
import { ProductOffer } from "./ProductOffer.jsx"
import {
  createVisualSearchClient,
  validateSearchPhoto,
} from "../lib/visual-search.js"

export function ImageSearchDialog({ createClient = createVisualSearchClient }) {
  const { products, setImageSearchOpen } = useStore()
  const [state, setState] = useState({
    phase: "idle",
    preview: "",
    matches: [],
    message: "",
  })
  const [dragging, setDragging] = useState(false)
  const picker = useRef(null)
  const client = useRef(null)
  const generation = useRef(0)
  const preview = useRef("")
  const latestProducts = useRef(products)
  latestProducts.current = products
  const close = () => setImageSearchOpen(false)
  useEffect(() => {
    client.current = createClient()
    return () => {
      generation.current++
      client.current?.cancel()
      if (preview.current) URL.revokeObjectURL(preview.current)
    }
  }, [createClient])

  async function search(file) {
    const attempt = ++generation.current
    client.current?.cancel()
    setDragging(false)
    try {
      validateSearchPhoto(file)
    } catch (error) {
      setState((previous) => ({
        ...previous,
        phase: "error",
        message: error.message,
        matches: [],
      }))
      return
    }
    if (preview.current) URL.revokeObjectURL(preview.current)
    preview.current = URL.createObjectURL(file)
    setState({
      phase: "loading",
      preview: preview.current,
      matches: [],
      message: "Opening your photo…",
    })
    try {
      const matches = await client.current.search(
        file,
        latestProducts.current,
        (message) => {
          if (attempt === generation.current)
            setState((previous) => ({ ...previous, message }))
        },
      )
      if (attempt === generation.current)
        setState((previous) => ({
          ...previous,
          phase: "done",
          matches,
          message: "",
        }))
    } catch (error) {
      if (attempt === generation.current && error.name !== "AbortError")
        setState((previous) => ({
          ...previous,
          phase: "error",
          matches: [],
          message:
            error.message ||
            "This photo could not be searched. Please try another image.",
        }))
    }
  }
  useEffect(() => {
    const paste = (event) => {
      if (
        event.target?.matches?.(
          "input:not([type=file]),textarea,[contenteditable=true]",
        )
      )
        return
      const file = [...(event.clipboardData?.files || [])].find((item) =>
        item.type.startsWith("image/"),
      )
      if (file) {
        event.preventDefault()
        search(file)
      }
    }
    window.addEventListener("paste", paste)
    return () => window.removeEventListener("paste", paste)
  }, [])

  return (
    <Modal
      title="Search by image"
      onClose={close}
      wide
      className="image-search-dialog"
    >
      <p className="image-search-intro">
        See something you like? Find similar items at London Tech.
      </p>
      <input
        ref={picker}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Choose a product photo"
        className="image-search-input"
        hidden
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          if (file) search(file)
        }}
      />
      <div
        className={"image-search-body" + (state.preview ? " has-photo" : "")}
      >
        <div
          className={"image-search-drop" + (dragging ? " dragging" : "")}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              setDragging(false)
          }}
          onDrop={(event) => {
            event.preventDefault()
            const file = event.dataTransfer.files?.[0]
            if (file) search(file)
            else setDragging(false)
          }}
        >
          {state.preview ? (
            <img
              src={state.preview}
              alt="Your search photo"
              className="image-search-preview"
            />
          ) : (
            <span className="image-search-illustration">
              <ScanSearch size={48} strokeWidth={1} />
              <span>
                <ImagePlus size={19} />
              </span>
            </span>
          )}
          <h3>{state.preview ? "Your photo" : "Start with a product photo"}</h3>
          <p>
            {state.preview
              ? "A clear image of one item works best."
              : "Drop an image here, paste a copied photo, or choose one from your device."}
          </p>
          <Button data-modal-autofocus onClick={() => picker.current?.click()}>
            <ImagePlus size={17} />
            {state.preview ? "Choose another photo" : "Choose a photo"}
          </Button>
          <small>JPG, PNG or WebP · Up to 10 MB</small>
        </div>
        {state.preview && (
          <div
            className="image-search-outcome"
            aria-busy={state.phase === "loading"}
          >
            {state.phase === "loading" && (
              <div className="image-search-progress" role="status">
                <LoaderCircle className="spin" size={30} strokeWidth={1.5} />
                <h3>Finding similar items</h3>
                <p>{state.message}</p>
                <small>The first search may take a little longer.</small>
              </div>
            )}
            {state.phase === "done" && (
              <>
                <div className="image-search-results-heading">
                  <h3>
                    {state.matches.length
                      ? "Similar items"
                      : "No close matches yet"}
                  </h3>
                  <span>
                    {state.matches.length
                      ? `${state.matches.length} suggestions`
                      : "Try another photo"}
                  </span>
                </div>
                {state.matches.length ? (
                  <>
                    <p className="image-match-note">
                      Matched by appearance. Check the model and specifications
                      before ordering.
                    </p>
                    <div className="visual-match-grid">
                      {state.matches.map(({ product }) => (
                        <a
                          href={productPath(product)}
                          key={product.id}
                          onClick={close}
                          className="visual-match"
                        >
                          <span>
                            <img src={product.image} alt="" loading="lazy" />
                          </span>
                          <small>{categoryName(product.category)}</small>
                          <h4>{product.name}</h4>
                          <ProductOffer product={product} compact />
                          <span className="visual-match-open">
                            View item
                            <ArrowRight size={13} />
                          </span>
                        </a>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="image-match-note">
                    Use a clear, centred photo with a simple background. Our
                    current catalogue may not contain a similar item.
                  </p>
                )}
              </>
            )}
            {state.phase === "error" && (
              <div className="image-search-error" role="alert">
                <h3>Let’s try that again</h3>
                <p>{state.message}</p>
                <Button
                  variant="secondary"
                  onClick={() => picker.current?.click()}
                >
                  Choose another photo
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      {state.phase === "error" && !state.preview && (
        <p className="image-search-validation" role="alert">
          {state.message}
        </p>
      )}
      <div className="image-search-privacy">
        <ShieldCheck size={15} />
        <span>
          Your photo stays on this device. Image matching runs in your browser.
        </span>
      </div>
    </Modal>
  )
}
