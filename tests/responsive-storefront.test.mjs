import { test } from "node:test"
import assert from "node:assert/strict"
import { readFile, readdir } from "node:fs/promises"
import { Window } from "happy-dom"

test("the production CSS keeps utility content visible and supplies a contained section picker on phones and tablets", async () => {
  const directory = "dist/assets/"
  const filename = (await readdir(directory)).find((name) =>
    /^index-.*\.css$/.test(name),
  )
  const css = (await readFile(directory + filename, "utf8")).replace(
    /@import[^;]+;/g,
    "",
  )
  // This checks the complete built stylesheet, including the old mobile rules
  // that used to hide every announcement link. It does not simulate layout.
  for (const width of [320, 375, 768, 1024, 1440]) {
    const win = new Window({
      width,
      height: 900,
      settings: {
        disableCSSFileLoading: true,
        disableJavaScriptFileLoading: true,
      },
    })
    try {
      win.document.body.innerHTML = `<style>${css}</style>
        <div class="utility-bar utility-banner"><div class="utility-banner-stage store-container">
          <a class="utility-call">Call</a><a class="utility-centre">Phones & laptops</a>
        </div></div>
        <div class="commerce-surface"><main class="product-page"><nav class="detail-section-nav">
          <div class="detail-mobile-nav"><select><option>Specifications</option></select></div>
          <div class="detail-section-rail"><a>Specifications</a></div>
        </nav></main></div>`
      const style = (selector) =>
        win.getComputedStyle(win.document.querySelector(selector))
      assert.equal(style(".utility-call").display, "flex", `Call at ${width}px`)
      assert.equal(
        style(".utility-centre").display,
        "grid",
        `Message at ${width}px`,
      )
      assert.equal(style(".utility-banner").overflow, "hidden")
      assert.equal(
        style(".detail-section-rail").display,
        width <= 1100 ? "none" : "flex",
      )
      assert.equal(
        style(".detail-mobile-nav").display,
        width <= 1100 ? "grid" : "none",
      )
      assert.equal(style(".detail-section-nav").maxWidth, "100%")
    } finally {
      await win.happyDOM.close()
    }
  }
})
