import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react"

import { products as seed, storeDefaults } from "./data/catalog.js"

import { api, readStorage, writeStorage, post } from "./lib/api.js"

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
  const [products, setProducts] = useState(seed),
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
    [cartOpen, setCartOpen] = useState(false)

  const notify = useCallback((message) => setToast(message), [])

  const refresh = useCallback(async () => {
    const data = await api("catalog")
    setProducts(data.products)
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
    api("wishlist")
      .then(({ ids }) =>
        setWishlist((local) => [...new Set([...local, ...ids])]),
      )
      .catch(() => {})
  }, [user?.id])

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
    setWishlist(ids)
    if (user)
      api("wishlist", { method: "PUT", body: { ids } }).catch(() =>
        notify("Saved on this device. Account sync is unavailable."),
      )
  }

  const toggleWish = (id) => {
    const next = wishlist.includes(id)
      ? wishlist.filter((p) => p !== id)
      : [...wishlist, id]
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
