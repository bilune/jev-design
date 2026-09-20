#!/usr/bin/env tsx
/**
 * Can the engine be told a palette, rather than an accent?
 *
 * `Only blue and orange on white, no other colour anywhere` answers `orange` at
 * 0.90 and ships orange alone. That is not a stray-colour problem, it is an
 * omission: the brief names two colours and the engine has no way to carry the
 * second. The hue question asks which family supplies THE ACCENT, and orange at
 * 0.90 is perfectly compatible with a palette of orange and blue in which
 * orange is the accent — so the confidence is not evidence of exclusivity, and
 * removing the early return would not by itself recover blue.
 *
 * Two candidate sources of membership, compared on briefs whose answer is
 * written in the brief:
 *
 *   DECODER     the existing hue distribution, with the confidence shortcut
 *               removed offline. Costs nothing extra. Works only if ONE cutoff
 *               separates required families from excluded ones across all the
 *               controls, which is the falsifiable claim:
 *                   max excluded p  <  cutoff  <=  min required p
 *   MEMBERSHIP  one independent question per colour. Costs a question per hue
 *               on the requests that ask for it.
 *
 * Recall and precision are reported apart. A decoder that admits no forbidden
 * colour while dropping a required one is not "nearly right", it is the bug
 * this experiment exists to catch, and the previous `want`-set-only scoring
 * could not see it.
 *
 * WHAT THE RESULT DOES AND DOES NOT SAY. Four limits, so the number is not
 * quoted later as more than it is:
 *
 *  - The decoder is falsified for RECOVERING REQUIRED PALETTE MEMBERSHIP by
 *    thresholding this accent distribution, on these controls. That
 *    distribution still carries useful accent information; what it lacks is the
 *    secondary colour, and it lacks it completely — `blue` comes back at zero
 *    to reported precision on a brief that names blue as the secondary colour.
 *  - The membership cutoff is an OBSERVED FIT. It is chosen from the same seven
 *    briefs it then classifies, so zero errors at it follows from the
 *    separation rather than validating it. It is a candidate for fresh
 *    controls, not an adopted threshold.
 *  - Only five colours are queried, against predeclared and overlapping alias
 *    groups. Nothing here establishes exclusion of every other catalog hue.
 *  - The either/or brief scores neither colour as mandatory, which is correct.
 *    Whether a final palette would then choose EXACTLY ONE of the two is a
 *    different assertion and is untested.
 *
 * One wording hypothesis, unmeasured: the lowest required answer is `orange` at
 * 0.47, on the brief where orange is the PRIMARY colour, and the question says
 * "including as a secondary colour". Replacing that clause with "whether
 * primary or secondary", holding everything else fixed, is the clean test.
 */
import { TypeSafeClient, noul } from "@typesafe-ai/sdk"
import { stageOne } from "@/design/jev/generate"
import { hues, type HueKey } from "@/design/jev/catalog"

const prod = stageOne as unknown as Record<string, unknown>
const client = new TypeSafeClient({ timeout: 30000 })

/** Catalog aliases, predeclared, so nothing is reclassified after the fact. */
const FAMILY: Record<string, HueKey[]> = {
  blue: ["blue", "navy", "sky", "cyan", "indigo"],
  orange: ["orange", "amber", "brick", "brown"],
  amber: ["amber", "gold", "orange"],
  green: ["green", "emerald", "lime", "teal"],
  violet: ["violet", "magenta"],
}
const PROBED = ["blue", "orange", "amber", "green", "violet"] as const

/** `required` must all appear; `excluded` must not. Neither for either/or. */
const CASES: [brief: string, required: string[], excluded: string[]][] = [
  ["Only amber on black, no other colour anywhere", ["amber"], ["blue", "green", "violet"]],
  ["Only blue and orange on white, no other colour anywhere", ["blue", "orange"], ["green", "violet"]],
  ["Orange is the primary accent; blue is the secondary colour. Use both and no other chromatic colours.", ["orange", "blue"], ["green", "violet"]],
  ["Only blue on white, no other colour anywhere", ["blue"], ["orange", "green", "violet"]],
  ["Only blue, orange and green on white, no other colour anywhere", ["blue", "orange", "green"], ["violet"]],
  ["Strictly black and white, with no chromatic colours", [], ["blue", "orange", "amber", "green", "violet"]],
  /* Neither is mandatory and neither is forbidden: exactly one must be chosen,
     which is a different assertion and is not scored here. */
  ["Either blue or orange: choose one, not both", [], []],
]

