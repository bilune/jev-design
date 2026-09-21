/**
 * A hundred styles out of the space that are worth looking at, and no two of
 * them alike.
 *
 * `shuffle.mts` shows the space as it is. This one shows what is IN it. Same
 * sampler, same `assemble()`, but a hundred thousand candidates are drawn and
 * all but a hundred are thrown away by the rules below.
 *
 * ── What this is and is not ─────────────────────────────────────────────
 * It is not the best hundred of the 1,128,701,952,000,000 — nothing can rank
 * a space that size. It is the best hundred of a hundred thousand, under a
 * filter I wrote by hand, and every rule in that filter is either a legibility
 * measurement or a pairing an experienced eye would insist on. Where the
 * filter is opinionated, it says so.
 *
 * The bar is deliberately not "safe". A style that passes has to be LOUD:
 * pale, tasteful and timid fails the same gate as unreadable. What it may not
 * be is accidental — a pixel icon set on softly rounded corners is not daring,
 * it is two answers that never met.
 *
 * Run it with the dev server up:
 *   npm run demo:gallery:4x3
 *
 * Out: scripts/demo/out/gallery.mp4.
 */
import type { DesignConfig } from "@/design/tokens"
import { assemble } from "@/design/jev/generate"

import { slides, wait } from "./capture.mjs"
import { randomAnswers, rng } from "./style-space.js"

declare global {
  interface Window {
    applyDesignConfig: (config: DesignConfig) => void
  }
}

const COUNT = Number(process.env.DEMO_STYLES ?? 100)
const POOL = Number(process.env.DEMO_POOL ?? 100_000)
const HOLD = Number(process.env.DEMO_HOLD ?? 0.42)
/** Twice the engine's slowest transition, so no frame catches a page moving. */
const SETTLE = 0.55
const rand = rng(Number(process.env.DEMO_SEED ?? 11))

/** oklch(L C H) back into numbers. */
function ok(s: string) {
  const m = s.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)/)
  return m ? { l: +m[1], c: +m[2], h: +m[3] } : { l: 0, c: 0, h: 0 }
}

/** Shortest distance between two hue angles, in degrees. */
const hueGap = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

/**
 * Everything on the page that announces itself.
 *
 * Counted rather than judged one by one, because the failure mode is arithmetic:
 * any one of these carries a style, and four at once is a page arguing with
 * itself.
 */
function loudness(c: DesignConfig) {
  const f = c.flags
  return [
    f.pageTexture !== "none",
    f.ambient !== "none",
    f.signal !== "0",
    f.surfaceFinish === "glass" || f.surfaceFinish === "emissive" || f.surfaceFinish === "gradient",
    f.cornerStyle === "notch" || f.cornerStyle === "diagonal" || f.cornerStyle === "bevel",
    f.ruleStyle === "double" || f.ruleStyle === "groove" || f.ruleStyle === "ornament",
    f.borders === "brackets" || f.borders === "ticks",
    f.labelCase !== "none",
    f.chartFill === "hatched" || f.chartFill === "solid",
    f.iconFamily === "pixel",
  ].filter(Boolean).length
}

/**
 * Whether a style is worth a frame of the film.
 *
 * Returns null for a reject, or a score. The gates come first and are absolute;
 * the score only ranks what survives them.
 */
