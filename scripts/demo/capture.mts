/**
 * The capture rig the demo films share, in two shapes.
 *
 * `film()` screencasts the live page and reassembles it at the speed it
 * happened. Use it when the time between things is the claim.
 *
 * `slides()` takes one screenshot per state and cuts between them. Use it when
 * the states are the claim: nothing of the app mid-restyle survives into the
 * film, so a sweep does not spend a third of every beat showing a page that is
 * still settling.
 *
 * Both open the browser the same way and encode the same way, and those are
 * the two parts that are easy to get subtly wrong.
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
 * a desktop layout rendered into 2560x1440 of real pixels, and it is what
 * makes the two rigs above interchangeable: the screenshots and the screencast
 * frames come out the same size.
 */
import { chromium } from "playwright"
import type { Page } from "playwright"
import { execFileSync } from "node:child_process"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

export const URL = process.env.DEMO_URL ?? "http://localhost:3000"
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
export const FORMAT = process.env.DEMO_FORMAT === "4x3" ? "4x3" : "16x9"
const CSS_W = 1280
const CSS_H = FORMAT === "4x3" ? 960 : 720
const DPR = 2
const OUT_W = FORMAT === "4x3" ? 1440 : 1920
const OUT_H = 1080
const FPS = 30

export const wait = (s: number) => new Promise((r) => setTimeout(r, s * 1000))

/** An image and how long it stays on screen. */
type Shot = { file: string; d: number }

async function open(name: string) {
  rmSync(RAW, { recursive: true, force: true })
  mkdirSync(RAW, { recursive: true })
  console.log(`${FORMAT} · page ${CSS_W}x${CSS_H} @${DPR}x · out ${OUT_W}x${OUT_H} · ${name}.mp4`)

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
  return { browser, context, page, file: join(OUT, `${name}.mp4`) }
}

/**
 * Screencast the app while `body` drives it, at the speed it happened.
 *
 * `body` returns how long the closing image should be held: the screencast
 * emits only on change, so the last thing on screen produces no frame of its
 * own and would otherwise flash past.
 */
export async function film(name: string, body: (page: Page) => Promise<number>) {
  const { browser, context, page, file } = await open(name)

  const frames: { t: number; file: string }[] = []
  const client = await context.newCDPSession(page)
  let n = 0
  client.on("Page.screencastFrame", (f) => {
    const png = join(RAW, `f${String(n++).padStart(5, "0")}.png`)
    writeFileSync(png, Buffer.from(f.data, "base64"))
    /* Chrome stamps each frame with when it was actually presented. Keeping
       those stamps is what lets the film be reassembled at true speed later:
       the screencast only emits on change, so a four second hold arrives as a
       single frame and would otherwise collapse to 1/30th of a second. */
    frames.push({ t: f.metadata.timestamp ?? Date.now() / 1000, file: png })
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

  const tail = await body(page)

  await client.send("Page.stopScreencast").catch(() => {})
  await context.close()
  await browser.close()

  console.log(`\ncaptured ${frames.length} frames`)
  encode(
    frames.map((f, i) => ({
      file: f.file,
      d: i < frames.length - 1 ? frames[i + 1].t - f.t : tail,
    })),
    file
  )
  rmSync(RAW, { recursive: true, force: true })
}

/**
 * One screenshot per state, cut together at `hold` seconds each.
 *
 * `body` gets the page and a `shoot()` to call once the page is where it
 * should be. Nothing between two calls is recorded, which is the entire point:
 * the restyle, the reflow and the engine's own transitions all happen off
 * camera, so every frame delivered is a settled interface.
 */
export async function slides(
  name: string,
  hold: number,
  body: (page: Page, shoot: () => Promise<void>) => Promise<void>
) {
  const { browser, context, page, file } = await open(name)

  const shots: Shot[] = []
  const shoot = async () => {
    const png = join(RAW, `s${String(shots.length).padStart(5, "0")}.png`)
    await page.screenshot({ path: png })
    shots.push({ file: png, d: hold })
  }

  await body(page, shoot)

  await context.close()
  await browser.close()

  console.log(`\ncaptured ${shots.length} stills`)
  encode(shots, file)
  rmSync(RAW, { recursive: true, force: true })
}

/**
 * Assemble the images, each held for as long as it says.
 *
 * ffmpeg's concat demuxer takes an explicit duration per image, which is how
 * both rigs get their timing: the screencast's gaps, or a slideshow's fixed
 * beat. Feeding the images as a numbered sequence instead would give every one
 * of them 1/30th of a second and turn a 77 second film into about 30.
 */
function encode(shots: Shot[], mp4: string) {
  if (!shots.length) throw new Error("the capture produced no frames")

  const lines: string[] = []
  for (const s of shots) {
    lines.push(`file '${s.file}'`, `duration ${Math.max(s.d, 1 / 120).toFixed(6)}`)
  }
  /* The concat demuxer ignores the final entry's duration unless the last file
     is repeated, which is a documented quirk and not a mistake here. */
  lines.push(`file '${shots[shots.length - 1].file}'`)

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
   * asks for 5-25 Mbps at 1080p; asking x264 for 8 produces about 0.7 on the
   * product film, because a flat interface holding still for four seconds at a
   * time has almost nothing to encode, and no quality setting can spend bits
   * on detail that is not there. Measured against a CRF 16 master of the same
   * frames, that encode scores SSIM 0.999996. The number is low because the
   * picture is cheap, not because it is damaged. A sweep, which replaces the
   * whole screen several times a second, spends far more of the allowance. */
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
