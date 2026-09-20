#!/usr/bin/env tsx
/**
 * Brand names as briefs.
 *
 * A brand name is a very dense token and a very ambiguous one: it can recall the
 * product's interface, or just its logo. The second column of each pair is the
 * same style described without naming anyone, so the two can be compared. If the
 * name carries real design knowledge the pair converges; if it only carries a
 * logo colour, the name-only run will get the hue right and everything else
 * generic.
 */
import { generateDesign } from "@/design/jev/generate"
import { faces, type FaceKey } from "@/design/jev/catalog"
import { BRAND_TRUTH } from "../bench/brand-truth"

/** brand alone · brand plus a short hint · the same style with nobody named */
const TRIPLES: [brand: string, hinted: string, described: string][] = [
  ["Stripe", "Stripe: white, indigo, softly rounded", "A developer-facing payments dashboard: white, indigo accent, crisp neutral sans, gently rounded, generous"],
  ["Notion", "Notion: near-white, colourless, minimal chrome", "A writing workspace: near-white page, almost no colour, book-like text, minimal chrome, no borders"],
  ["Linear", "Linear: near-black, violet, very tight", "A dark, extremely crisp issue tracker: near-black, violet accent, tight compact rows, fast subtle motion"],
  ["Spotify", "Spotify: black, green, rounded pills", "A black music player with a bright green accent, heavy rounded pills, bold sans"],
  ["Bloomberg terminal", "Bloomberg terminal: amber on black, monospaced", "A black financial terminal: amber and orange on black, monospaced, maximum density, no ornament"],
  ["IBM Carbon", "IBM Carbon: white, blue, perfectly square", "A corporate enterprise design system: white, blue accent, square corners, plain grotesque, strict grid"],
  ["Apple settings", "Apple settings: very light, blue, roomy", "A very light system preferences panel: soft greys, blue accent, rounded, neutral sans, roomy"],
  ["Nintendo", "Nintendo: bright red, very rounded, bouncy", "A playful games console menu: bright red, very rounded, large controls, bouncy"],
  ["Vercel", "Vercel: pure black and white, no colour, sharp", "A stark black-and-white developer platform: pure black, no colour at all, geometric sans, sharp"],
  ["Figma", "Figma: white canvas, violet, small dense controls", "A light creative tool: white canvas, multicoloured, small dense controls, rounded"],
  ["Slack", "Slack: aubergine purple sidebar, cosy", "A workspace chat app: aubergine purple sidebar, white content, friendly sans, cosy"],
  ["Windows 95", "Windows 95: grey, square, chiselled, tiny controls", "A grey 1990s desktop: square, chiselled borders, bitmap-like sans, tiny controls"],
]

const face = (s: string) => (Object.keys(faces) as FaceKey[]).find((k) => s.includes(faces[k].stack.split(",")[0].slice(4, -1))) ?? "?"

const row = (label: string, r: Awaited<ReturnType<typeof generateDesign>>) => {
  const a = r.answers
  return `${label.padEnd(20)} ${String(a.canvas).padEnd(10)} ${String(a.hue).padEnd(9)} c${Number(a.chroma).toFixed(1)} ` +
    `${String(a.bodyCategory).padEnd(6)}/${String(a.displayFace).padEnd(16)} r${Number(a.roundness).toFixed(1)} ` +
    `${String(a.density).padEnd(11)} ${String(a.borders).padEnd(6)} ${String(a.depthKind).padEnd(10)} d${Number(a.depth).toFixed(1)} ` +
    `${String(a.labelCase).padEnd(5)} sp${Number(a.speed).toFixed(1)}`
}

console.log(
  `${"brief".padEnd(20)} ${"canvas".padEnd(10)} ${"hue".padEnd(9)} chr  ${"body".padEnd(6)}/${"display".padEnd(16)} rnd  ${"density".padEnd(11)} ${"borders".padEnd(6)} ${"depth".padEnd(10)} amt  case  speed`
)
console.log("─".repeat(140))

const tally = { brand: [0, 0], hint: [0, 0], described: [0, 0], recognised: [0, 0] }
const score = (brand: string, a: Record<string, string | number>) => {
  const checks = BRAND_TRUTH[brand]
  return [checks.filter((c) => c.holds(a)).length, checks.length] as const
}

for (const [brand, hinted, described] of TRIPLES) {
  const [b, h, d, r] = await Promise.all([
    generateDesign(brand, { enrich: false }),
    generateDesign(hinted, { enrich: false }),
    generateDesign(described, { enrich: false }),
    generateDesign(brand),
  ])
  for (const [key, res] of [["brand", b], ["hint", h], ["described", d], ["recognised", r]] as const) {
    const [ok, n] = score(brand, res.answers)
    tally[key][0] += ok
    tally[key][1] += n
  }
  console.log(row(`${brand} ${score(brand, b.answers).join("/")}`, b))
  console.log(row(`  ↳ + hint ${score(brand, h.answers).join("/")}`, h))
  console.log(row(`  ↳ described ${score(brand, d.answers).join("/")}`, d))
  const rg = r.recognition!
  console.log(
    row(`  ↳ stage0 ${score(brand, r.answers).join("/")}`, r) +
      `  [product ${rg.namesAProduct.toFixed(2)} known ${rg.appearanceKnown.toFixed(2)} dark ${rg.interfaceIsDark.toFixed(2)} ${rg.brandColour}/${rg.character}${rg.trusted ? "" : " UNTRUSTED"}]`
  )
  console.log()
}

console.log("─".repeat(140))
for (const [key, [ok, n]] of Object.entries(tally)) {
  console.log(`${key.padEnd(12)} ${ok}/${n}  ${((ok / n) * 100).toFixed(0)}%`)
}
