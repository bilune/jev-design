/**
 * Ablations.
 *
 * The production prompt is `v0`, imported from `src/design/jev/generate.ts`, so
 * the benchmark can never drift from what ships. Every other variant REMOVES
 * one thing. A variant that scores the same as production is a thing we are
 * paying for and not getting.
 */
import { choice, noul, score, type ChoiceCriteria } from "@typesafe-ai/sdk"

import {
  canvases, canCarryBody, easingCurves, faces, hues,
  type CanvasKey, type EasingKey, type FaceCategory, type FaceKey, type HueKey,
} from "@/design/jev/catalog"
import { facePair, stageOne as prodStageOne, stageTwo as prodStageTwo } from "@/design/jev/generate"

type Answers = Record<string, string | number>
export type Variant = {
  id: string
  note: string
  state: (brief: string) => Record<string, unknown>
  stageOne: Record<string, unknown>
  stageTwo: (a: Answers) => { questions: Record<string, unknown>; extra: Record<string, unknown> }
}

const described = <K extends string>(keys: readonly K[], desc: (k: K) => unknown) =>
  Object.fromEntries(keys.map((k) => [k, desc(k)])) as unknown as ChoiceCriteria

/* ── States ──────────────────────────────────────────────────────────────── */

/** What ships: the brief and nothing else. */
const baseState = (brief: string) => ({ style_brief: brief })

/** The framing that used to wrap the brief, to price it. */
const framedState = (brief: string) => ({
  task: "Configure a design engine so an entire operations dashboard takes on the style described below.",
  style_brief: brief,
  note: "Answer for the style itself, not for any particular screen. There is no wrong style, only an inconsistent one.",
})

/**
 * The brief plus a description of what it is applied to. The docs warn that
 * irrelevant detail in state acts as a distractor; this is here to find out
 * whether a dashboard's contents are relevant detail or noise.
 */
const richState = (brief: string) => ({
  task: "Choose the visual character of a design system. Every answer is applied to an entire interface at once.",
  style_brief: brief,
  what_it_is_applied_to: {
    product: "A logistics operations console. Dispatchers watch it for a full shift.",
    surfaces: [
      "a persistent navigation sidebar with counts",
      "a row of four headline metrics",
      "a line chart and a bar chart",
      "a dense sortable table of shipments",
      "dialogs, dropdown menus, toasts and a command palette",
    ],
    constraints: "Numbers must stay legible at a glance. Rows must stay scannable.",
  },
})

/* ── Ablation helpers ────────────────────────────────────────────────────── */

/** Strip a JSON criterion back to its first sentence. */
export const flattenCriteria = (q: unknown): unknown => {
  const question = q as { type: string; instructions: unknown; criteria: unknown }
  const plainInstr =
    typeof question.instructions === "object" && question.instructions !== null
      ? String((question.instructions as Record<string, unknown>).question ?? "")
      : question.instructions
  const first = (v: unknown): string => {
    if (typeof v === "string") return v
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>
      return String(o.is ?? o.what ?? o.summary ?? Object.values(o)[0] ?? "")
    }
    return String(v)
  }
  if (question.type === "choice") {
    return choice(
      plainInstr as string,
      Object.fromEntries(
        Object.entries(question.criteria as Record<string, unknown>).map(([k, v]) => [k, first(v)])
      )
    )
  }
  /* A noul is neither a choice nor a rubric, and this used to fall through to
     `score()` and crash on the first one added to the question set. */
  if (question.type === "noul") {
    const c = question.criteria as Record<string, unknown> | undefined
    return c
      ? noul(plainInstr as string, { true: first(c.true), false: first(c.false) })
      : noul(plainInstr as string)
  }
  if (question.type === "score") {
    return score(plainInstr as string, (question.criteria as unknown[]).map(first) as never)
  }
  /* Exhaustive on purpose. The fall-through was the bug: an unhandled shape was
     silently treated as a rubric, and the failure surfaced as a crash in an
     unrelated place months after the primitive was added. */
  throw new Error(`flattenCriteria: unhandled question type ${String(question.type)}`)
}

const flattenAll = (qs: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(qs).map(([k, v]) => [k, flattenCriteria(v)]))

/**
 * Remove ONE field from every criterion of a question, keeping the rest.
 *
 * The ablations used `flattenCriteria` for this, which reduces a criterion to
 * its first string. So "the convention marks, removed" was also removing every
 * `pick_when` hint, and "the per-level signals, removed" was the only one of
 * the three whose name matched what it did. An ablation that changes two things
 * cannot price either, and these numbers have been quoted in the source as
 * though they priced one.
 */
