/**
 * The benchmark.
 *
 * Design has no single right answer, so a case never asserts one value. It
 * asserts the set a competent designer would accept, and only on axes the brief
 * actually determines. A brief that says nothing about motion is not scored on
 * motion — otherwise the benchmark measures the model's priors, not the prompt.
 *
 * Half the cases state the style outright. The other half name a thing and
 * leave the style implicit, which is what a real user types.
 */
import { faces, type FaceCategory, type FaceKey } from "@/design/jev/catalog"
import type { DesignConfig } from "@/design/tokens"

type Answers = Record<string, string | number>

export type Assertion = {
  axis: string
  /* `config` is the ASSEMBLED result, so an assertion can test what the engine
     produced and not only what the model said. Optional, because most of these
     are about the answer itself. */
  holds: (a: Answers, config?: DesignConfig) => boolean
  /** What it should have said, for the failure line. */
  expected: string
  /** Whether it reads the model's answer or the engine's output. */
  layer?: "answer" | "assembled"
}

const cat = (a: Answers, key: string): FaceCategory =>
  faces[a[key] as FaceKey].category

export const oneOf = (axis: string, allowed: string[]): Assertion => ({
  axis,
  expected: allowed.join(" | "),
  holds: (a) => allowed.includes(String(a[axis])),
})

export const faceIn = (key: string, allowed: FaceCategory[]): Assertion => ({
  axis: key,
  expected: `a ${allowed.join(" or ")} face`,
  holds: (a) => allowed.includes(cat(a, key)),
})

/**
 * Asserted on the PAGE THAT SHIPS, not on the label the model chose.
 *
 * Every assertion in this file read the raw answer, so a benchmark could report
 * 100% while assembly inverted, floored, clamped or discarded what it scored.
 * The page is the clearest case: its lightness is now moved by the ground
 * colour, so "the canvas answer is in the dark set" and "the page is dark" are
 * two different claims and only the second is the one a person sees.
 */
