/**
 * Records the product demo, in real time, straight from the running app.
 *
 * Nothing here is sped up, slowed down or cut. The pauses you see are the
 * engine actually answering, because the claim the film makes is that a whole
 * design system arrives in under two seconds, and a demo that edits the clock
 * cannot make that claim. The only thing added to the page is a cursor: the
 * browser does not draw its own pointer into a capture, so without one the
 * clicks look like the UI operating itself.
 *
 * Run it with the dev server up:
 *   npm run demo:record
 *
 * Out: scripts/demo/out/demo.mp4 (1920x1080, H.264). The capture rig, and why
 * it is built the way it is, lives in `capture.mts`.
 */
import type { Page } from "playwright"

import { beats } from "./briefs.js"
import { FORMAT, film, wait } from "./capture.mjs"

async function main() {
  await film(FORMAT === "4x3" ? "demo-4x3" : "demo", async (page) => {
    await page.waitForSelector(".ui-fab")
    await installCursor(page)

    /* A beat on the untouched app. Without it the first restyle has nothing to
       be a change FROM, and the viewer spends the opener reconstructing what
       the app looked like a second ago instead of watching it turn over. */
    await wait(2.5)

    for (const [i, beat] of beats.entries()) {
      console.log(`[${i + 1}/${beats.length}] ${beat.brief}`)

      await clickAt(page, ".ui-fab")
      await page.waitForSelector("#style-brief", { state: "visible" })
      await wait(0.45)

      await clickAt(page, "#style-brief")
      /* Select-all before typing, so replacing the previous brief reads as an
         edit rather than as text appearing from nowhere. */
      if (i > 0) {
        await page.keyboard.press("ControlOrMeta+A")
        await wait(0.25)
      }
      await page.type("#style-brief", beat.brief, { delay: 28 })
      await wait(0.5)

      /* Enter sends. From here to the readout is the engine's own time, and it
         is the only part of the film that is not choreographed. */
      const t0 = Date.now()
      await page.keyboard.press("Enter")
      await page.waitForSelector("#style-brief[disabled]", { timeout: 5000 })
      await page.waitForSelector("#style-brief:not([disabled])", { timeout: 30000 })
      console.log(`     answered in ${Date.now() - t0}ms`)

      /* Long enough to read "4 calls · 1420 ms · USD 0.00070" under the field,
         which is the evidence for the claim the film is making. */
      await wait(1.6)

      await page.keyboard.press("Escape")
      await wait(beat.hold)
    }

    return beats[beats.length - 1].hold
  })
}

/**
 * A pointer drawn into the page, since the capture has none of its own.
 *
 * It lives outside React, on <html>, so a restyle cannot unmount it, and it
 * carries its own colours rather than the system's: it is the one thing on
 * screen that must stay legible against a canvas the engine is free to make
 * any colour it likes.
 */
async function installCursor(page: Page) {
  await page.evaluate(() => {
    const el = document.createElement("div")
    el.id = "__demo_cursor"
    el.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M5 2.5 19 12l-6.2 1.2L9.8 19.5Z" fill="#fff" stroke="#000"
            stroke-width="1.4" stroke-linejoin="round"/></svg>`
    el.style.cssText = [
      "position:fixed", "top:0", "left:0", "z-index:2147483647",
      "pointer-events:none", "transform:translate(-100px,-100px)",
      "transition:transform 620ms cubic-bezier(0.33,0.9,0.2,1)",
      "filter:drop-shadow(0 2px 5px rgba(0,0,0,.45))",
      "will-change:transform",
    ].join(";")
    document.documentElement.appendChild(el)

    const ring = document.createElement("div")
    ring.id = "__demo_ring"
    ring.style.cssText = [
      "position:fixed", "top:0", "left:0", "z-index:2147483646",
      "pointer-events:none", "width:30px", "height:30px", "margin:-15px 0 0 -15px",
      "border:2px solid rgba(255,255,255,.9)", "border-radius:50%",
      "box-shadow:0 0 0 1.5px rgba(0,0,0,.5)", "opacity:0",
      "transform:translate(-100px,-100px) scale(.4)",
    ].join(";")
    document.documentElement.appendChild(ring)
  })
}

/** Move the pointer to an element, let it land, then click it. */
async function clickAt(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox()
  if (!box) throw new Error(`no box for ${selector}`)
  const x = Math.round(box.x + box.width / 2)
  const y = Math.round(box.y + box.height / 2)

  await page.evaluate(([x, y]) => {
    const c = document.getElementById("__demo_cursor")
    if (c) c.style.transform = `translate(${x}px,${y}px)`
  }, [x, y] as const)
  await wait(0.68)

  await page.mouse.click(x, y)

  /* The ring is the only evidence a click happened: the page may answer 300ms
     later, and without it that gap reads as the video having stalled. */
  await page.evaluate(([x, y]) => {
    const r = document.getElementById("__demo_ring")
    if (!r) return
    r.style.transition = "none"
    r.style.transform = `translate(${x}px,${y}px) scale(.4)`
    r.style.opacity = "1"
    requestAnimationFrame(() => {
      r.style.transition = "transform 420ms ease-out, opacity 420ms ease-out"
      r.style.transform = `translate(${x}px,${y}px) scale(1.25)`
      r.style.opacity = "0"
    })
  }, [x, y] as const)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