function judge(c: DesignConfig): number | null {
  const f = c.flags
  const canvas = ok(c.scalars.canvas)
  const ink = ok(c.scalars.ink)
  const accent = ok(c.scalars.accent)

  /* ── Legibility. Measured, not preferred. ─────────────────────────────── */

  /* A canvas holds its contrast below about 0.25 or above about 0.9; a
     saturated mid-tone washes everything on it out however good the rest of
     the style is. This was found by rendering, not by reasoning: a brief
     scoring 78% shipped a muddy 0.343 canvas that read as a mistake. */
  if (canvas.l > 0.27 && canvas.l < 0.88) return null
  /* Text against its ground. */
  if (Math.abs(ink.l - canvas.l) < 0.6) return null
  /* The accent has to separate from the page it sits on, in the direction the
     page leaves room for. */
  const dark = canvas.l < 0.5
  if (dark && accent.l < 0.55) return null
  if (!dark && accent.l > 0.62) return null
  /* Grey is a legitimate style and a poor one to put in a reel of a hundred. */
  if (accent.c < 0.1) return null
  /* A coloured page with an accent of the same hue is one colour pretending to
     be two. */
  if (canvas.c > 0.04 && hueGap(canvas.h, accent.h) < 40) return null

  /* ── Pairings. Opinionated, and each one is a thing that reads as an
     accident rather than as a decision. ───────────────────────────────────── */

  /* Bitmap icons belong to a square world. On a soft radius they read as an
     asset that failed to load. */
  const radius = parseFloat(c.scalars.radiusControl)
  if (f.iconFamily === "pixel" && radius > 0.2) return null
  /* Scanlines are a screen; grain is paper. Swapped, both look like a filter. */
  if (f.pageTexture === "scanlines" && !dark) return null
  if (f.pageTexture === "grain" && dark) return null
  /* A printer's lozenge between two rules wants type it can belong to. */
  if (f.ruleStyle === "ornament" && f.labelCase === "none") return null
  /* Emitted light on a white page is a smudge. The engine already guards the
     glow; the emissive fill is the same mistake by another route. */
  if (f.surfaceFinish === "emissive" && !dark) return null
  /* Glass over nothing is a grey box: it needs a ground with depth behind it. */
  if (f.surfaceFinish === "glass" && f.surface === "outline") return null
  /* Brackets and ticks draw the corners of a panel that has no border. With a
     full border they are drawn twice. */
  if ((f.borders === "brackets" || f.borders === "ticks") && f.surface === "outline") return null
  /* A table with no rules inside a page with no borders loses its rows. */
  if (f.tableStyle === "bare" && f.borders === "none") return null

  /* ── The bar. Loud, coherent, and not a mess. ─────────────────────────── */
  const loud = loudness(c)
  if (loud < 3 || loud > 5) return null

  /* Among what is left, prefer the ones that commit: a saturated accent, a
     canvas at one end or the other rather than near the threshold, and the
     upper half of the loudness window. */
  const extreme = dark ? 0.27 - canvas.l : canvas.l - 0.88
  return accent.c * 3 + extreme * 2 + loud * 0.25
}

/**
 * What makes two styles read as different films rather than two takes of one.
 *
 * Only the things a viewer notices in four tenths of a second. Shape and
 * colour count double: a bevelled magenta page next to a bevelled magenta page
 * is a repeat even if every other flag differs.
 */
function signature(c: DesignConfig) {
  const canvas = ok(c.scalars.canvas)
  const accent = ok(c.scalars.accent)
  return [
    canvas.l < 0.5 ? "dark" : "light",
    /* Twelve buckets: adjacent hues are the same colour at a glance. */
    `h${Math.round(accent.h / 30) % 12}`,
    `p${canvas.c > 0.04 ? Math.round(canvas.h / 60) % 6 : "n"}`,
    c.flags.cornerStyle,
    c.flags.borders,
    c.flags.pageTexture,
    c.flags.iconFamily,
    c.flags.labelCase,
    c.flags.figureLayout,
    c.flags.surfaceFinish,
  ]
}

const distance = (a: string[], b: string[]) =>
  a.reduce((n, v, i) => n + (v === b[i] ? 0 : i < 3 ? 2 : 1), 0)

/**
 * Take the hundred that are least like each other, best first.
 *
 * Ranking alone gives a hundred variations on whatever the score happens to
 * love — every run of this before the diversity pass came back as sixty dark
 * pages with a cyan accent. So the winner opens, and each further pick is the
 * candidate furthest from everything already chosen, with the score breaking
 * ties.
 */
function curate(pool: { config: DesignConfig; score: number }[], n: number) {
  const ranked = [...pool].sort((a, b) => b.score - a.score)
  const chosen = [ranked.shift()!]
  const sigs = [signature(chosen[0].config)]

  while (chosen.length < n && ranked.length) {
    let best = 0
    let bestValue = -Infinity
    for (let i = 0; i < ranked.length; i++) {
      const sig = signature(ranked[i].config)
      let far = Infinity
      for (const s of sigs) far = Math.min(far, distance(sig, s))
      const value = far * 10 + ranked[i].score
      if (value > bestValue) {
        bestValue = value
        best = i
      }
    }
    const [pickIt] = ranked.splice(best, 1)
    chosen.push(pickIt)
    sigs.push(signature(pickIt.config))
  }
  return chosen
}


