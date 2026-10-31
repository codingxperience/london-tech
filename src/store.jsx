import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react"

import { products as seed, storeDefaults } from "./data/catalog.js"

import { api, readStorage, writeStorage, post } from "./lib/api.js"
import { galleryImages } from "./lib/product-experience.js"

const presentProduct = (product) => ({
  ...product,
  image: galleryImages(product)[0]?.src || product.image,
})

const Context = createContext(/** @type {any} */ (null))

export const useStore = () => useContext(Context)

export function usePath() {
  const [path, setPath] = useState(location.pathname + location.search)
  useEffect(() => {
    const change = () => {
      setPath(location.pathname + location.search)
      window.scrollTo({ top: 0, behavior: "instant" })
    }
    window.addEventListener("popstate", change)
    const click = (e) => {
      const a = e.target.closest("a[href]")
      if (
        !a ||
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        a.target ||
        a.hasAttribute("download")
      )
        return
      const url = new URL(a.href)
      if (url.origin !== location.origin || url.pathname.startsWith("/api/"))
        return
      if (url.hash && url.pathname === location.pathname) return
      e.preventDefault()
      history.pushState({}, "", url)
      change()
    }
    document.addEventListener("click", click)
    return () => {
      window.removeEventListener("popstate", change)
      document.removeEventListener("click", click)
    }
  }, [])
  return path
}

export const navigate = (path) => {
  history.pushState({}, "", path)
  window.dispatchEvent(new PopStateEvent("popstate"))
}

const validLines = (lines) =>
  Array.isArray(lines)
    ? lines
        .filter((p) => p && typeof p.id === "string")
        .slice(0, 30)
        .map((p) => ({
          id: p.id,
          quantity: Math.min(10, Math.max(1, Number(p.quantity) || 1)),
          option: String(p.option || ""),
          color: String(p.color || ""),
        }))
    : []

const validIds = (value) =>
  Array.isArray(value)
    ? [...new Set(value.filter((id) => typeof id === "string"))].slice(0, 200)
    : []

export const cartKey = (line) => [line.id, line.option, line.color].join("|")