const membership = (colour: string) =>
  noul(`Must ${colour} appear somewhere in the chromatic palette requested by this brief, including as a secondary colour?`, {
    true: "The brief requires this colour to appear.",
    false: "This colour is excluded, unrequested, or merely an alternative from which one colour may be chosen.",
  })

/** The distribution's mass on a family, summed over its catalog aliases. */
const massOn = (probs: Record<string, number>, family: string) =>
  FAMILY[family].reduce((s, k) => s + (probs[k] ?? 0), 0)

const rows = await Promise.all(CASES.map(async ([brief, required, excluded]) => {
  const res = await client.systemOne({
    state: { style_brief: brief },
    questions: {
      hue: prod.hue,
      ...Object.fromEntries(PROBED.map((c) => [c, membership(c)])),
    } as never,
  })
  const a = res.answers as Record<string, never>
  const h = a.hue as unknown as { choice: HueKey; confidence: number; probabilities: Record<string, number> }
  const mass = Object.fromEntries(PROBED.map((c) => [c, massOn(h.probabilities, c)]))
  const said = Object.fromEntries(PROBED.map((c) => [c, (a[c] as unknown as { noul: number }).noul]))
  return { brief: brief.slice(0, 44), required, excluded, winner: h.choice, conf: h.confidence, mass, said }
}))

console.log("── distribution mass per family (the decoder's only signal) ──")
console.table(rows.map((r) => ({
  brief: r.brief, winner: r.winner, conf: Number(r.conf.toFixed(2)),
  ...Object.fromEntries(PROBED.map((c) => [c, Number(r.mass[c].toFixed(3))])),
})))

console.log("\n── membership asked directly ──")
console.table(rows.map((r) => ({
  brief: r.brief,
  ...Object.fromEntries(PROBED.map((c) => [c, Number(r.said[c].toFixed(2))])),
})))

/* The falsification. Inclusion is p >= cutoff, so perfect separation needs
   max(excluded) < cutoff <= min(required), over every control at once. */
const report = (name: string, value: (r: (typeof rows)[number], c: string) => number) => {
  let minRequired = Infinity
  let maxExcluded = -Infinity
  for (const r of rows) {
    for (const c of r.required) minRequired = Math.min(minRequired, value(r, c))
    for (const c of r.excluded) maxExcluded = Math.max(maxExcluded, value(r, c))
  }
  const separable = maxExcluded < minRequired
  console.log(
    `\n${name}\n  minimum on a REQUIRED family  ${minRequired.toFixed(3)}${minRequired < 0.0005 ? " (zero at reported precision)" : ""}` +
      `\n  maximum on an EXCLUDED family ${maxExcluded.toFixed(3)}` +
      `\n  → ${separable ? `separable: any cutoff in (${maxExcluded.toFixed(3)}, ${minRequired.toFixed(3)}]` : "NOT SEPARABLE by one cutoff — the ranges overlap"}`
  )
  if (!separable) return
  const cutoff = (maxExcluded + minRequired) / 2
  let missing = 0
  let admitted = 0
  for (const r of rows) {
    for (const c of r.required) if (value(r, c) < cutoff) missing++
    for (const c of r.excluded) if (value(r, c) >= cutoff) admitted++
  }
  console.log(`  at cutoff ${cutoff.toFixed(3)} — fitted to these controls, not validated on fresh ones: ` +
      `${missing} required families missing, ${admitted} excluded families admitted`)
}

report("DECODER — the existing hue distribution", (r, c) => r.mass[c])
report("MEMBERSHIP — one question per colour", (r, c) => r.said[c])
