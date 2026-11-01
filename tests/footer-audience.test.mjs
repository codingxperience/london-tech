import { before, after, beforeEach, afterEach, test } from "node:test"
import assert from "node:assert/strict"
import React, { act } from "react"
import { createServer } from "vite"
import { Window } from "happy-dom"

let server,
  dom,
  createRoot,
  NewsletterSignup,
  SocialLinks,
  BackToTop,
  socialProfile,
  root,
  container
let reduced = false
let requests = []
let reply = {
  ok: true,
  body: {
    subscribed: true,
    unsubscribeUrl: "/unsubscribe/?token=" + "a".repeat(64),
  },
}
const globals = new Map()

before(async () => {
  dom = new Window({ url: "http://localhost/" })
  const values = {
    window: dom,
    document: dom.document,
    navigator: dom.navigator,
    HTMLElement: dom.HTMLElement,
    HTMLInputElement: dom.HTMLInputElement,
    Event: dom.Event,
    IS_REACT_ACT_ENVIRONMENT: true,
    fetch: async (url, options) => {
      requests.push({ url, options })
      return {
        ok: reply.ok,
        status: reply.ok ? 200 : 503,
        json: async () => reply.body,
      }
    },
  }
  for (const [key, value] of Object.entries(values)) {
    globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    })
  }
  dom.matchMedia = () => ({ matches: reduced })
  ;({ createRoot } = await import("react-dom/client"))
  server = await createServer({
    cacheDir: ".cache/vite-tests/footer-audience",
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: "custom",
    optimizeDeps: { noDiscovery: true },
  })
  ;({ NewsletterSignup } = await server.ssrLoadModule(
    "/src/components/NewsletterSignup.jsx",
  ))
  ;({ SocialLinks, socialProfile } = await server.ssrLoadModule(
    "/src/components/SocialLinks.jsx",
  ))
  ;({ BackToTop } = await server.ssrLoadModule("/src/components/BackToTop.jsx"))
})

beforeEach(() => {
  container = dom.document.createElement("div")
  dom.document.body.append(container)
  requests = []
  reduced = false
  reply = {
    ok: true,
    body: {
      subscribed: true,
      unsubscribeUrl: "/unsubscribe/?token=" + "a".repeat(64),
    },
  }
  Object.defineProperty(dom, "scrollY", {
    configurable: true,
    writable: true,
    value: 0,
  })
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  container.remove()
})

after(async () => {
  await server?.close()
  await dom?.happyDOM.close()
  for (const [key, descriptor] of globals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
})

async function render(Component, props) {
  root = createRoot(container)
  await act(async () => root.render(React.createElement(Component, props)))
}
async function submit() {
  await act(async () =>
    container
      .querySelector("form")
      .dispatchEvent(
        new dom.Event("submit", { bubbles: true, cancelable: true }),
      ),
  )
}
async function fillEmail() {
  const input = container.querySelector('input[type="email"]')
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      dom.HTMLInputElement.prototype,
      "value",
    ).set.call(input, "shopper@example.com")
    input.dispatchEvent(new dom.Event("input", { bubbles: true }))
  })
}

test("newsletter requires consent and confirms only a subscription saved by the service", async () => {
  await render(NewsletterSignup)
  await fillEmail()
  await submit()
  assert.equal(requests.length, 0)
  assert.match(container.querySelector('[role="alert"]').textContent, /agree/)
  await act(async () =>
    container.querySelector('input[type="checkbox"]').click(),
  )
  await submit()
  assert.equal(requests.length, 1)
  assert.equal(requests[0].url, "/api/newsletter/subscribe")
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    email: "shopper@example.com",
    consent: true,
  })
  assert.match(
    container.querySelector('[role="status"]').textContent,
    /subscription is saved/,
  )
  assert.equal(
    container.querySelector('a[href^="/unsubscribe/"]').getAttribute("href"),
    reply.body.unsubscribeUrl,
  )
  assert.doesNotMatch(
    container.textContent,
    /email (sent|delivered)|check your inbox/i,
  )
})

test("newsletter service failure preserves the form without a false success state", async () => {
  reply = {
    ok: false,
    body: {
      error:
        "Newsletter subscriptions are unavailable. Please try again later.",
    },
  }
  await render(NewsletterSignup)
  await fillEmail()
  await act(async () =>
    container.querySelector('input[type="checkbox"]').click(),
  )
  await submit()
  assert.equal(container.querySelector('[role="status"]'), null)
  assert.match(
    container.querySelector('[role="alert"]').textContent,
    /unavailable/,
  )
  assert.equal(
    container.querySelector('input[type="email"]').value,
    "shopper@example.com",
  )
})

test("social navigation links only configured matching HTTPS profiles and retains all five large marks", async () => {
  assert.equal(socialProfile("facebook", "javascript:alert(1)"), null)
  assert.equal(
    socialProfile("facebook", "https://facebook.com.evil.example/london"),
    null,
  )
  assert.equal(socialProfile("facebook", "https://facebook.com/"), null)
  assert.equal(socialProfile("instagram", "https://x.com/london"), null)
  await render(SocialLinks, {
    profiles: { tiktok: "https://www.tiktok.com/@londontech.ug" },
  })
  assert.equal(container.querySelectorAll("svg").length, 5)
  assert.equal(container.querySelectorAll("a").length, 1)
  assert.equal(
    container.querySelector("a").href,
    "https://www.tiktok.com/@londontech.ug",
  )
  assert.match(
    container.querySelector("a").getAttribute("aria-label"),
    /TikTok/,
  )
  assert.equal(container.querySelectorAll(".is-pending").length, 4)
})

test("back-to-top appears after scrolling, returns focus to content and respects reduced motion", async () => {
  const main = dom.document.createElement("main")
  main.innerHTML = "<h1>Shop the collection</h1>"
  dom.document.body.append(main)
  const scrolls = []
  dom.scrollTo = (options) => scrolls.push(options)
  await render(BackToTop)
  assert.equal(container.querySelector("button"), null)
  await act(async () => {
    dom.scrollY = 700
    dom.dispatchEvent(new dom.Event("scroll"))
  })
  await act(async () => container.querySelector("button").click())
  assert.deepEqual(scrolls[0], { top: 0, behavior: "smooth" })
  assert.equal(dom.document.activeElement, main.querySelector("h1"))
  reduced = true
  await act(async () => container.querySelector("button").click())
  assert.deepEqual(scrolls[1], { top: 0, behavior: "instant" })
  main.remove()
})
