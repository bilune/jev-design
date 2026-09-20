#!/usr/bin/env tsx
/**
 * Is the recognition pass calibrated?
 *
 * The pass barely improves the answer for a bare brand name — the information is
 * not there to extract. The question this asks is whether it can at least TELL
 * that it is not there: whether `appearanceKnown` predicts how well the name
 * alone will do. A model that knows what it does not know is worth a blocking
 * request even when it cannot fix the problem, because the interface can then
 * ask for the three words that would.
 */
import { TypeSafeClient } from "@typesafe-ai/sdk"

import { generateDesign } from "@/design/jev/generate"
import { recognise } from "@/design/jev/recognise"

type A = Record<string, string | number>

import { BRAND_TRUTH } from "../bench/brand-truth"

/** Controls: three names with no product behind them, two style briefs. */
const CONTROLS = ["Zorblax", "Flembic", "Palvex", "Concrete brutalism, square and heavy", "A warm literary reading app"]
const SUBJECTS: [name: string, checks: number][] = [
  ...Object.keys(BRAND_TRUTH).map((k) => [k, BRAND_TRUTH[k].length] as [string, number]),
  ...CONTROLS.map((k) => [k, 0] as [string, number]),
]

const client = new TypeSafeClient({ timeout: 60000 })
const rows: { name: string; known: number; product: number; score: number | null }[] = []

await Promise.all(
  SUBJECTS.map(async ([name, n]) => {
    const [{ result: r }, gen] = await Promise.all([
      recognise(client, name),
      n ? generateDesign(name, { enrich: false }) : Promise.resolve(null),
    ])
    const checks = BRAND_TRUTH[name] ?? []
    rows.push({
      name,
      known: r.appearanceKnown,
      product: r.namesAProduct,
      score: gen && n ? checks.filter((c) => c.holds(gen.answers as A)).length / checks.length : null,
    })
  })
)

rows.sort((a, b) => b.known - a.known)
console.log(`${"brief".padEnd(38)} ${"is a product".padEnd(13)} ${"knows the look".padEnd(15)} name-alone accuracy`)
console.log("─".repeat(92))
for (const r of rows) {
  console.log(
    `${r.name.padEnd(38)} ${r.product.toFixed(2).padEnd(13)} ${r.known.toFixed(2).padEnd(15)} ` +
      (r.score === null ? "—  (control)" : `${(r.score * 100).toFixed(0)}%`)
  )
}

const scored = rows.filter((r) => r.score !== null) as { known: number; score: number }[]
const mean = (n: number[]) => n.reduce((s, x) => s + x, 0) / (n.length || 1)
const group = (f: (r: { known: number }) => boolean) => {
  const g = scored.filter(f)
  return `${g.length} briefs, ${(mean(g.map((r) => r.score)) * 100).toFixed(0)}% accurate`
}
console.log(`\nsays it knows the look   (≥0.60)  ${group((r) => r.known >= 0.6)}`)
console.log(`says it does not (<0.60)          ${group((r) => r.known < 0.6)}`)

const controls = rows.filter((r) => r.score === null)
console.log(
  `\ncontrols rejected as products: ${controls.filter((r) => r.product < 0.6).length}/${controls.length}`
)
