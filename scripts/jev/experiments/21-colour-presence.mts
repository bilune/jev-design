#!/usr/bin/env tsx
/**
 * Two questions the engine currently answers with one number.
 *
 * `seriesFrom` reads the hue question's confidence and does two separate jobs
 * with it: below 0.25 it decides the style has NO colour, and between 0.25 and
 * 0.60 it treats the runners-up as a palette. Neither follows from what was
 * asked. The question is "what colour family does the accent come from", and
 *
 *   - uncertainty about WHICH colour is not evidence that colour is absent. A
 *     vivid multicoloured brief distributes probability across many families
 *     precisely because it is colourful.
 *   - a distribution over alternative single accents is not a set of colours
 *     that belong together. The tail selection takes up to five angularly
 *     separated labels with no minimum probability, so it can fill the last
 *     places from negligible mass.
 *
 * Measured here against explicit controls, because "it produced a nice palette"
 * is the evidence this decision has rested on so far.
 */
import { TypeSafeClient, noul } from "@typesafe-ai/sdk"
import { stageOne, seriesFrom } from "@/design/jev/generate"
import { hues, type HueKey } from "@/design/jev/catalog"

const prod = stageOne as unknown as Record<string, unknown>
const client = new TypeSafeClient({ timeout: 30000 })

const isChromatic = noul(
  "Should the interactive accent contain a chromatic colour, rather than being white, grey or black?",
  {
    true: "The requested accent has a visible colour.",
    false: "The requested accent is achromatic: white, grey or black.",
  }
)

/** `want` is the set of hue families a designer would accept in the palette. */
const CASES: [brief: string, chromatic: boolean, want: string[] | null][] = [
  ["A vivid rainbow mosaic", true, null],
  ["Memphis Group, Milan 1981", true, null],
  ["A tropical fruit market", true, null],
  ["An ordinary operations dashboard", true, null],
  ["A strictly black-and-white court filing", false, []],
  ["A white-phosphor CRT: white glowing text on black, no coloured light", false, []],
  /* Explicit palette controls: the answer is written in the brief. */
  ["Only amber on black, no other colour anywhere", true, ["amber", "gold", "orange"]],
  ["Only blue and orange on white, no other colour anywhere", true, ["blue", "navy", "sky", "cyan", "orange", "amber", "brick"]],
]

const rows = await Promise.all(CASES.map(async ([brief, , want]) => {
  const res = await client.systemOne({
    state: { style_brief: brief },
    questions: { hue: prod.hue, chroma: prod.chroma, isChromatic } as never,
  })
  const a = res.answers as Record<string, never>
  const h = a.hue as unknown as { choice: HueKey; confidence: number; probabilities: Record<string, number> }
  const s = seriesFrom(h.probabilities, h.confidence)
  /* The rule this experiment exists to price, preserved here explicitly.
     Reading it off `seriesFrom().committed` made the comparison stale the
     moment production stopped deciding presence there: it now always returns
     true, so a future run would reproduce "6/8" for the wrong reason. */
  const OLD_HUE_IS_NONE = 0.25
  const oldRuleSaysColour = h.confidence >= OLD_HUE_IS_NONE
  const names = s.angles.map((ang) => (Object.keys(hues) as HueKey[]).find((k) => hues[k].angle === ang) ?? String(ang))
  const direct = (a.isChromatic as unknown as { noul: number }).noul
  const stray = want === null ? "—" : names.filter((n) => !want.includes(n)).join(",") || "none"
  return {
    brief: brief.slice(0, 36),
    winner: h.choice,
    conf: Number(h.confidence.toFixed(2)),
    chroma: Number((a.chroma as unknown as { score: number }).score.toFixed(1)),
    direct: Number(direct.toFixed(2)),
    engineSays: oldRuleSaysColour ? "has colour" : "NO COLOUR",
    directSays: direct >= 0.5 ? "has colour" : "NO COLOUR",
    agree: oldRuleSaysColour === (direct >= 0.5) ? "" : "DISAGREE",
    palette: names.join(",") || "(winner only)",
    stray,
  }
}))
console.table(rows.map((r) => ({ brief: r.brief, winner: r.winner, conf: r.conf, chroma: r.chroma, direct: r.direct, engineSays: r.engineSays, directSays: r.directSays, palette: r.palette, stray: r.stray })))

const wrong = rows.filter((r, i) => r.engineSays === "has colour" !== CASES[i][1])
console.log(`\ncolour presence — the OLD confidence rule (preserved here, not read from production) ${rows.length - wrong.length}/${rows.length}` +
  (wrong.length ? `  misses: ${wrong.map((w) => w.brief).join(" | ")}` : ""))
const wrong2 = rows.filter((r, i) => r.directSays === "has colour" !== CASES[i][1])
console.log(`colour presence — asked directly        ${rows.length - wrong2.length}/${rows.length}` +
  (wrong2.length ? `  misses: ${wrong2.map((w) => w.brief).join(" | ")}` : ""))
const controls = rows.filter((_, i) => CASES[i][2] !== null && CASES[i][2]!.length > 0)
console.log(`\npalette tails on the explicit controls: ${controls.map((c) => `${c.brief.slice(0, 22)} → stray [${c.stray}]`).join("  |  ")}`)