export const dropField = (q: unknown, field: string): unknown => {
  const question = q as { type: string; instructions: unknown; criteria: unknown }
  /* Nothing else about the criterion may change. An earlier version collapsed a
     criterion left with a single field into that field's bare value, which
     rewrote `{is: "..."}` as `"..."` on every option that had no hint — so an
     ablation that was meant to be a no-op on the expressive axes was in fact
     restructuring all of them, and the score difference it reported was not the
     thing named in its label. */
  const strip = (v: unknown) => {
    if (!v || typeof v !== "object") return v
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([k]) => k !== field))
  }
  /* The instruction that says "choose the option marked as the convention"
     names a mark that is being removed, so it goes with it. */
  let instructions = question.instructions
  if (field === "this_is_the_convention" && instructions && typeof instructions === "object") {
    const rest = Object.fromEntries(
      Object.entries(instructions as Record<string, unknown>).filter(([k]) => k !== "when_the_brief_is_silent")
    )
    /* Shape preserved, exactly as the criteria are: collapsing a one-key
       instruction object into its bare value is a second change the ablation
       did not name. */
    instructions = rest
  }
  if (question.type === "choice") {
    return choice(
      instructions as string,
      Object.fromEntries(
        Object.entries(question.criteria as Record<string, unknown>).map(([k, v]) => [k, strip(v)])
      ) as never
    )
  }
  /* The second instance of the fall-through, found by the fixture on its first
     run rather than by a benchmark crash weeks later. */
  if (question.type === "noul") {
    const c = question.criteria as Record<string, unknown> | undefined
    return c ? noul(instructions as string, c as never) : noul(instructions as string)
  }
  if (question.type === "score") {
    return score(instructions as string, (question.criteria as unknown[]).map(strip) as never)
  }
  throw new Error(`dropField: unhandled question type ${String(question.type)}`)
}

/**
 * Which questions carry a thing, asked of the questions.
 *
 * These were two hand-typed lists and both had gone stale: the convention list
 * missed five questions added since it was written, and the signal list missed
 * three plus every stage-two rubric. A list of what to ablate that does not
 * include everything ablatable reports a smaller effect than the real one.
 */
const carrying = (qs: Record<string, unknown>, field: string) =>
  Object.keys(qs).filter((k) => {
    const c = (qs[k] as { criteria?: unknown }).criteria
    const each = Array.isArray(c) ? c : Object.values((c ?? {}) as Record<string, unknown>)
    return each.some((v) => v && typeof v === "object" && field in (v as Record<string, unknown>))
  })

/** Remove only the "this is the convention" marks, keeping every hint. */
const withoutConventions = (qs: Record<string, unknown>) => {
  const out = { ...qs }
  for (const k of carrying(qs, "this_is_the_convention")) out[k] = dropField(qs[k], "this_is_the_convention")
  return out
}

/** Remove only the per-level signals, keeping the summaries. */
const withoutSignals = (qs: Record<string, unknown>) => {
  const out = { ...qs }
  for (const k of carrying(qs, "signals")) out[k] = dropField(qs[k], "signals")
  return out
}

const passThrough = (a: Answers) => ({
  questions: {
    ...(prodStageTwo as unknown as Record<string, unknown>),
    ...facePair(a.displayCategory as FaceCategory | "same", a.bodyCategory as FaceCategory),
  },
  extra: {
    canvas: `${a.canvas} — ${canvases[a.canvas as CanvasKey].desc}`,
    accent_hue: a.hue,
    corner_roundness_0_to_4: Number(Number(a.roundness).toFixed(2)),
    line_weight_0_to_3: Number(Number(a.borderWeight).toFixed(2)),
    borders: a.borders,
  },
})

/* ── The convention marks, removed from the expressive axes ──────────────── */

/**
 * `conventional()` fixed a real problem — questions the brief never addresses
 * were answered by a coin flip — and was then applied to the axes that ARE the
 * style. This strips the "pick this when the brief is silent" sentence from
 * those axes only, leaving the structural ones anchored.
 */
const EXPRESSIVE = [
  "displayCategory", "iconFamily", "chartPath", "chartFill", "figureMark",
  "deltaStyle", "pageTexture", "surfaceFinish", "figures", "depthKind",
  "labelCase", "surface", "titleAlign",
]

/* `labelCase` and `titleAlign` keep their anchors. Unanchoring everything cost
   4.5 points of accuracy and every single loss was one of those two: all-caps
   labels and centred titles are interface habits rather than neutral defaults,
   which is why they were anchored in the first place. */
