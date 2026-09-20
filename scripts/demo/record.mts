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
 * Out: scripts/demo/out/demo.mp4 (1920x1080, H.264).
 *
 * ── Why the capture is built this way ────────────────────────────────────
 * Playwright's own `recordVideo` writes VP8 at a bitrate chosen for test
 * artefacts, at one device pixel per CSS pixel. The first cut went out that
 * way and the text came back soft; re-encoding to H.264 afterwards cannot
 * restore detail the capture never sampled.
 *
 * The obvious repair, a context with `deviceScaleFactor: 2`, does not work
 * either, and the reason is worth writing down because it costs an hour to
 * rediscover: `page.screenshot()` honours that setting and returns 2560x1440,
 * but `Page.screencastFrame` ignores it and always hands back CSS pixels. The
 * density has to be forced on the whole browser at launch instead, which is
 * what `--force-device-scale-factor` does. Paired with a 1280 window it gives
 * a desktop layout rendered into 2560x1440 of real pixels.
 */
import { chromium } from "playwright"
import type { Page } from "playwright"
import { execFileSync } from "node:child_process"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { beats } from "./briefs.js"

const URL = process.env.DEMO_URL ?? "http://localhost:3000"
const OUT = join(import.meta.dirname, "out")
const RAW = join(OUT, "raw")

/**
 * Two deliverables, same film. `DEMO_FORMAT=4x3` selects the second.
 *
 * In both, the page is laid out at 1280 CSS pixels and rendered at twice that
 * density, and the two choices are separate. Laying out at 1280 rather than at
 * 1920 makes every control half again as large in the finished frame, which is
 * what a demo watched in a feed needs. Rendering at 2x and downscaling means
 * each delivered pixel is an average of several sampled ones, so type and
 * hairline borders survive the encode.
 *
 * 1280 is also a floor, not a preference: measured, the row of headline
 * figures holds four columns at 1280 and breaks to two below it, which also
 * takes the page from about 800px tall to 1441. Narrowing the viewport to make
 * the UI bigger is therefore not available.
 *
 * WHAT THE RATIO BUYS. The page's content runs 675 to 904 pixels tall
 * depending on the style the engine returns, so 16:9 (a 720 viewport) cuts the
 * bottom off five of the six beats, and 4:3 (960) fits all of them. The cost
 * is dead space: the same measurement leaves between 56 and 285 pixels of
 * empty page below the content, worst on the cyberpunk opener. Neither ratio
 * makes the interface any LARGER on a phone — both fill the card's width, so
 * the pixels land the same size either way. 4:3 shows more of the page and
 * takes more room in the feed; that is the whole of it.
 */
const FORMAT = process.env.DEMO_FORMAT === "4x3" ? "4x3" : "16x9"
const CSS_W = 1280
const CSS_H = FORMAT === "4x3" ? 960 : 720
const DPR = 2
const OUT_W = FORMAT === "4x3" ? 1440 : 1920
const OUT_H = 1080
const FPS = 30
const NAME = FORMAT === "4x3" ? "demo-4x3.mp4" : "demo.mp4"

const wait = (s: number) => new Promise((r) => setTimeout(r, s * 1000))

type Frame = { t: number; file: string }

