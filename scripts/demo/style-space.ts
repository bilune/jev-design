/**
 * A uniform sample of the style space, drawn the way the engine reads it.
 *
 * The model answers every question with a choice or with an expected score, so
 * that is what gets faked here: a label out of the same list the question
 * offers, or a float across the same ladder. Everything downstream — which
 * canvas implies dark mode, when a glow is suppressed, how a hue is clamped
 * into gamut — is left to `assemble()`, because those are the engine's
 * couplings and faking them separately would be measuring a different thing.
 *
 * Two films draw from this: `shuffle.mts` takes what comes, and
 * `gallery.mts` samples heavily and keeps the few it judges worth showing.
 */
import { type Answers } from "@/design/jev/generate"
import {
  bodyFaces, canvases, chromaLadder, DEPTH_RECIPES, displayFaces, easingCurves,
  hues, ladders, monoFaces,
  type CanvasKey, type DepthKind, type EasingKey, type FaceKey, type HueKey,
} from "@/design/jev/catalog"

/** mulberry32 — small, seedable, and good enough to pick from lists. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}


/**
 * One random point in the answer space.
 *
 * The model answers every question with a choice or with an expected score, so
 * that is what gets faked here: a label out of the same list the question
 * offers, or a float across the same ladder. Everything downstream — which
 * canvas implies dark mode, when a glow is suppressed, how a hue is clamped
 * into gamut — is left to `assemble()`, because those are the engine's
 * couplings and faking them separately would be measuring a different thing.
 */
export function randomAnswers(rand: () => number): Answers {
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]
  /* A continuous answer, over the full travel of the ladder that reads it. */
  const rung = (len: number) => rand() * (len - 1)

  /* A page made of a material, rather than of paper, is the rarer branch: the
     engine only opens that question for a brief that has left business
     software behind. Firing it one time in five keeps the sweep honest about
     how often it happens. */
  const worldly = rand() < 0.2

  return {
    canvas: pick(Object.keys(canvases) as CanvasKey[]),
    hue: pick(Object.keys(hues) as HueKey[]),
    displayFace: pick(displayFaces as readonly FaceKey[]),
    bodyFace: pick(bodyFaces as readonly FaceKey[]),
    displayCategory: "same",
    bodyCategory: "sans",
    monoFace: pick(monoFaces as readonly FaceKey[]),
    easing: pick(Object.keys(easingCurves) as EasingKey[]),
    depthKind: pick(Object.keys(DEPTH_RECIPES) as DepthKind[]),

    density: pick(["compact", "cozy", "comfortable"] as const),
    borders: pick(["full", "quiet", "none", "brackets", "ticks"] as const),
    surface: pick(["raised", "flat", "outline"] as const),
    labelCase: pick(["none", "upper", "smallCaps"] as const),
    titleAlign: pick(["start", "center"] as const),
    iconFamily: pick(["stroke", "rounded", "solid", "pixel", "none"] as const),
    cornerStyle: pick(["round", "bevel", "notch", "squircle", "diagonal"] as const),
    tableStyle: pick(["ruled", "striped", "bare", "boxed"] as const),
    ruleStyle: pick(["hairline", "double", "dotted", "groove", "fade", "ornament", "none"] as const),
    surfaceFinish: pick(["flat", "highlight", "gradient", "glass", "emissive"] as const),
    figures: pick(["tabular", "lining", "oldstyle"] as const),
    navWidth: pick(["narrow", "regular", "wide"] as const),
    figureLayout: pick(["row", "grid", "lead"] as const),
    panelSplit: pick(["majorMinor", "equal", "minorMajor", "stacked"] as const),
    measure: pick(["full", "wide", "reading"] as const),
    ambient: pick(["none", "blink", "breathe", "sweep"] as const),
    pageTexture: pick(["none", "grid", "dots", "scanlines", "grain"] as const),
    figureMark: pick(["bar", "segments", "rule", "none"] as const),
    deltaStyle: pick(["badge", "text", "arrow"] as const),
    chartPath: pick(["smooth", "straight", "stepped"] as const),
    chartFill: pick(["tint", "gradient", "solid", "hatched", "none"] as const),
    iconSide: pick(["leading", "trailing"] as const),
    actionsAlign: pick(["start", "end", "stretch", "between"] as const),
    labelPlacement: pick(["top", "start"] as const),
    navSide: pick(["left", "right"] as const),
    indicatorSide: pick(["start", "end"] as const),

    ...(worldly
      ? {
          pageGround: pick(Object.keys(hues) as HueKey[]),
          pageColour: 1 + rand() * (ladders.pageChroma.length - 2),
          accentOnPage: pick(Object.keys(hues) as HueKey[]),
        }
      : {}),

    signal: rand() * 3,
    depth: rand() * 3,
    chroma: rung(chromaLadder.length),
    roundness: rung(ladders.roundness.control.length),
    borderWeight: rung(ladders.borderWeight.length),
    airiness: rung(ladders.airiness.gapSection.length),
    controlSize: rung(ladders.controlSize.height.length),
    textSize: rung(ladders.textSize.base.length),
    labelTracking: rung(ladders.tracking.length),
    bodyTracking: rung(ladders.bodyTracking.length),
    titleTracking: rung(ladders.titleTracking.length),
    titleWeight: rung(ladders.weight.length),
    labelWeight: rung(ladders.weight.length),
    speed: rung(ladders.duration.length),
    edgeContrast: rung(ladders.edgeContrast.length),
    surfaceTint: rung(ladders.surfaceTint.length),
    accentDepth: rung(ladders.accentDepth.length),
    /* Whether the style has a colour at all. Left to chance it would be grey
       half the time, which is not what the space looks like. */
    accentIsChromatic: rand() < 0.85 ? 0.5 + rand() * 0.5 : rand() * 0.5,
  }
}
