#!/usr/bin/env tsx
/**
 * Are `surfaceFinish` and `ruleStyle` options unreachable, or merely unasked?
 *
 * `surfaceFinish` answered `flat` for eleven of twelve varied briefs and
 * `ruleStyle` used two of its seven options across the same set. That is an
 * observation, not a defect: none of those briefs asked for a groove or a
 * printer's ornament, and a selector need not exercise every option on a
 * population that does not want them.
 *
 * The test that distinguishes the two is explicit versus implicit. A brief that
 * NAMES the effect must reach it; if that fails, the option or its wording is
 * broken. A brief that merely implies it failing while the explicit one
 * succeeds is a routing problem, which is a different and cheaper repair.
 *
 * Greater diversity is not success. Reaching the named option is.
 */
import { TypeSafeClient, choice, type ChoiceCriteria } from "@typesafe-ai/sdk"
import { stageOne } from "@/design/jev/generate"

const client = new TypeSafeClient({ timeout: 30000 })
const prod = stageOne as unknown as Record<string, { instructions: unknown; criteria: unknown }>

/** The production question, with an alternative phrasing to isolate wording. */
const reword = (key: string, question: string) =>
  choice(question, prod[key].criteria as ChoiceCriteria)

/** The production criteria, with hints added, to isolate routing. */
const withHints = (key: string, hints: Record<string, string>) =>
  choice(
    prod[key].instructions as string,
    Object.fromEntries(
      Object.entries(prod[key].criteria as Record<string, unknown>).map(([k, v]) => [
        k,
        hints[k] ? { ...(typeof v === "object" ? v : { is: v }), pick_when: hints[k] } : v,
      ])
    ) as unknown as ChoiceCriteria
  )

const FINISH: [want: string, implicit: string, explicit: string][] = [
  ["flat", "A plain administrative form", "Panels have a completely even fill, with no lighting, gradient, transparency or glow"],
  ["highlight", "A dark control panel moulded from black plastic and lit from above", "Each panel has a thin highlight along its top edge"],
  ["gradient", "A softly shaded atmospheric panel", "Panel fills are slightly lighter at the top than at the bottom"],
  ["glass", "Frosted glass sheets layered over a visible background", "Panels are translucent and blurred, showing the background through them"],
  ["emissive", "A neon instrument display on black", "Panel outlines emit light both inward and outward"],
]

const RULE: [want: string, brief: string][] = [
  ["hairline", "A plain form with single thin dividing lines"],
  ["double", "A formal title page with double dividing rules"],
  ["dotted", "A technical form with dotted separators"],
  ["groove", "A moulded plastic control panel with recessed separator grooves"],
  ["fade", "An atmospheric interface whose separators fade away at both ends"],
  ["ornament", "A printed chapter break with a small printer's diamond between two rules"],
  ["none", "A minimalist composition separated only by empty space, with no dividing lines"],
]

const RULE_HINTS: Record<string, string> = {
  hairline: "ordinary forms and simple divisions",
  double: "formal title pages and double ruled divisions",
  dotted: "technical forms and dotted separators",
  groove: "moulded plastic and recessed physical divisions",
  fade: "atmospheric compositions with softly disappearing separators",
  ornament: "printed chapter breaks with a central printer's ornament",
  none: "compositions separated entirely by empty space",
}

const ask = async (brief: string, questions: Record<string, unknown>) =>
  (await client.systemOne({ state: { style_brief: brief }, questions: questions as never }))
    .answers as Record<string, never>

const read = (a: Record<string, never>, k: string, want: string) => {
  const r = a[k] as unknown as { choice: string; probabilities: Record<string, number> }
  return { got: r.choice, p: Number((r.probabilities[want] ?? 0).toFixed(2)), hit: r.choice === want }
}

console.log("── surfaceFinish: production wording vs a wording that does not say 'finished' ──")
const finishRows = await Promise.all(
  FINISH.flatMap(([want, implicit, explicit]) =>
    ([["implicit", implicit], ["explicit", explicit]] as const).map(async ([kind, brief]) => {
      const a = await ask(brief, {
        current: prod.surfaceFinish,
        reworded: reword("surfaceFinish", "What visible finish characterises the panel material or screen?"),
      })
      const c = read(a, "current", want)
      const w = read(a, "reworded", want)
      return { want, kind, current: `${c.got} ${c.p}`, reworded: `${w.got} ${w.p}`, cHit: c.hit, wHit: w.hit }
    })
  )
)
console.table(finishRows.map((r) => ({ want: r.want, kind: r.kind, current: r.current, reworded: r.reworded })))
const rate = (rows: typeof finishRows, kind: string, key: "cHit" | "wHit") => {
  const set = rows.filter((r) => r.kind === kind)
  return `${set.filter((r) => r[key]).length}/${set.length}`
}
console.log(`  explicit  current ${rate(finishRows, "explicit", "cHit")}   reworded ${rate(finishRows, "explicit", "wHit")}`)
console.log(`  implicit  current ${rate(finishRows, "implicit", "cHit")}   reworded ${rate(finishRows, "implicit", "wHit")}`)

console.log("\n── ruleStyle: production criteria vs the same criteria with hints ──")
const ruleRows = await Promise.all(
  RULE.map(async ([want, brief]) => {
    const a = await ask(brief, { current: prod.ruleStyle, hinted: withHints("ruleStyle", RULE_HINTS) })
    const c = read(a, "current", want)
    const h = read(a, "hinted", want)
    return { want, brief: brief.slice(0, 34), current: `${c.got} ${c.p}`, hinted: `${h.got} ${h.p}`, cHit: c.hit, hHit: h.hit }
  })
)
console.table(ruleRows.map((r) => ({ want: r.want, brief: r.brief, current: r.current, hinted: r.hinted })))
console.log(`  explicit requests reached — current ${ruleRows.filter((r) => r.cHit).length}/${ruleRows.length}   hinted ${ruleRows.filter((r) => r.hHit).length}/${ruleRows.length}`)
