import { SeoMetadata } from "./components/SeoMetadata.jsx"
import { ManagedPage } from "./components/ManagedPage.jsx"
import { Unsubscribe } from "./pages/unsubscribe.jsx"
import { recordStoreVisit } from "./lib/visit-tracking.js"
import React, { useEffect } from "react"
import ReferenceStorefront from "./App.tsx"
import { StoreProvider, usePath, useStore, navigate } from "./store.jsx"
import { SearchDialog, CartDrawer } from "./components/storefront.jsx"
import { ImageSearchDialog } from "./components/ImageSearchDialog.jsx"
import { Collection, Product, Compare, NotFound } from "./pages/shop.jsx"
import { Cart, Checkout, PaymentResult } from "./pages/checkout.jsx"
import { Auth, Account } from "./pages/account.jsx"
import { Info } from "./pages/info.jsx"
import { Button, Modal } from "./components/ui.jsx"
import { localReturnPath } from "./lib/navigation.js"
import { GitCompareArrows } from "lucide-react"
import "./commerce.css"
import "./product-detail.css"
import "./shopping-experience.css"
import "./offer-details.css"
import "./account-experience.css"
const Admin = React.lazy(() => import("./pages/admin.jsx"))
class ErrorBoundary extends React.Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error) {
    console.error("London Tech view failed:", error)
  }
  render() {
    return this.state.failed ? (
      <div className="commerce-surface">
        <main className="container standard-page">
          <div className="empty-state">
            <h1>Let’s get you back to the store.</h1>
            <p>
              This view could not be opened. Your cart is saved on this device.
            </p>
            <Button onClick={() => location.assign("/")}>
              Open London Tech
            </Button>
          </div>
        </main>
      </div>
    ) : (
      this.props.children
    )
  }
}
function RouterContent({ path }) {
  const normalized = path.split("?")[0].replace(/\/+$/, "") || "/"
  const {
    searchOpen,
    cartOpen,
    imageSearchOpen,
    setImageSearchOpen,
    products,
    compare,
    authDialog,
    setAuthDialog,
    closeAuth,
    config,
  } = useStore()
  const admin = /^\/admin(?:\/|$)/.test(normalized)
  useEffect(() => {
    recordStoreVisit({ path: normalized, enabled: config.analytics === true })
  }, [normalized, config.analytics])
  useEffect(() => closeAuth(), [normalized, closeAuth])
  useEffect(() => setImageSearchOpen(false), [normalized, setImageSearchOpen])
  const authModes = {
    "/login": "login",
    "/register": "register",
    "/forgot-password": "forgot",
    "/reset-password": "reset",
  }
  if (authModes[normalized])
    return (
      <div className="commerce-surface">
        <main className="auth-route">
          <Auth
            key={normalized}
            mode={authModes[normalized]}
            onClose={() =>
              navigate(
                localReturnPath(
                  new URLSearchParams(location.search).get("next"),
                  "/",
                ),
              )
            }
          />
        </main>
      </div>
    )
  if (admin) {
    const parts = normalized.split("/").filter(Boolean),
      preview = parts[1] === "preview",
      section = parts[preview ? 2 : 1] || "dashboard"
    return (
      <div className="commerce-surface">
        <React.Suspense
          fallback={
            <div className="admin-gate">
              <p>Opening the store console…</p>
            </div>
          }
        >
          <Admin
            key={preview ? "preview" : "live"}
            section={section}
            search={path.split("?")[1] || ""}
            preview={preview}
          />
        </React.Suspense>
      </div>
    )
  }
  let page
  if (normalized === "/") page = undefined
  else if (normalized.startsWith("/products/"))
    page = <Product id={decodeURIComponent(normalized.split("/")[2])} />
  else if (normalized.startsWith("/pages/"))
    page = <ManagedPage slug={normalized.split("/")[2]} />
  else if (normalized.startsWith("/collections/")) {
    const category = normalized.split("/")[2]
    page =
      category === "visit" ? (
        <Info page="contact" />
      ) : (
        <Collection category={category} />
      )
  } else if (normalized === "/wishlist") page = <Account section="wishlist" />
  else if (normalized === "/compare") page = <Compare />
  else if (normalized === "/cart") page = <Cart />
  else if (normalized === "/checkout") page = <Checkout />
  else if (normalized === "/checkout/result") page = <PaymentResult />
  else if (normalized === "/unsubscribe")
    page = (
      <Unsubscribe
        token={new URLSearchParams(path.split("?")[1] || "").get("token")}
      />
    )
  else if (normalized.startsWith("/account")) {
    const parts = normalized.split("/")
    page = <Account section={parts[2] || "overview"} orderId={parts[3]} />
  } else if (
    [
      "about",
      "contact",
      "visit",
      "delivery",
      "returns",
      "help",
      "privacy",
      "terms",
    ].includes(normalized.slice(1))
  )
    page = <Info page={normalized.slice(1)} />
  else page = <NotFound />
  return (
    <>
      <ReferenceStorefront
        quiet={["/contact", "/visit", "/collections/visit"].includes(
          normalized,
        )}
      >
        {page && (
          <ErrorBoundary key={normalized}>
            <React.Fragment key={path}>{page}</React.Fragment>
          </ErrorBoundary>
        )}
      </ReferenceStorefront>
      <div className="commerce-surface">
        {authDialog && (
          <Modal
            title={
              authDialog.mode === "register"
                ? "Create your London Tech account"
                : "Sign in to London Tech"
            }
            wide
            className="auth-dialog"
            onClose={closeAuth}
          >
            <Auth
              mode={authDialog.mode}
              next={authDialog.next}
              dialog
              onClose={closeAuth}
              onModeChange={(mode) => setAuthDialog({ ...authDialog, mode })}
            />
          </Modal>
        )}
        {searchOpen && <SearchDialog />}
        {imageSearchOpen && <ImageSearchDialog />}
        {cartOpen && <CartDrawer />}
        {compare.length > 0 && (
          <a className="compare-float" href="/compare/">
            <GitCompareArrows size={16} />
            Compare<b>{compare.length}</b>
          </a>
        )}
      </div>
    </>
  )
}
function Router() {
  const path = usePath()
  return (
    <>
      <SeoMetadata path={path} />
      <RouterContent path={path} />
    </>
  )
}

export default function CommerceApp({
  initialData = null,
  initialPath = undefined,
} = {}) {
  return (
    <ErrorBoundary>
      <StoreProvider initialData={initialData} initialPath={initialPath}>
        <Router />
      </StoreProvider>
    </ErrorBoundary>
  )
}
