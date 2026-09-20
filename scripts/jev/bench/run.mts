#!/usr/bin/env tsx
/**
 * node --env-file=.env.jev ./node_modules/.bin/tsx scripts/jev/bench/run.mts [--only v2] [--repeat 1]
 *
 * Runs every variant over every case and scores them. Cases run concurrently;
 * the two stages of a case are sequential by construction.
 *
 * HOW MUCH OF A DELTA IS REAL
 *
 * `b1` sends questions byte-identical to `a0` and exists to answer that. Over
 * five observations its disagreement with the baseline was 0, 2, 1, 0 and 1
 * assertions of 63 — so this benchmark resolves about ±2 assertions, or ±3.2
 * points, at one repeat.
 *
 * Most of the ablation deltas here are inside that. Only `a3`, which removes
 * the structure and the semantic content together, has been outside it on every
 * run. The rest need repeats before they mean anything, and any number quoted
 * from a single run of this file — including several that were quoted into
 * source comments before the control existed — is a reading, not a measurement.
 *
 * The control was added because equal totals were being read as agreement. They
 * are not: two runs can score the same and disagree on which assertions failed,
 * with the gains cancelling the losses, which is what "the totals hide a swap"
 * below reports.
 */
import { TypeSafeClient } from "@typesafe-ai/sdk"

import { assemble, generateDesign } from "@/design/jev/generate"
import type { Answers as Assembled } from "@/design/jev/generate"

import { cases } from "./cases"
import { variants } from "./variants"

const argv = process.argv.slice(2)
const flag = (n: string, d?: string) => {
  const i = argv.indexOf(`--${n}`)
  return i === -1 ? d : argv[i + 1]
}
const only = flag("only")
const repeat = Number(flag("repeat", "1"))

const client = new TypeSafeClient({ timeout: 60000 })

type Answers = Record<string, string | number>
const flatten = (answers: Record<string, { type: string; choice?: string; score?: number; noul?: number }>) =>
  Object.fromEntries(
    Object.entries(answers).map(([k, v]) => [
      k,
      v.type === "choice" ? v.choice! : v.type === "score" ? v.score! : v.noul!,
    ])
  ) as Answers

const confidences = (answers: Record<string, { confidence?: number }>) =>
  Object.values(answers)
    .map((v) => v.confidence)
    .filter((c): c is number => typeof c === "number")

/**
 * `v0` runs the real thing; every other variant runs the ablation harness.
 *
 * They used to both run the harness, which imports production's QUESTIONS and
 * then executes a pipeline of its own: two requests, no stage zero, no
 * recognition context, no departure gate, and no coloured-ground questions. So
 * the row labelled "what ships" had not shipped for some time, and the headline
 * score could not have caught a regression in any of those.
 *
 * It also never called `assemble`, so every assertion tested what the model
 * SAID and nothing tested what the engine then did with it. An answer that
 * assembly inverts, floors, clamps or discards scored a pass. Replaying fixed
 * answers through assembly this week found six such places, none of which this
 * benchmark could see. `tokens` now carries the assembled config so a case can
 * assert on either.
 */
async function runOne(variant: (typeof variants)[number], brief: string) {
  if (variant.id.startsWith("v0")) {
    const r = await generateDesign(brief, { client })
    return {
      answers: r.answers as unknown as Answers,
      config: r.config,
      tokens: r.usage.inputTokens,
      confidence: r.confidence ?? [],
    }
  }
  const state = variant.state(brief)
  const one = await client.systemOne({ state: state as never, questions: variant.stageOne as never })
  const a = flatten(one.answers as never)
  const { questions, extra } = variant.stageTwo(a)
  const two = await client.systemOne({
    state: { ...state, already_decided: extra } as never,
    questions: questions as never,
  })
  const answers = { ...a, ...flatten(two.answers as never) }
  return {
    answers,
    config: assemble(answers as unknown as Assembled),
    tokens: one.usage.input_tokens + two.usage.input_tokens,
    confidence: [...confidences(one.answers as never), ...confidences(two.answers as never)],
  }
}

/* The full brief, the repeat and the assertion's position. Truncating the brief
   collided between cases and omitting the repeat made `new Map` overwrite one
   run of a pair with the other. */
const id = (brief: string, rep: number, i: number, axis: string) => `${brief}|r${rep}|#${i}|${axis}`

const picked = variants.filter((v) => !only || v.id.includes(only))
const rows: {
  variant: string; note: string; pass: number; total: number
  asmPass: number; asmTotal: number
  outcomes: Map<string, boolean>
  conf: number; tokens: number; ms: number
  misses: string[]
}[] = []

