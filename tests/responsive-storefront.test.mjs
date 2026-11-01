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
          <a class="utility-call">Call</a><a class="utility-centre">Phones & laptops</a><div class="utility-brand-lockup">Brand</div>
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
      if (width <= 800) {
        for (const selector of [
          ".utility-call",
          ".utility-centre",
          ".utility-brand-lockup",
        ]) {
          const computed = style(selector)
          // The CSS optimizer may combine the row/column into grid-area.
          const row = computed.gridRow || computed.gridArea.split("/")[0].trim()
          assert.equal(
            row,
            "1",
            `${selector} stays in the shared row at ${width}px`,
          )
        }
      }
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

test("admin typography stays readable on small, medium and large screens", async () => {
  const directory = "dist/assets/",
    files = await readdir(directory)
  const main = files.find((n) => /^index-.*\.css$/.test(n)),
    admin = files.find((n) => /^admin-.*\.css$/.test(n))
  assert.ok(admin, "Administration styles are split from the storefront")
  const css = (
    (await readFile(directory + main, "utf8")) +
    "\n" +
    (await readFile(directory + admin, "utf8"))
  ).replace(/@import[^;]+;/g, "")
  for (const width of [320, 768, 1440]) {
    const win = new Window({
      width,
      height: 900,
      settings: {
        disableCSSFileLoading: true,
        disableJavaScriptFileLoading: true,
      },
    })
    try {
      win.document.body.innerHTML = `<style>${css}</style><div class="admin-shell"><aside class="admin-sidebar"><nav><a>Products</a></nav></aside><div class="admin-workspace"><main class="admin-main"><label class="field"><span>Product name</span><input/></label><table class="admin-table"><tbody><tr><td>Product</td></tr></tbody></table><div class="plot-x-axis">November</div></main></div></div>`
      const size = (s) =>
        Number.parseFloat(
          win.getComputedStyle(win.document.querySelector(s)).fontSize,
        )
      assert.ok(size(".admin-sidebar nav a") >= 14, `Navigation at ${width}px`)
      assert.ok(size(".field input") >= 14, `Fields at ${width}px`)
      assert.ok(size(".admin-table td") >= 13, `Table at ${width}px`)
      assert.ok(size(".plot-x-axis") >= 12, `Axis labels at ${width}px`)
    } finally {
      await win.happyDOM.close()
    }
  }
})
