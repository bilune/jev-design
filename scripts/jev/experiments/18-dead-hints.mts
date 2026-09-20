#!/usr/bin/env tsx
/**
 * Thirty-two hints that were never sent.
 *
 * `pageTexture` answers `none` for almost every brief, and the suspicion was
 * that the coloured-page work had disturbed it. It had not. `expressive()` maps
 * each option to `v.is` and drops `pick_when` on the floor, so every one of the
 * hints written under an expressive question — "the style is a CRT, a terminal,
 * a television", "the style is drafted, technical, architectural" — is
 * maintained in the source and has never reached the model.
 *
 * Two things measured here:
 *
 *   contamination  whether merging the two gated colour questions into stage
 *                  one changes any OTHER answer. The model answers questions in
 *                  isolation, so it should not, and that is worth confirming
 *                  rather than repeating.
 *   the hints      whether sending them helps, over briefs with a texture a
 *                  designer would name, and over briefs that should stay flat.
 */
import { TypeSafeClient, choice, type ChoiceCriteria } from "@typesafe-ai/sdk"
import { stageOne, boldQuestions } from "@/design/jev/generate"

/** The expressive options as written in the catalog, hints included. */
const OPTIONS: Record<string, { is: string; pick_when?: string }> = {
  none: { is: "A flat, untextured field." },
  grid: { is: "A ruled grid, like engineering paper or a blueprint.", pick_when: "the style is drafted, technical, architectural or brutalist" },
  dots: { is: "A regular field of small dots.", pick_when: "the style is a modern developer tool or a systematic design" },
  scanlines: { is: "Fine horizontal lines, like a picture tube.", pick_when: "the style is a CRT, a terminal, a television or anything that emits" },
  grain: { is: "A faint irregular tooth, like uncoated paper.", pick_when: "the style is printed, editorial, analogue or aged" },
}
const Q = "What is the empty background made of?"

/** What ships: the hints are discarded. */
const bare = choice(Q, Object.fromEntries(Object.entries(OPTIONS).map(([k, v]) => [k, v.is])) as ChoiceCriteria)
/** The same options with the hints actually sent. */
const hinted = choice(Q, Object.fromEntries(Object.entries(OPTIONS).map(([k, v]) =>
  [k, v.pick_when ? { is: v.is, pick_when: v.pick_when } : { is: v.is }])) as unknown as ChoiceCriteria)

const CASES: [brief: string, want: string][] = [
  ["An engineering blueprint", "grid"],
  ["Concrete brutalism: raw, square, heavy black rules", "grid"],
  ["A graph paper notebook", "grid"],
  ["A 1980s amber phosphor terminal", "scanlines"],
  ["1980s teletext, colour blocks on black", "scanlines"],
  ["A 1970s Penguin paperback, warm paper", "grain"],
  ["An 18th century printed book, aged paper", "grain"],
  ["A modern developer tool, systematic and dark", "dots"],
  ["Atlassian Jira", "none"],
  ["An ordinary operations dashboard", "none"],
  ["A luxury Swiss watch boutique", "none"],
  ["A children's vaccination clinic", "none"],
]

const client = new TypeSafeClient({ timeout: 30000 })
const pick = (r: unknown) => (r as { choice: string }).choice

const rows = await Promise.all(CASES.map(async ([brief, want]) => {
  /* Both variants and both question sets in as few requests as the isolation
     allows: the two textures can share a request, the contamination test
     cannot, because it is about what ELSE is in the request. */
  const [main, withBold] = await Promise.all([
    client.systemOne({ state: { style_brief: brief }, questions: { bare, hinted } as never }),
    client.systemOne({ state: { style_brief: brief }, questions: { ...stageOne, ...boldQuestions } as never }),
  ])
  const plain = await client.systemOne({ state: { style_brief: brief }, questions: stageOne as never })
  const a = main.answers as Record<string, never>
  const b = withBold.answers as Record<string, never>
  const p = plain.answers as Record<string, never>
  return {
    brief: brief.slice(0, 30), want,
    bare: pick(a.bare), hinted: pick(a.hinted),
    alone: pick(p.pageTexture), withColourQs: pick(b.pageTexture),
  }
}))

console.table(rows)
const hit = (k: "bare" | "hinted") => rows.filter((r) => r[k] === r.want).length
console.log(`\nbare (what ships)  ${hit("bare")}/${rows.length}`)
console.log(`hints actually sent ${hit("hinted")}/${rows.length}`)
const flat = (k: "bare" | "hinted") => rows.filter((r) => r[k] === "none").length
console.log(`answered "none":   bare ${flat("bare")}   hinted ${flat("hinted")}   (4 of 12 should)`)
const moved = rows.filter((r) => r.alone !== r.withColourQs)
console.log(`\ncontamination: pageTexture changed in ${moved.length}/${rows.length} when the colour questions rode along` +
  (moved.length ? ` — ${moved.map((m) => `${m.brief}: ${m.alone}→${m.withColourQs}`).join(", ")}` : ""))