for (const variant of picked) {
  const t0 = Date.now()
  const results = await Promise.all(
    cases.flatMap((c) =>
      Array.from({ length: repeat }, async (_unused, rep) => {
        try {
          const r = await runOne(variant, c.brief)
          const failed = c.expect.filter((e) => !e.holds(r.answers, r.config))
          /* Counted apart, because they answer different questions. A raw pass
             says the model chose well; an assembled pass says the engine kept
             what it chose. The headline used to be the first alone, and read as
             if it were both. */
          const isAsm = (e: (typeof c.expect)[number]) => e.layer === "assembled"
          /* One record per (brief, assertion) so two runs can be compared
             assertion by assertion. Equal totals prove nothing on their own:
             two runs can agree on the score and disagree on every line, with
             the gains cancelling the losses. `axis` alone is not an id, because
             several assertions can share one. */
          const outcomes = c.expect.map((e, i) => [id(c.brief, rep, i, e.axis), !failed.includes(e)] as const)
          return {
            pass: c.expect.length - failed.length,
            total: c.expect.length,
            asmPass: c.expect.filter(isAsm).length - failed.filter(isAsm).length,
            asmTotal: c.expect.filter(isAsm).length,
            outcomes,
            tokens: r.tokens,
            conf: r.confidence.reduce((s, n) => s + n, 0) / (r.confidence.length || 1),
            misses: failed.map(
              (e) => `${c.brief.slice(0, 26)}… ${e.axis}=${r.answers[e.axis]} (want ${e.expected})`
            ),
          }
        } catch (e) {
          /* A crash counts every assertion as failed, including the assembled
             ones. Zeroing the assembled denominator made an execution failure
             improve that column. */
          const asm = c.expect.filter((x) => x.layer === "assembled").length
          /* A crash emits outcomes too, all failed. Emitting none made the run
             LOOK like agreement, because the comparison skips ids it cannot
             find on both sides. */
          return {
            pass: 0, total: c.expect.length, asmPass: 0, asmTotal: asm,
            outcomes: c.expect.map((x, i) => [id(c.brief, rep, i, x.axis), false] as const),
            tokens: 0, conf: 0, misses: [`ERROR ${String(e).slice(0, 80)}`],
          }
        }
      })
    )
  )
  const sum = (f: (r: (typeof results)[number]) => number) => results.reduce((s, r) => s + f(r), 0)
  rows.push({
    variant: variant.id,
    note: variant.note,
    pass: sum((r) => r.pass),
    total: sum((r) => r.total),
    asmPass: sum((r) => r.asmPass ?? 0),
    asmTotal: sum((r) => r.asmTotal ?? 0),
    outcomes: new Map(results.flatMap((r) => r.outcomes ?? [])),
    conf: sum((r) => r.conf) / results.length,
    tokens: Math.round(sum((r) => r.tokens) / results.length),
    ms: Date.now() - t0,
    misses: results.flatMap((r) => r.misses),
  })
}

/* An ablation is compared against the ABLATION HARNESS, not against
   production. `v0` runs the real pipeline now, which has a blocking stage zero
   the harness does not, so a delta between them would price the pipeline rather
   than the thing the ablation removed. `a0` is the harness with production's
   questions untouched: the only honest zero for these rows. */
const baseline = rows.find((r) => r.variant.startsWith("a0")) ?? rows.find((r) => r.variant.startsWith("v0"))
console.log(
  `\n${"variant".padEnd(24)} ${"score".padEnd(14)} ${"assembled".padEnd(10)} ${"conf".padEnd(6)} ${"tok/run".padEnd(8)} note`
)
console.log("─".repeat(96))
for (const r of rows) {
  const pct = (r.pass / r.total) * 100
  const delta = baseline && r !== baseline && !r.variant.startsWith("v0") ? ` ${pct - (baseline.pass / baseline.total) * 100 >= 0 ? "+" : ""}${(pct - (baseline.pass / baseline.total) * 100).toFixed(1)}` : ""
  console.log(
    `${r.variant.padEnd(24)} ${`${r.pass}/${r.total} ${pct.toFixed(1)}%${delta}`.padEnd(14)} ` +
      `${`${r.asmPass}/${r.asmTotal}`.padEnd(10)} ` +
      `${r.conf.toFixed(2).padEnd(6)} ${String(r.tokens).padEnd(8)} ${r.note}`
  )
}

/* The cancellation check. Two runs of BYTE-IDENTICAL questions can report the
   same total while disagreeing on which assertions failed, and an aggregate
   that hides that is not a control. Net says whether the score moved;
   disagreement says whether anything moved at all. */
const control = rows.find((r) => r.variant.startsWith("b1"))
if (baseline && control && control !== baseline) {
  let gains = 0
  let losses = 0
  let compared = 0
  for (const [key, ok] of control.outcomes) {
    const was = baseline.outcomes.get(key)
    if (was === undefined) continue
    compared++
    if (ok && !was) gains++
    if (!ok && was) losses++
  }
  console.log(
    `\nnoise control vs baseline — net ${gains - losses >= 0 ? "+" : ""}${gains - losses}, ` +
      `disagreement ${gains + losses} of ${compared} compared (${baseline.outcomes.size} in baseline)` +
      (gains + losses === 0 ? " (identical, line for line)" : " — the totals hide a swap")
  )
}

console.log("\nmisses")
for (const r of rows) {
  console.log(`\n  ${r.variant}`)
  for (const m of r.misses.slice(0, 14)) console.log(`    ${m}`)
  if (r.misses.length > 14) console.log(`    … and ${r.misses.length - 14} more`)
}
