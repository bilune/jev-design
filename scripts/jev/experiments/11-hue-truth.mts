#!/usr/bin/env tsx
/**
 * Where the ground truth comes from.
 *
 * The brand assertions in experiments 05 and 08 were written from memory, which
 * is exactly the wrong footing for a benchmark. This converts published brand
 * hexes to OKLCH and asks the catalog itself which hue name is nearest, so the
 * expected answer is computed rather than recalled.
 *
 * Every hex carries its source. Where a company publishes no single accent — a
 * multicoloured brand, or a product whose interface is deliberately neutral —
 * that is recorded as such instead of guessed at.
 */
import { hues, type HueKey } from "@/design/jev/catalog"

/* sRGB → OKLCH. Björn Ottosson's matrices. */
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
function oklch(hex: string): { l: number; c: number; h: number } {
  const n = parseInt(hex.slice(1), 16)
  const r = lin(((n >> 16) & 255) / 255)
  const g = lin(((n >> 8) & 255) / 255)
  const b = lin((n & 255) / 255)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const h = (Math.atan2(B, A) * 180) / Math.PI
  return { l: L, c: Math.hypot(A, B), h: h < 0 ? h + 360 : h }
}

/** Angular distance, and the nearest names in the catalog. */
const nearest = (h: number, n = 3) =>
  (Object.keys(hues) as HueKey[])
    .filter((k) => k !== "neutral")
    .map((k) => {
      // Shortest way round the circle. The first version returned 180 minus
      // this and sorted ascending, which ranked the FURTHEST hue first and had
      // Spotify's green matching magenta — the kind of error that would have
      // sailed through if the output had not been obviously absurd.
      const raw = Math.abs(hues[k].angle - h) % 360
      return { k, d: raw > 180 ? 360 - raw : raw }
    })
    .sort((a, b) => a.d - b.d)
    .slice(0, n)

type Entry = { brand: string; hex: string | null; source: string }
const BRANDS: Entry[] = [
  { brand: "Linear", hex: "#5E6AD2", source: "the accent published in Linear's own design write-ups; the brand page calls it 'a subtle desaturated blue'" },
  { brand: "Linear (on site today)", hex: "#8FA6FF", source: "sampled from linear.app computed styles in this session" },
  { brand: "Slack", hex: "#4A154B", source: "Slack aubergine, the published brand colour" },
  { brand: "Stripe", hex: "#635BFF", source: "Stripe's published brand purple" },
  { brand: "Spotify", hex: "#1DB954", source: "Spotify green, the published brand colour" },
  { brand: "Nintendo", hex: "#E60012", source: "Nintendo red, the published brand colour" },
  { brand: "Figma", hex: "#A259FF", source: "one of five Figma brand colours; the brand is deliberately multicoloured" },
  { brand: "IBM Carbon", hex: "#0F62FE", source: "Carbon's Blue 60, the interactive colour of the design system" },
  { brand: "Vercel", hex: null, source: "black and white by design; there is no accent hue" },
  { brand: "Notion", hex: null, source: "the interface is near-neutral; no accent hue carries it" },
  { brand: "Bloomberg terminal", hex: "#FF9E00", source: "the amber of the terminal's own text, sampled from published screenshots" },
  { brand: "Windows 95", hex: "#000080", source: "the title-bar navy of the default Windows 95 theme" },
]

console.log(`${"brand".padEnd(24)} ${"hex".padEnd(9)} ${"OKLCH".padEnd(22)} nearest catalog hues`)
console.log("─".repeat(96))
for (const { brand, hex } of BRANDS) {
  if (!hex) {
    console.log(`${brand.padEnd(24)} ${"—".padEnd(9)} ${"—".padEnd(22)} neutral (no accent)`)
    continue
  }
  const { l, c, h } = oklch(hex)
  const near = nearest(h)
  console.log(
    `${brand.padEnd(24)} ${hex.padEnd(9)} ` +
      `${`L${l.toFixed(2)} C${c.toFixed(3)} H${h.toFixed(0)}`.padEnd(22)} ` +
      near.map((n) => `${n.k}(${hues[n.k].angle}°, off by ${n.d.toFixed(0)}°)`).join("  ")
  )
}

console.log("\nsources")
for (const { brand, source } of BRANDS) console.log(`  ${brand.padEnd(24)} ${source}`)
