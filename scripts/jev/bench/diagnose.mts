#!/usr/bin/env tsx
/**
 * Per-question diagnosis. An aggregate score says whether the prompt is good;
 * it never says which question is weak. This does.
 *
 * For every choice question it reports mean confidence, how often the top two
 * options are within 0.1 of each other (a coin flip), and how concentrated the
 * answers are across all briefs — a question that returns the same label for
 * twelve unrelated styles is not reading the brief, it is reading its priors.
 */
import { TypeSafeClient } from "@typesafe-ai/sdk"

import { cases } from "./cases"
import { variants } from "./variants"

const client = new TypeSafeClient({ timeout: 60000 })
const pick = process.argv.slice(2).find((a) => !a.startsWith("--"))
const variant = variants.find((v) => v.id.includes(pick ?? "v0")) ?? variants[0]
console.log(`diagnosing ${variant.id} — ${variant.note}`)

type Stat = { conf: number[]; ties: number; picks: Record<string, number>; scores: number[] }
const stats: Record<string, Stat> = {}
const bump = (k: string) => (stats[k] ??= { conf: [], ties: 0, picks: {}, scores: [] })

const record = (answers: Record<string, { type: string; choice?: string; confidence?: number; score?: number; probabilities?: Record<string, number> }>) => {
  for (const [k, v] of Object.entries(answers)) {
    const s = bump(k)
    if (v.type === "choice") {
      s.conf.push(v.confidence ?? 0)
      s.picks[v.choice!] = (s.picks[v.choice!] ?? 0) + 1
      const p = Object.values(v.probabilities ?? {}).sort((a, b) => b - a)
      if (p.length > 1 && p[0] - p[1] < 0.1) s.ties++
    } else if (v.type === "score") {
      s.conf.push(v.confidence ?? 0)
      s.scores.push(v.score ?? 0)
    }
  }
}

await Promise.all(
  cases.map(async (c) => {
    const state = variant.state(c.brief)
    const one = await client.systemOne({ state: state as never, questions: variant.stageOne as never })
    record(one.answers as never)
    const flat = Object.fromEntries(
      Object.entries(one.answers as Record<string, { type: string; choice?: string; score?: number }>)
        .map(([k, v]) => [k, v.type === "choice" ? v.choice! : v.score!])
    )
    const { questions, extra } = variant.stageTwo(flat as never)
    const two = await client.systemOne({ state: { ...state, already_decided: extra } as never, questions: questions as never })
    record(two.answers as never)
  })
)

const mean = (n: number[]) => n.reduce((s, x) => s + x, 0) / (n.length || 1)
const sd = (n: number[]) => {
  const m = mean(n)
  return Math.sqrt(mean(n.map((x) => (x - m) ** 2)))
}

const rows = Object.entries(stats).map(([q, s]) => {
  const isChoice = s.picks && Object.keys(s.picks).length > 0
  const top = Object.entries(s.picks).sort((a, b) => b[1] - a[1])[0]
  return {
    q,
    kind: isChoice ? "choice" : "score",
    conf: mean(s.conf),
    ties: s.ties,
    // For a choice: how often the single most common label was returned across
    // twelve unrelated briefs. For a score: the spread of the answers.
    concentration: isChoice ? top[1] / cases.length : 0,
    topLabel: isChoice ? top[0] : "",
    spread: isChoice ? 0 : sd(s.scores),
  }
})

rows.sort((a, b) => a.conf - b.conf)
console.log(`\n${"question".padEnd(16)} ${"kind".padEnd(7)} ${"conf".padEnd(6)} ${"ties".padEnd(5)} ${"same answer".padEnd(12)} detail`)
console.log("─".repeat(92))
for (const r of rows) {
  const flat = r.kind === "choice" ? `${Math.round(r.concentration * 100)}% "${r.topLabel}"` : ""
  // A question that returns the same label for most briefs is only a problem
  // when it is ALSO unsure. A convention answered at 0.96 is a decision the
  // prompt was built to make; flagging it would train us to ignore the report.
  // Confidence means different things for the two kinds. For a choice it is how
  // sure the model is of one label. For a score it is how concentrated the mass
  // is on one rung — and we WANT it spread, because the expected score between
  // rungs is what produces a continuous value. So a score is judged on whether
  // it moves across briefs, and a choice on whether it is sure.
  const warn =
    r.kind === "score"
      ? r.spread < 0.5
      : r.conf < 0.45 || (r.concentration >= 0.75 && r.conf < 0.7)
  console.log(
    `${(warn ? "! " : "  ") + r.q.padEnd(14)} ${r.kind.padEnd(7)} ${r.conf.toFixed(2).padEnd(6)} ` +
      `${String(r.ties).padEnd(5)} ${flat.padEnd(12)} ${r.kind === "score" ? `spread ${r.spread.toFixed(2)}` : ""}`
  )
}
console.log(
  "\n!  choice: confidence under 0.45, or the same label for 9+ of 12 briefs WHILE unsure.\n" +
    "   score:  moves less than half a rung across twelve unrelated briefs.\n" +
    "   A confident default is not a fault, and a score spread over two rungs is the point."
)
