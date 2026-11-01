import React, { useState } from "react"
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  CircleHelp,
  MessageCircle,
  ShieldCheck,
  Star,
  Truck,
} from "lucide-react"
import { Badge, Button } from "./ui.jsx"
import { PaymentMarks, ProductGrid, SectionHeading } from "./storefront.jsx"
import { categoryName } from "../data/catalog.js"
import {
  buyingQuestions,
  filterReviews,
  galleryImages,
  productInformation,
} from "../lib/product-experience.js"
import { dateLabel } from "../lib/api.js"
import { ProductSectionNav } from "./ProductSectionNav.jsx"

export function ProductSections({
  product: p,
  products,
  settings,
  reviews,
  reviewError,
  onWriteReview,
}) {
  const information = productInformation(p)
  const images = galleryImages(p)
  const [expandedSpecs, setExpandedSpecs] = useState(false)
  const [reviewRating, setReviewRating] = useState("all")
  const [reviewSort, setReviewSort] = useState("newest")
  const [reviewLimit, setReviewLimit] = useState(5)
  const specs = [
    ["Brand", p.brand],
    ["Product", p.name],
    ["Product code", p.sku],
    ...information.specifications,
    ["Condition", p.condition],
    ...(p.warranty ? [["Warranty", p.warranty]] : []),
  ]
  const filtered = filterReviews(reviews, reviewRating, reviewSort)
  const average = reviews.length
    ? (
        reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      ).toFixed(1)
    : null
  const contactNumber = (settings.whatsapp || settings.phone || "")
    .replace(/\D/g, "")
    .replace(/^0/, "256")
  const askLink = contactNumber
    ? `https://wa.me/${contactNumber}?text=${encodeURIComponent(`Hello London Tech, I have a question about ${p.name} (${p.sku}).`)}`
    : "/contact/"
  const highlights = information.highlights.length
    ? information.highlights
    : information.specifications
        .slice(0, 4)
        .map(([title, body]) => ({ title, body }))
  const related = products
    .filter((product) => product.category === p.category && product.id !== p.id)
    .slice(0, 4)
  const complementaryCategories = {
    mobiles: ["accessories", "audio", "watches"],
    laptops: ["bags", "accessories", "audio"],
    tablets: ["accessories", "audio"],
    audio: ["mobiles", "accessories"],
    watches: ["mobiles", "accessories"],
    gaming: ["game-discs", "accessories", "audio"],
    cameras: ["bags", "accessories"],
  }[p.category] || ["accessories", "audio", "mobiles"]
  const more = complementaryCategories
    .flatMap((category) =>
      products
        .filter(
          (product) => product.category === category && product.id !== p.id,
        )
        .slice(0, 2),
    )
    .slice(0, 6)

  return (
    <>
      <ProductSectionNav productId={p.id} reviewCount={reviews.length} />
      <div className="detail-longform">
        <div className="detail-main-content">
          <section
            id="product-overview"
            className="detail-section"
            aria-labelledby="overview-heading"
          >
            <h2 id="overview-heading">Highlights</h2>
            <div className="detail-highlight-grid">
              {highlights.slice(0, 6).map(({ title, body }) => (
                <article key={title}>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              ))}
            </div>
          </section>

          <section
            id="product-specifications"
            className="detail-section"
            aria-labelledby="specifications-heading"
          >
            <div className="detail-heading-row">
              <div>
                <h2 id="specifications-heading">Specifications</h2>
              </div>
              <span className="detail-count">{specs.length} details</span>
            </div>
            <dl
              className="detail-specifications"
              id="product-specification-list"
            >
              {(expandedSpecs ? specs : specs.slice(0, 8)).map(
                ([label, value], index) => (
                  <div key={`${label}-${index}`}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ),
              )}
            </dl>
            {specs.length > 8 && (
              <Button
                variant="secondary detail-expand"
                aria-expanded={expandedSpecs}
                aria-controls="product-specification-list"
                onClick={() => setExpandedSpecs(!expandedSpecs)}
              >
                {expandedSpecs
                  ? "Show fewer specifications"
                  : `View all ${specs.length} specifications`}
                <ChevronDown
                  size={16}
                  className={expandedSpecs ? "is-open" : ""}
                />
              </Button>
            )}
            <p className="detail-footnote">
              Specifications describe the listed model or product family.
              Features and accessories may vary by region, generation and
              configuration.
            </p>
            {information.sources.length > 0 && (
              <details className="detail-source-disclosure">
                <summary>Manufacturer information & sources</summary>
                <ul>
                  {information.sources.map(({ label, url }) => (
                    <li key={url}>
                      <a href={url} target="_blank" rel="noreferrer">
                        {label}
                        <ArrowUpRight size={14} />
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>

          <section
            id="product-reviews"
            className="detail-section"
            aria-labelledby="reviews-heading"
          >
            <div className="detail-heading-row">
              <div>
                <h2 id="reviews-heading">
                  Reviews{" "}
                  <span className="detail-title-count">({reviews.length})</span>
                </h2>
              </div>
              <Button variant="secondary" onClick={onWriteReview}>
                Write a review
              </Button>
            </div>
            {reviewError && (
              <p className="detail-inline-note" role="status">
                Reviews could not be loaded. Please refresh this page to try
                again.
              </p>
            )}
            <div className="detail-review-summary">
              <div className="detail-review-average">
                <strong>
                  {average || "—"}
                  <small>/ 5</small>
                </strong>
                <span
                  className="review-stars"
                  aria-label={
                    average ? `${average} out of 5 stars` : "No ratings yet"
                  }
                >
                  {average
                    ? "★".repeat(Math.round(Number(average))) +
                      "☆".repeat(5 - Math.round(Number(average)))
                    : "☆☆☆☆☆"}
                </span>
                <span>
                  {reviews.length
                    ? `${reviews.length} verified purchase${
                        reviews.length === 1 ? "" : "s"
                      }`
                    : "Be the first to share your experience"}
                </span>
              </div>
              <div className="detail-rating-bars">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = reviews.filter(
                    (r) => r.rating === rating,
                  ).length
                  return (
                    <button
                      key={rating}
                      aria-label={`Show ${rating}-star reviews, ${count} reviews`}
                      aria-pressed={reviewRating === String(rating)}
                      onClick={() => {
                        setReviewRating(String(rating))
                        setReviewLimit(5)
                      }}
                    >
                      <span>
                        {rating}
                        <Star size={12} fill="currentColor" />
                      </span>
                      <span className="rating-track">
                        <span
                          style={{
                            width: `${
                              reviews.length
                                ? (count / reviews.length) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </span>
                      <span>{count}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="detail-review-toolbar">
              <label>
                Rating
                <select
                  value={reviewRating}
                  onChange={(e) => {
                    setReviewRating(e.target.value)
                    setReviewLimit(5)
                  }}
                >
                  <option value="all">All ratings</option>
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <option key={rating} value={rating}>
                      {rating} star{rating === 1 ? "" : "s"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sort by
                <select
                  value={reviewSort}
                  onChange={(e) => {
                    setReviewSort(e.target.value)
                    setReviewLimit(5)
                  }}
                >
                  <option value="newest">Most recent</option>
                  <option value="highest">Highest rating</option>
                  <option value="lowest">Lowest rating</option>
                </select>
              </label>
              <span>
                <ShieldCheck size={15} />
                Verified purchases only
              </span>
            </div>
            {filtered.length > 0 ? (
              <>
                <div className="review-list detail-review-list">
                  {filtered.slice(0, reviewLimit).map((review) => (
                    <article key={review.id}>
                      <div className="detail-review-person">
                        <span
                          className="detail-review-avatar"
                          aria-hidden="true"
                        >
                          {(review.name || "Customer").charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <strong>{review.name || "Customer"}</strong>
                          <span>
                            <span
                              className="review-stars"
                              aria-label={`${review.rating} out of 5 stars`}
                            >
                              {"★".repeat(review.rating)}
                              {"☆".repeat(5 - review.rating)}
                            </span>
                            <Badge type="success">Verified purchase</Badge>
                          </span>
                        </div>
                        <time dateTime={review.created_at}>
                          {dateLabel(review.created_at)}
                        </time>
                      </div>
                      <h3>{review.title}</h3>
                      <p>{review.body}</p>
                    </article>
                  ))}
                </div>
                {filtered.length > reviewLimit && (
                  <Button
                    variant="secondary detail-expand"
                    onClick={() => setReviewLimit(reviewLimit + 5)}
                  >
                    View more reviews
                    <ChevronDown size={16} />
                  </Button>
                )}
              </>
            ) : (
              <div className="detail-empty-reviews">
                <MessageCircle size={28} strokeWidth={1.4} />
                <h3>
                  {reviews.length
                    ? "No reviews with this rating yet."
                    : "Your experience can help someone choose."}
                </h3>
                <p>
                  {reviews.length
                    ? "Choose another rating to see more customer experiences."
                    : "Reviews appear here after a verified purchase. Share what you liked and what other shoppers should know."}
                </p>
                {reviewRating !== "all" && (
                  <button
                    className="text-link"
                    onClick={() => setReviewRating("all")}
                  >
                    Show all reviews
                    <ArrowRight size={15} />
                  </button>
                )}
              </div>
            )}
          </section>

          <section
            id="product-description"
            className="detail-section"
            aria-labelledby="description-heading"
          >
            <h2 id="description-heading">Product description</h2>
            <p className="detail-lead">{information.description}</p>
            {images.length > 1 && (
              <div className="detail-story-gallery">
                {images.slice(1, 4).map((image) => (
                  <figure key={image.src}>
                    <img
                      src={image.src}
                      alt={image.alt}
                      loading="lazy"
                      decoding="async"
                    />
                    <figcaption>{image.alt}</figcaption>
                  </figure>
                ))}
              </div>
            )}
            <div className="detail-package-note">
              <h3>What’s in the box</h3>
              <p>
                {p.inTheBox ||
                  "Included accessories vary by configuration. Ask us about the exact bundle before ordering."}
              </p>
            </div>
          </section>

          <section
            id="product-guides"
            className="detail-section"
            aria-labelledby="guides-heading"
          >
            <h2 id="guides-heading">Guides & product support</h2>
            <div className="detail-guide-list">
              {information.guides.map(({ label, url }) => (
                <a href={url} key={url} target="_blank" rel="noreferrer">
                  <BookOpen size={22} />
                  <span>
                    <strong>{label}</strong>
                    <small>
                      Official manufacturer support · opens in a new tab
                    </small>
                  </span>
                  <ArrowUpRight size={18} />
                </a>
              ))}
              <a
                href={askLink}
                target={contactNumber ? "_blank" : undefined}
                rel="noreferrer"
              >
                <CircleHelp size={22} />
                <span>
                  <strong>Setup & compatibility</strong>
                  <small>
                    Get help choosing the right guide for this model.
                  </small>
                </span>
                <ArrowUpRight size={18} />
              </a>
            </div>
          </section>

          <section
            id="product-delivery"
            className="detail-section"
            aria-labelledby="delivery-heading"
          >
            <h2 id="delivery-heading">Delivery, collection & returns</h2>
            <div className="detail-service-grid">
              <article>
                <Truck size={25} />
                <h3>Delivery & collection</h3>
                <p>{p.delivery || settings.delivery}</p>
                <a href="/delivery/" className="text-link">
                  Delivery information
                  <ArrowRight size={15} />
                </a>
              </article>
              <article>
                <ShieldCheck size={25} />
                <h3>Returns & warranty</h3>
                <p>{p.warranty || settings.returns}</p>
                <a href="/returns/" className="text-link">
                  Read the policy
                  <ArrowRight size={15} />
                </a>
              </article>
            </div>
            <div className="detail-payment-panel">
              <span>
                <ShieldCheck size={21} />
                <span>
                  <strong>Payment options</strong>
                  <small>
                    MTN Mobile Money, Airtel Money or Visa through Flutterwave.
                  </small>
                </span>
              </span>
              <PaymentMarks />
            </div>
          </section>

          <section
            id="product-questions"
            className="detail-section"
            aria-labelledby="questions-heading"
          >
            <div className="detail-heading-row">
              <div>
                <h2 id="questions-heading">Questions & answers</h2>
              </div>
              <a
                href={askLink}
                target={contactNumber ? "_blank" : undefined}
                rel="noreferrer"
                className="text-link"
              >
                Ask about this item
                <MessageCircle size={16} />
              </a>
            </div>
            <div className="detail-questions">
              {buyingQuestions(p, settings).map(([question, answer]) => (
                <details key={question}>
                  <summary>
                    <CircleHelp size={18} />
                    {question}
                    <ChevronDown size={17} />
                  </summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section
            id="product-store"
            className="detail-store-summary"
            aria-labelledby="store-heading"
          >
            <div>
              <h2 id="store-heading">Sold by London Tech</h2>
              <p>{settings.address}</p>
            </div>
            <a href="/contact/" className="text-link">
              Store information <ArrowUpRight size={15} />
            </a>
          </section>
        </div>
      </div>
      {more.length > 0 && (
        <section className="section detail-more">
          <SectionHeading
            title="You may also like"
            href={`/collections/${p.category}/`}
            link="Explore the store"
          />
          <ProductGrid
            products={[...related.slice(0, 2), ...more.slice(0, 2)]}
          />
        </section>
      )}
    </>
  )
}