const VISUAL_ONLY = EXPRESSIVE.filter((k) => k !== "labelCase" && k !== "titleAlign")
const unanchorVisual = (qs: Record<string, unknown>) => {
  const out = { ...qs }
  for (const k of VISUAL_ONLY) if (out[k]) out[k] = dropField(out[k], "this_is_the_convention")
  return out
}
const unanchor = (qs: Record<string, unknown>) => {
  const out = { ...qs }
  for (const k of EXPRESSIVE) if (out[k]) out[k] = dropField(out[k], "this_is_the_convention")
  return out
}

/* ── Flat faces: the tiering, removed ────────────────────────────────────── */

const ALL_FACES = Object.keys(faces) as FaceKey[]
/* The ablation removes the TIERING. It was also quietly changing eligibility:
   filtering by two names of its own let a copperplate script and an arcade
   face into the body pool, both of which say in their own descriptions that
   they cannot carry running text. An ablation that changes two things at once
   cannot price either. It now uses production's own definition. */
const BODY_FACES = ALL_FACES.filter(canCarryBody)

const flatFaceStageOne = () => {
  const q = { ...(prodStageOne as unknown as Record<string, unknown>) }
  delete q.displayCategory
  delete q.bodyCategory
  q.displayFace = choice("Which typeface carries the headings and titles?", described(ALL_FACES, (k) => faces[k].desc))
  q.bodyFace = choice("Which typeface carries the running text, labels and controls?", described(BODY_FACES, (k) => faces[k].desc))
  return q
}

const flatFaceStageTwo = (a: Answers) => ({
  questions: prodStageTwo as unknown as Record<string, unknown>,
  extra: passThrough({ ...a, displayCategory: "sans", bodyCategory: "sans" }).extra,
})

/* ── The set ─────────────────────────────────────────────────────────────── */

const prodOne = prodStageOne as unknown as Record<string, unknown>

export const variants: Variant[] = [
  { id: "v0-production", note: "what ships — the real pipeline, stage zero included, scored on assembled tokens", state: baseState, stageOne: prodOne, stageTwo: passThrough },
  { id: "a0-harness-baseline", note: "the ablation harness with production's questions untouched — the zero every ablation below is measured against", state: baseState, stageOne: prodOne, stageTwo: passThrough },
  { id: "a1-no-conventions", note: "− the convention marks, from every question that carries one", state: baseState, stageOne: withoutConventions(prodOne), stageTwo: passThrough },
  {
    id: "a2-no-signals",
    note: "− the per-level signals, from every rubric that carries them, in BOTH stages",
    state: baseState,
    stageOne: withoutSignals(prodOne),
    /* It used to leave stage two untouched while claiming "every rubric", so
       four of the rubrics it names — depth, edgeContrast, surfaceTint,
       accentDepth — kept their signals and the ablation under-reported. */
    stageTwo: (a) => ({ ...passThrough(a), questions: withoutSignals(passThrough(a).questions) }),
  },
  {
    id: "a3-plain-criteria", note: "− all JSON structure AND the semantic content inside it (hints, marks, signals): a bundled removal, not a formatting test",
    state: baseState, stageOne: flattenAll(prodOne),
    // The flattened stage two still has to ask for the faces, or `assemble`
    // gets no face at all and the ablation measures a crash instead of a prompt.
    stageTwo: (a) => ({
      ...passThrough(a),
      questions: flattenAll({
        ...(prodStageTwo as unknown as Record<string, unknown>),
        ...facePair(a.displayCategory as FaceCategory | "same", a.bodyCategory as FaceCategory),
      }),
    }),
  },
  { id: "a5-rich-state", note: "+ a description of the dashboard being styled", state: richState, stageOne: prodOne, stageTwo: passThrough },
  { id: "a6-framed-state", note: "+ the task framing back in front of the brief", state: framedState, stageOne: prodOne, stageTwo: passThrough },
  {
    id: "a9-unanchored",
    note: "− the anchors on labelCase and titleAlign, the two expressive axes production still anchors",
    state: baseState,
    stageOne: unanchor(prodOne),
    stageTwo: (a) => ({ ...passThrough(a), questions: unanchor(passThrough(a).questions) }),
  },
  {
    id: "b1-bold-visual",
    note: "NOISE CONTROL — byte-identical questions to a0; any delta here is run-to-run variance",
    state: baseState,
    stageOne: unanchorVisual(prodOne),
    stageTwo: (a) => ({ ...passThrough(a), questions: unanchorVisual(passThrough(a).questions) }),
  },
  { id: "a7-flat-faces", note: "− the face tiers, every face in one list, body eligibility unchanged", state: baseState, stageOne: flatFaceStageOne(), stageTwo: flatFaceStageTwo },
]

export const easingKeys = Object.keys(easingCurves) as EasingKey[]
export const hueKeys = Object.keys(hues) as HueKey[]