/**
 * What the page actually renders, asked of the page.
 *
 * Every rule above reasons over the config, and the last third of the first
 * run showed the limit of that: a near-black canvas can pass every scalar
 * gate and still come back as a page where the panels and the secondary text
 * have quietly vanished, because those colours are derived — a tint over the
 * canvas, a muted foreground mixed toward it — and the config never states
 * them. So they get measured where they exist, in the computed styles, as
 * WCAG contrast ratios.
 *
 * The thresholds are not the WCAG minimums, they are the four hand-authored
 * presets. Measured on the running app, `minimal`, `brutalist`, `editorial`
 * and `terminal` score a title contrast of 14.2 to 19.5, secondary text of
 * 4.7 to 5.2, and a panel edge of 1.14 to 17.6 — the low end of that last one
 * being a card that differs from the page by a hairline border and almost
 * nothing else, which is a legitimate style and the reason the edge bar has
 * to sit as low as it does. The gates below are set just under each floor: a
 * style a person authored for this app would pass all three.
 */
const LEGIBLE = `() => {
  /* Colours are read back through a canvas rather than parsed.
     getComputedStyle returns them in the space they were authored in, and on
     this page that is oklch() — the first version of this read L, C and H as
     if they were R, G and B and scored every style 1.0. Painting the colour
     over its own background also composites the alpha, which a translucent
     panel fill needs. */
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true })
  const rgb = (color, behind) => {
    ctx.fillStyle = behind
    ctx.fillRect(0, 0, 1, 1)
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 1, 1)
    const d = ctx.getImageData(0, 0, 1, 1).data
    return [d[0], d[1], d[2]]
  }
  const chan = (v) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4) }
  const lum = (c) => 0.2126 * chan(c[0]) + 0.7152 * chan(c[1]) + 0.0722 * chan(c[2])
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
    return (x + 0.05) / (y + 0.05)
  }

  const card = document.querySelector('[data-slot="card"]')
  if (!card) return { ok: false, title: 0, muted: 0, edge: 0 }
  const cs = getComputedStyle(card)
  const pageColor = getComputedStyle(document.body).backgroundColor
  const page = rgb(pageColor, "white")
  const surfaceColor = cs.backgroundColor
  const surface = rgb(surfaceColor, pageColor)

  const title = document.querySelector('[data-slot="card-title"]')
  const desc = document.querySelector('[data-slot="card-description"]')

  /* A panel is findable either because it is a different colour from the page
     or because something draws its edge. */
  const edge = Math.max(
    ratio(surface, page),
    parseFloat(cs.borderTopWidth) > 0 ? ratio(rgb(cs.borderTopColor, pageColor), page) : 0
  )

  return {
    ok: true,
    title: title ? ratio(rgb(getComputedStyle(title).color, surfaceColor), surface) : 0,
    muted: desc ? ratio(rgb(getComputedStyle(desc).color, surfaceColor), surface) : 0,
    edge,
  }
}`

async function main() {
  const pool: { config: DesignConfig; score: number }[] = []
  for (let i = 0; i < POOL; i++) {
    const config = assemble(randomAnswers(rand))
    const score = judge(config)
    if (score !== null) pool.push({ config, score })
  }
  console.log(
    `${POOL.toLocaleString("en-US")} sampled · ${pool.length.toLocaleString("en-US")} pass ` +
      `(${((pool.length / POOL) * 100).toFixed(2)}%) · keeping ${COUNT}`
  )
  if (pool.length < COUNT) throw new Error("the filter is too tight for this pool")

  /* Curated well past the target, because the rendered check below rejects
     some of them and the order must survive the gaps. */
  const picks = curate(pool, COUNT * 3)

  await slides("gallery", HOLD, async (page, shoot) => {
    await page.waitForSelector(".ui-fab")
    let kept = 0
    let seen = 0
    for (const p of picks) {
      if (kept === COUNT) break
      seen++
      await page.evaluate((c) => window.applyDesignConfig(c), p.config)
      await wait(SETTLE)
      /* Passed as source and invoked here: tsx rewrites nested arrow
         functions with a `__name` helper the page does not have. */
      const m = (await page.evaluate(`(${LEGIBLE})()`)) as
        { ok: boolean; title: number; muted: number; edge: number }
      if (!m.ok || m.title < 7 || m.muted < 4 || m.edge < 1.12) {
        console.log(
          `   skip      title ${m.title?.toFixed(1)} muted ${m.muted?.toFixed(1)} ` +
            `edge ${m.edge?.toFixed(1)}  ${p.config.scalars.canvas}`
        )
        continue
      }
      await shoot()
      kept++
      console.log(
        `[${String(kept).padStart(3)}/${COUNT}] ${p.score.toFixed(2)} ` +
          `${p.config.scalars.canvas.padEnd(24)} ${p.config.scalars.accent.padEnd(24)} ` +
          `${p.config.flags.cornerStyle}/${p.config.flags.borders}/${p.config.flags.pageTexture}`
      )
    }
    console.log(`\n${kept} kept from ${seen} rendered`)
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