async function main() {
  rmSync(RAW, { recursive: true, force: true })
  mkdirSync(RAW, { recursive: true })
  console.log(`${FORMAT} · page ${CSS_W}x${CSS_H} @${DPR}x · out ${OUT_W}x${OUT_H} · ${NAME}`)

  const browser = await chromium.launch({
    args: [
      `--force-device-scale-factor=${DPR}`,
      `--window-size=${CSS_W},${CSS_H}`,
      "--hide-scrollbars",
    ],
  })
  /* `viewport: null` hands the page the real window rather than overriding the
     metrics, which is what keeps the forced density in effect. Setting a
     viewport here would quietly put the capture back at 1x. */
  const context = await browser.newContext({
    viewport: null,
    colorScheme: "light",
    reducedMotion: "no-preference",
  })
  const page = await context.newPage()

  await page.goto(URL, { waitUntil: "networkidle" })
  await page.waitForSelector(".ui-fab")
  await installCursor(page)

  /* ── Capture ──────────────────────────────────────────────────────────── */
  const frames: Frame[] = []
  const client = await context.newCDPSession(page)
  let n = 0
  client.on("Page.screencastFrame", (f) => {
    const file = join(RAW, `f${String(n++).padStart(5, "0")}.png`)
    writeFileSync(file, Buffer.from(f.data, "base64"))
    /* Chrome stamps each frame with when it was actually presented. Keeping
       those stamps is what lets the film be reassembled at true speed later:
       the screencast only emits on change, so a four second hold arrives as a
       single frame and would otherwise collapse to 1/30th of a second. */
    frames.push({ t: f.metadata.timestamp ?? Date.now() / 1000, file })
    client.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {})
  })
  /* The ceiling has to be raised past the default or Chrome scales the frames
     down to fit it and gives back the very CSS-pixel image this setup exists
     to avoid. */
  await client.send("Page.startScreencast", {
    format: "png",
    everyNthFrame: 1,
    maxWidth: CSS_W * DPR,
    maxHeight: CSS_H * DPR,
  })

  /* A beat on the untouched app. Without it the first restyle has nothing to
     be a change FROM, and the viewer spends the opener reconstructing what the
     app looked like a second ago instead of watching it turn over. */
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

  await client.send("Page.stopScreencast").catch(() => {})
  /* The last hold produced no frames of its own, so give the closing image its
     time explicitly before the page goes away. */
  const tail = beats[beats.length - 1].hold
  await context.close()
  await browser.close()

  console.log(`\ncaptured ${frames.length} frames`)
  encode(frames, tail)
  rmSync(RAW, { recursive: true, force: true })
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

/**
 * Reassemble the frames at the speed they happened.
 *
 * ffmpeg's concat demuxer takes an explicit duration per image, which is how
 * the gaps between screencast frames are honoured. Feeding the images as a
 * numbered sequence instead would give every one of them 1/30th of a second
 * and turn a 77 second film into about 30.
 */
function encode(frames: Frame[], tail: number) {
  if (!frames.length) throw new Error("the screencast produced no frames")

  const lines: string[] = []
  for (let i = 0; i < frames.length; i++) {
    const d = i < frames.length - 1 ? frames[i + 1].t - frames[i].t : tail
    lines.push(`file '${frames[i].file}'`, `duration ${Math.max(d, 1 / 120).toFixed(6)}`)
  }
  /* The concat demuxer ignores the final entry's duration unless the last file
     is repeated, which is a documented quirk and not a mistake here. */
  lines.push(`file '${frames[frames.length - 1].file}'`)

  const list = join(RAW, "frames.txt")
  writeFileSync(list, lines.join("\n") + "\n")

  /* Encoded for what X accepts, since that is where this goes.
   *
   * The silent AAC track is the part that is easy to leave out and occasionally
   * fatal: X documents H.264 + AAC, and a file carrying no audio stream at all
   * is the kind of input their pipeline sometimes refuses.
   *
   * The bitrate target is aspirational rather than binding, and the gap is
   * worth knowing about before someone reads the file's stats and panics. X
   * asks for 5-25 Mbps at 1080p; asking x264 for 8 produces about 0.7, because
   * a flat interface holding still for four seconds at a time has almost
   * nothing to encode, and no quality setting can spend bits on detail that is
   * not there. Measured against a CRF 16 master of the same frames, this
   * encode scores SSIM 0.999996. The number is low because the picture is
   * cheap, not because it is damaged. */
  const mp4 = join(OUT, NAME)
  execFileSync("ffmpeg", [
    "-y", "-f", "concat", "-safe", "0", "-i", list,
    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
    "-vf", `scale=${OUT_W}:${OUT_H}:flags=lanczos,fps=${FPS}`,
    "-c:v", "libx264", "-preset", "slow",
    "-b:v", "8M", "-maxrate", "12M", "-bufsize", "16M",
    "-pix_fmt", "yuv420p", "-profile:v", "high",
    "-c:a", "aac", "-b:a", "128k", "-shortest",
    "-movflags", "+faststart",
    mp4,
  ], { stdio: ["ignore", "ignore", "inherit"] })
  console.log(`\n→ ${mp4}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