export const canvasIs = (tone: "dark" | "light"): Assertion => ({
  axis: "canvas",
  layer: "assembled",
  expected: `a ${tone} page`,
  holds: (_a, config) => {
    if (!config) return false
    const l = Number(/oklch\(\s*([\d.]+)/.exec(config.scalars.canvas)?.[1] ?? NaN)
    return tone === "dark" ? l < 0.5 : l >= 0.5
  },
})

/* ── Assertions on the assembled result ──────────────────────────────────── */

const num = (v: string) => Number.parseFloat(v)
const chromaOf = (c: string) => Number(/oklch\(\s*[\d.]+\s+([\d.]+)/.exec(c)?.[1] ?? NaN)

/** The accent's saturation, as it ships, after every floor and gamut clamp. */
export const accentChroma = (min: number, max: number): Assertion => ({
  axis: "accent chroma",
  layer: "assembled",
  expected: `between ${min} and ${max}`,
  holds: (_a, config) => {
    /* An assembled assertion with no config has not been satisfied, it has not
       been RUN. Returning true let a failed execution make this column look
       cleaner than the run actually was. */
    if (!config) return false
    const c = chromaOf(config.scalars.accent)
    return c >= min && c <= max
  },
})

/** The corner radius that actually ships, in rem. */
export const radiusIs = (kind: "square" | "round"): Assertion => ({
  axis: "assembled radius",
  layer: "assembled",
  expected: kind === "square" ? "0rem on both ladders" : "a non-zero radius",
  holds: (_a, config) => {
    if (!config) return false
    const both = [config.scalars.radiusControl, config.scalars.radiusSurface].map(num)
    return kind === "square" ? both.every((v) => v === 0) : both.every((v) => v > 0)
  },
})

/**
 * Transitions only. `motion` stopped meaning "nothing moves" when ambient was
 * separated from it, so a brief that says "no motion at all" is not tested by
 * this alone — `motion=off, ambient=blink` is now a valid and different thing.
 */
export const motionIs = (want: "on" | "off"): Assertion => ({
  axis: "assembled motion",
  layer: "assembled",
  expected: `transitions ${want}`,
  holds: (_a, config) => (config ? config.flags.motion === want : false),
})

/** Nothing moves: instant transitions AND no ambient effect. */
export const nothingMoves = (): Assertion => ({
  axis: "assembled stillness",
  layer: "assembled",
  expected: "transitions off and ambient none",
  holds: (_a, config) => (config ? config.flags.motion === "off" && config.flags.ambient === "none" : false),
})

/** Whether a shadow is actually drawn, after the recipe lookup. */
export const shadowIs = (want: "none" | "some"): Assertion => ({
  axis: "assembled shadow",
  layer: "assembled",
  expected: want === "none" ? "no surface shadow" : "a surface shadow",
  holds: (_a, config) => {
    if (!config) return false
    const drawn = config.scalars.shadowSurface !== "none"
    return want === "some" ? drawn : !drawn
  },
})

export const below = (axis: string, max: number): Assertion => ({
  axis,
  expected: `below ${max}`,
  holds: (a) => Number(a[axis]) < max,
})

export const above = (axis: string, min: number): Assertion => ({
  axis,
  expected: `above ${min}`,
  holds: (a) => Number(a[axis]) > min,
})

export type Case = { brief: string; explicit: boolean; expect: Assertion[] }

export const cases: Case[] = [
  {
    brief: "1980s amber phosphor terminal: dark screen, glowing amber text, monospaced, dense",
    explicit: true,
    expect: [
      canvasIs("dark"),
      oneOf("hue", ["amber", "gold", "orange"]),
      faceIn("bodyFace", ["mono"]),
      below("roundness", 1),
      oneOf("density", ["compact"]),
      oneOf("labelCase", ["upper"]),
      // A phosphor screen emits. This case exists because factoring depth into
      // amount and kind once cancelled the glow: the kind was right and the
      // amount said "flat", because terminals are flat.
      oneOf("depthKind", ["glow"]),
      above("depth", 0.8),
      /* And the glow has to survive the recipe lookup. A correct kind plus a
         correct strength assembled to `shadowSurface: none` for a whole class
         of answers until this week, and no assertion here could see it. */
      shadowIs("some"),
      /* Emitted amber is not pale. The floor and the gamut clamp both act after
         the answer, and this is the only place that checks what came out. */
      accentChroma(0.1, 0.4),
    ],
  },
  {
    brief: "Luxury Swiss watch boutique: gold on near-black, serif type, very spacious, slow and deliberate",
    explicit: true,
    expect: [
      canvasIs("dark"),
      oneOf("hue", ["gold", "amber", "brick"]),
      faceIn("displayFace", ["serif", "display"]),
      oneOf("density", ["comfortable"]),
      above("airiness", 2.5),
      above("speed", 2),
    ],
  },
  {
    brief: "Concrete brutalism: raw, perfectly square, heavy black rules, all caps, no motion at all",
    explicit: true,
    expect: [
      below("roundness", 0.5),
      above("borderWeight", 2),
      oneOf("labelCase", ["upper"]),
      below("speed", 0.5),
      oneOf("borders", ["full"]),
      /* "Perfectly square" and "no motion at all" are stated outright in this
         brief, so they are assertable on the output. Both used to be scored on
         the answer alone: the two radius ladders disagreed below the deadzone,
         and a zero duration silently cancelled ambient motion. */
      radiusIs("square"),
      /* The brief says "no motion at all", which under the separated contract
         is two answers, not one. */
      nothingMoves(),
    ],
  },
  {
    brief: "A soft children's app: very rounded, pastel, floating cards, playful and bouncy",
    explicit: true,
    expect: [
      above("roundness", 3),
      canvasIs("light"),
      below("chroma", 3.5),
      above("depth", 1.5),
      oneOf("depthKind", ["blurred"]),
      oneOf("easing", ["expressive", "elastic", "gentle"]),
    ],
  },
  {
    brief: "Swiss International Style: strict grid, Helvetica-like neutral sans, red accent, zero ornament",
    explicit: true,
    expect: [
      canvasIs("light"),
      oneOf("hue", ["crimson", "brick", "orange"]),
      faceIn("bodyFace", ["sans"]),
      below("roundness", 1),
      below("depth", 1.5),
    ],
  },
  {
    brief: "A right-handed console: navigation on the trailing edge, icons after their labels, footer buttons packed to the leading edge",
    explicit: true,
    expect: [
      oneOf("navSide", ["right"]),
      oneOf("iconSide", ["trailing"]),
      oneOf("actionsAlign", ["start"]),
    ],
  },
  /* ── Implicit: the style has to be inferred from the thing named ───────── */
  {
    brief: "A Bloomberg terminal",
    explicit: false,
    expect: [
      canvasIs("dark"),
      oneOf("density", ["compact"]),
      below("roundness", 1.5),
      below("airiness", 1.5),
    ],
  },
  {
    brief: "A 1970s Penguin paperback",
    explicit: false,
    expect: [
      canvasIs("light"),
      faceIn("bodyFace", ["serif"]),
      oneOf("hue", ["brick", "orange", "crimson", "gold", "olive"]),
      // `smallCaps` did not exist when this was written, and a Penguin
      // paperback sets its labels in small caps. The assertion was out of date,
      // not the answer.
      oneOf("labelCase", ["none", "smallCaps"]),
    ],
  },
  {
    brief: "A nuclear reactor control room during an alarm",
    explicit: false,
    expect: [
      canvasIs("dark"),
      oneOf("hue", ["crimson", "orange", "brick"]),
      above("chroma", 3),
      // No depth assertion here. A control room is a wall of flat panels and
      // the alarm is carried by colour, not by light. Asserting a glow would
      // have been tuning the prompt to an expectation I could not defend.
      oneOf("density", ["compact"]),
    ],
  },
  {
    brief: "A children's vaccination clinic waiting room",
    explicit: false,
    expect: [
      canvasIs("light"),
      above("roundness", 2),
      oneOf("labelCase", ["none"]),
      oneOf("titleAlign", ["start"]),
      oneOf("hue", ["sky", "blue", "teal", "cyan", "green", "pink", "rose", "emerald"]),
    ],
  },
  {
    brief: "A court filing typed on a typewriter",
    explicit: false,
    expect: [
      canvasIs("light"),
      faceIn("bodyFace", ["mono", "serif"]),
      below("chroma", 2.5),
      below("roundness", 1),
      oneOf("labelCase", ["none"]),
    ],
  },
  {
    brief: "A high fashion magazine masthead",
    explicit: false,
    expect: [
      faceIn("displayFace", ["serif", "display"]),
      above("airiness", 2.5),
      below("chroma", 3),
      above("textSize", 1.5),
    ],
  },
]