export function StoreProvider({ children }) {
  const [products, setProducts] = useState(() => seed.map(presentProduct)),
    [settings, setSettings] = useState(storeDefaults),
    [user, setUser] = useState(null),
    [authLoading, setAuthLoading] = useState(true),
    [config, setConfig] = useState({
      accounts: false,
      payments: false,
      currency: "UGX",
    })

  const [cart, setCart] = useState(() =>
      validLines(readStorage("lt.cart.v2", [])),
    ),
    [wishlist, setWishlist] = useState(() =>
      validIds(readStorage("lt.wishlist.v2", [])),
    ),
    [compare, setCompare] = useState(() =>
      validIds(readStorage("lt.compare.v2", [])).slice(0, 4),
    ),
    [recent, setRecent] = useState(() =>
      validIds(readStorage("lt.recent.v2", [])).slice(0, 12),
    )

  const [toast, setToast] = useState(""),
    [searchOpen, setSearchOpen] = useState(false),
    [cartOpen, setCartOpen] = useState(false),
    [authDialog, setAuthDialog] = useState(null)

  const closeAuth = useCallback(() => setAuthDialog(null), [])
  useEffect(() => {
    window.addEventListener("popstate", closeAuth)
    return () => window.removeEventListener("popstate", closeAuth)
  }, [closeAuth])
  const openAuth = useCallback(
    (mode = "login", next = location.pathname + location.search) => {
      setSearchOpen(false)
      setCartOpen(false)
      setAuthDialog({ mode, next })
    },
    [],
  )

  const notify = useCallback((message) => setToast(message), [])
  const currentWishlist = useRef(wishlist)
  const wishlistEdits = useRef(null)
  const wishlistWrites = useRef(Promise.resolve())
  const wishlistOwner = useRef(user?.id)
  currentWishlist.current = wishlist
  wishlistOwner.current = user?.id
  const syncWishlist = useCallback(
    (ids, owner) => {
      wishlistWrites.current = wishlistWrites.current
        .catch(() => {})
        .then(() => {
          if (wishlistOwner.current === owner)
            return api("wishlist", { method: "PUT", body: { ids } })
        })
        .catch(() =>
          notify("Saved on this device. Account sync is unavailable."),
        )
      return wishlistWrites.current
    },
    [notify],
  )

  const refresh = useCallback(async () => {
    const data = await api("catalog")
    setProducts(data.products.map(presentProduct))
    setSettings(data.settings)
  }, [])

  useEffect(() => {
    refresh().catch(() => {})
    api("config")
      .then(setConfig)
      .catch(() => {})
    api("auth/me")
      .then((data) => setUser(data.user))
      .catch(() => {})
      .finally(() => setAuthLoading(false))
  }, [])

  useEffect(() => writeStorage("lt.cart.v2", cart), [cart])

  useEffect(() => {
    writeStorage("lt.wishlist.v2", wishlist)
  }, [wishlist])

  useEffect(() => writeStorage("lt.compare.v2", compare), [compare])

  useEffect(() => writeStorage("lt.recent.v2", recent), [recent])

  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(""), 4200)
    return () => clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    if (!user) return
    let active = true
    const edits = new Map()
    wishlistEdits.current = edits
    api("wishlist")
      .then(({ ids }) => {
        if (!active) return
        const merged = new Set([...validIds(ids), ...currentWishlist.current])
        for (const [id, saved] of edits)
          saved ? merged.add(id) : merged.delete(id)
        const values = validIds([...merged])
        currentWishlist.current = values
        setWishlist(values)
        if (
          JSON.stringify([...validIds(ids)].sort()) !==
          JSON.stringify([...values].sort())
        )
          syncWishlist(values, user.id)
      })
      .catch(() => {})
      .finally(() => {
        if (wishlistEdits.current === edits) wishlistEdits.current = null
      })
    return () => {
      active = false
      if (wishlistEdits.current === edits) wishlistEdits.current = null
    }
  }, [user?.id, syncWishlist])

  const addCart = (product, quantity = 1, option = "", color = "") => {
    if (product.stock === 0) {
      notify("This item is out of stock.")
      return
    }
    if (
      (product.options.length && !option) ||
      (product.colors.length && !color)
    ) {
      navigate("/products/" + product.id + "/")
      notify("Choose your preferred options first.")
      return
    }
    const key = cartKey({ id: product.id, option, color })
    setCart((old) => {
      const match = old.find((line) => cartKey(line) === key)
      return match
        ? old.map((line) =>
            cartKey(line) === key
              ? {
                  ...line,
                  quantity: Math.min(
                    10,
                    product.stock ?? 10,
                    line.quantity + quantity,
                  ),
                }
              : line,
          )
        : [
            ...old,
            {
              id: product.id,
              quantity: Math.min(10, product.stock ?? 10, quantity),
              option,
              color,
            },
          ]
    })
    notify("Added to your cart")
  }

  const updateCart = (key, quantity) =>
    setCart((old) =>
      old.map((p) => (cartKey(p) === key ? { ...p, quantity } : p)),
    )

  const removeCart = (key) =>
    setCart((old) => old.filter((p) => cartKey(p) !== key))

  const saveWishlist = (ids) => {
    currentWishlist.current = ids
    setWishlist(ids)
    if (user) syncWishlist(ids, user.id)
  }

  const toggleWish = (id) => {
    const next = wishlist.includes(id)
      ? wishlist.filter((p) => p !== id)
      : [...wishlist, id]
    wishlistEdits.current?.set(id, next.includes(id))
    saveWishlist(next)
    notify(
      next.includes(id) ? "Saved to your wishlist" : "Removed from wishlist",
    )
  }

  const toggleCompare = (id) => {
    if (compare.includes(id)) {
      setCompare(compare.filter((x) => x !== id))
      return
    }
    if (compare.length === 4) {
      notify("Compare up to four products at a time.")
      return
    }
    setCompare([...compare, id])
    notify("Added to comparison")
  }

  const viewProduct = useCallback(
    (id) =>
      setRecent((old) => [id, ...old.filter((x) => x !== id)].slice(0, 12)),
    [],
  )

  const logout = async () => {
    await post("auth/logout")
    setUser(null)
    navigate("/")
  }

  const lines = cart.map((line) => ({
    ...line,
    product: products.find((p) => p.id === line.id),
  }))

  const subtotal =
    lines.length && lines.every((p) => p.product?.price != null)
      ? lines.reduce((sum, p) => sum + p.quantity * p.product.price, 0)
      : null

  return (
    <Context.Provider
      value={{
        products,
        setProducts,
        settings,
        setSettings,
        user,
        setUser,
        authLoading,
        config,
        refresh,
        cart,
        setCart,
        lines,
        subtotal,
        wishlist,
        toggleWish,
        compare,
        toggleCompare,
        setCompare,
        recent,
        viewProduct,
        notify,
        searchOpen,
        setSearchOpen,
        cartOpen,
        setCartOpen,
        authDialog,
        setAuthDialog,
        openAuth,
        closeAuth,
        addCart,
        updateCart,
        removeCart,
        logout,
      }}
    >
      {children}
      {toast && (
        <div className="commerce-surface">
          <div className="toast" role="status">
            <span className="toast-dot" />
            {toast}
          </div>
        </div>
      )}
    </Context.Provider>
  )
}
