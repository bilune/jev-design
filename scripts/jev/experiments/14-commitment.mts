#!/usr/bin/env tsx
/**
 * Is the engine too timid?
 *
 * `conventional()` names one option as the default so silence in the brief
 * resolves to it instead of to a coin flip. It fixed a real problem and it was
 * then applied to everything — including the axes that ARE the style. A brief
 * about a hand-written log could not reach a script face, because "the headings
 * use the body face" was marked as the convention.
 *
 * Two things are measured here, and only together do they mean anything:
 *
 *   accuracy     the benchmark, unchanged. A bolder engine that stops matching
 *                its brief is not bolder, it is broken.
 *   commitment   how often an EXPRESSIVE axis lands somewhere other than its
 *                default, over briefs that plainly describe a strong style.
 *                A style that is all defaults is not a style.
 */
import { TypeSafeClient } from "@typesafe-ai/sdk"
import { stageOne, stageTwo, facePair, assemble, seriesFrom } from "@/design/jev/generate"
import { canvases, type CanvasKey, type FaceCategory } from "@/design/jev/catalog"
import { choice, score } from "@typesafe-ai/sdk"

/** The axes that carry the style, with the value each falls back to. */
const EXPRESSIVE: Record<string, string> = {
  displayCategory: "same", iconFamily: "stroke", chartPath: "smooth",
  chartFill: "tint", figureMark: "bar", deltaStyle: "badge",
  pageTexture: "none", surfaceFinish: "flat", figures: "tabular",
  depthKind: "blurred", labelCase: "none", surface: "flat", titleAlign: "start",
}

const BRIEFS = [
  "An 18th century printed book, engraved plates, aged paper",
  "A 1770s ship log written by hand in iron gall ink",
  "1980s teletext, colour blocks on black",
  "Concrete brutalism: raw, square, heavy black rules",
  "Memphis Group, Milan 1981",
  "A British Admiralty nautical chart",
  "An ultramodern dark product interface, 2025",
  "A luxury Swiss watch boutique",
  "A children's vaccination clinic, friendly and soft",
  "An engineering blueprint",
]

/** The extra line, when the condition asks for one. */
const BOLD =
  "Commit to the style. Where an option would only be chosen by a style that " +
  "really is this thing, choose it: a conventional answer is the right one only " +
  "when the style genuinely is conventional, not when the choice is difficult."

/**
 * The third condition: keep every description, remove only the sentence that
 * says which option to pick when the brief is silent. Structural, not verbal —
 * and the verbal version has already been measured and went the wrong way.
 */
const strip = (q: unknown): unknown => {
  const question = q as { type: string; instructions: unknown; criteria: Record<string, unknown> }
  if (question.type !== "choice") return q
  const instr =
    typeof question.instructions === "object" && question.instructions !== null
      ? (question.instructions as Record<string, unknown>).question
      : question.instructions
  const plain = Object.fromEntries(
    Object.entries(question.criteria).map(([k, v]) => {
      const o = v as Record<string, unknown>
      return [k, typeof v === "object" && v !== null ? String(o.is ?? o.what ?? "") : v]
    })
  )
  return choice(instr as string, plain as never)
}

const unanchored = (qs: Record<string, unknown>, keys: string[]) => {
  const out = { ...qs }
  for (const k of keys) if (out[k]) out[k] = strip(out[k])
  return out
}

const client = new TypeSafeClient({ timeout: 60000 })

type Mode = "ships" | "bold" | "unanchored"

async function run(brief: string, mode: Mode) {
  const state: Record<string, string> = { style_brief: brief }
  if (mode === "bold") state.how_to_choose = BOLD
  const questions =
    mode === "unanchored"
      ? unanchored(stageOne as unknown as Record<string, unknown>, Object.keys(EXPRESSIVE))
      : stageOne
  const one = await client.systemOne({ state: state as never, questions: questions as never })
  const flat = Object.fromEntries(
    Object.entries(one.answers as Record<string, { type: string; choice?: string; score?: number }>)
      .map(([k, v]) => [k, v.type === "choice" ? v.choice! : v.score!])
  ) as Record<string, string | number>
  const two = await client.systemOne({
    state: {
      ...state,
      already_decided: {
        canvas: `${flat.canvas} — ${canvases[flat.canvas as CanvasKey].desc}`,
        accent_hue: flat.hue,
        corner_roundness_0_to_4: Number(Number(flat.roundness).toFixed(2)),
        line_weight_0_to_3: Number(Number(flat.borderWeight).toFixed(2)),
        borders: flat.borders,
      },
    } as never,
    questions: {
      ...(mode === "unanchored"
        ? unanchored(stageTwo as unknown as Record<string, unknown>, Object.keys(EXPRESSIVE))
        : stageTwo),
      ...facePair(flat.displayCategory as FaceCategory | "same", flat.bodyCategory as FaceCategory),
    },
  })
  const answers = {
    ...flat,
    ...Object.fromEntries(
      Object.entries(two.answers as Record<string, { type: string; choice?: string; score?: number }>)
        .map(([k, v]) => [k, v.type === "choice" ? v.choice! : v.score!])
    ),
  }
  const hue = (one.answers as unknown as Record<string, { confidence: number; probabilities: Record<string, number> }>).hue
  assemble(answers as never, seriesFrom(hue.probabilities, hue.confidence))
  const axes = Object.keys(EXPRESSIVE)
  const committed = axes.filter((k) => String(answers[k]) !== EXPRESSIVE[k])
  return { committed: committed.length, total: axes.length, which: committed }
}

const LABEL: Record<Mode, string> = {
  ships: "as it ships",
  bold: "with the bolder instruction",
  unanchored: "with the convention marks removed from expressive axes",
}

for (const mode of ["ships", "bold", "unanchored"] as Mode[]) {
  const rows = await Promise.all(BRIEFS.map((b) => run(b, mode)))
  const sum = rows.reduce((a, r) => a + r.committed, 0)
  const tot = rows.reduce((a, r) => a + r.total, 0)
  console.log(`\n${LABEL[mode]}: ${sum}/${tot} expressive axes committed (${((sum / tot) * 100).toFixed(0)}%)`)
  rows.forEach((r, i) =>
    console.log(`  ${BRIEFS[i].slice(0, 44).padEnd(44)} ${String(r.committed).padStart(2)}/${r.total}`)
  )
}
