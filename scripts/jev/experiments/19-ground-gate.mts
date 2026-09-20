#!/usr/bin/env tsx
/**
 * Does the departure gate block a brief that asks for a coloured page outright?
 *
 * `DEPARTURE_IS_BOLD` thresholds "how far is this from business software" and
 * then uses the answer to decide whether a coloured ground can be expressed at
 * all. Those are not the same property. "An ordinary operations dashboard with
 * a saturated cobalt background" IS business software and states its ground
 * explicitly; "a white marble sculpture" is nothing like business software and
 * wants no coloured ground at all.
 *
 * Experiment 16 separated twenty briefs 20/20, but its cases were category
 * exemplars. These eight are the crossings, which is where a gate that
 * classifies the wrong property has to fail.
 *
 * The decisive number is how many explicit coloured-background requests the
 * current gate blocks. Any of briefs 2–4 is a demonstrated capability loss.
 */
import { TypeSafeClient, noul } from "@typesafe-ai/sdk"
import { recognition, DEPARTURE_IS_BOLD } from "@/design/jev/recognise"
import { boldQuestions } from "@/design/jev/generate"
import { ladders } from "@/design/jev/catalog"

const CASES: [brief: string, wantsColouredGround: boolean][] = [
  ["An ordinary operations dashboard", false],
  ["An ordinary operations dashboard with a saturated cobalt-blue page background", true],
  ["A productivity app with a vivid coral background behind every panel", true],
  ["A consumer banking app with a solid emerald-green page background", true],
  ["A white marble sculpture", false],
  ["A black-and-white woodcut printed on white paper", false],
  ["Minecraft", true],
  ["Minecraft, rendered entirely in black ink on white paper, with no coloured background", false],
]

/** The gate asked directly about the property it is actually used to permit. */
const needsGround = noul(
  "Does this brief call for the background itself to carry a clearly chromatic colour, rather than a white, grey, black, or lightly tinted paper ground?",
  {
    true: "The brief explicitly requests a coloured background, or its material or world clearly supplies one.",
    false: "The background should remain white, grey, black, or lightly tinted paper; colour belongs only to foreground details, if anywhere.",
  }
)

const client = new TypeSafeClient({ timeout: 30000 })

const rows = await Promise.all(CASES.map(async ([brief, want]) => {
  /* The ground questions are asked of ALL eight regardless of either gate, so
     the probe can see what the current gate is withholding. */
  const [gate, ground] = await Promise.all([
    client.systemOne({ state: { brief }, questions: { ...recognition, needsGround } as never }),
    client.systemOne({ state: { style_brief: brief }, questions: boldQuestions as never }),
  ])
  const g = gate.answers as Record<string, never>
  const departure = (g.departure as unknown as { score: number }).score
  const direct = (g.needsGround as unknown as { noul: number }).noul
  const amount = ((ground.answers as Record<string, never>).pageColour as unknown as { score: number }).score
  const hue = ((ground.answers as Record<string, never>).pageGround as unknown as { choice: string }).choice
  return {
    brief: brief.slice(0, 40), want: want ? "coloured" : "plain",
    departure: Number(departure.toFixed(2)),
    currentGate: departure >= DEPARTURE_IS_BOLD ? "OPEN" : "shut",
    direct: Number(direct.toFixed(2)),
    directGate: direct >= 0.5 ? "OPEN" : "shut",
    wouldAsk: `${hue} ${amount.toFixed(1)}`,
    chroma: Number(lerpAt(amount).toFixed(3)),
  }
}))

function lerpAt(s: number) {
  const r = ladders.pageChroma
  const i = Math.max(0, Math.min(r.length - 2, Math.floor(s)))
  return r[i] + (r[i + 1] - r[i]) * (s - i)
}

console.table(rows)
const hit = (k: "currentGate" | "directGate") =>
  rows.filter((r) => (r[k] === "OPEN") === (r.want === "coloured")).length
console.log(`\ncurrent departure gate  ${hit("currentGate")}/8`)
console.log(`direct ground question  ${hit("directGate")}/8`)
const blocked = rows.filter((r) => r.want === "coloured" && r.currentGate === "shut")
console.log(`\nEXPLICIT coloured-ground requests blocked by the current gate: ${blocked.length}` +
  (blocked.length ? ` — ${blocked.map((b) => b.brief).join(" | ")}` : ""))
