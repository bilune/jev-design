/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  BRIEF → DESIGN CONFIG
 * ─────────────────────────────────────────────────────────────────────────────
 *  Two requests to Jev, then arithmetic. The split is not about cost: both
 *  requests together are ~1.5s and a hundredth of a cent. It is that Jev
 *  answers every question in a request in parallel and in isolation, so a
 *  question whose right answer depends on another answer cannot travel with it.
 *
 *  Stage 1 is everything derivable from the brief alone.
 *  Stage 2 is everything derivable only from stage 1.
 *  Stage 3 is not a request at all: it is `assemble`, where every number,
 *  contrast ratio and coupling is resolved in code.
 */
import { choice, score, noul, type ChoiceCriteria } from "@typesafe-ai/sdk"

import type { DesignConfig, DesignFlags } from "@/design/tokens"
import { jevClient, type JevClient } from "./client"
import { recognise, recognitionContext, type Recognition } from "./recognise"
import {
  canvases, canCarryBody, chromaLadder, DEPTH_RECIPES, easingCurves, faces, facesByCategory, hues, HUE_CEILING, HUE_LIMITS,
  ladders, monoFaces, shadowRecipes,
  type CanvasKey, type DepthKind, type EasingKey, type FaceCategory, type FaceKey, type HueKey,
  type ShadowKey,
} from "./catalog"

/* ── helpers ─────────────────────────────────────────────────────────────── */

const described = <K extends string>(keys: readonly K[], desc: (k: K) => unknown) =>
  Object.fromEntries(keys.map((k) => [k, desc(k)])) as unknown as ChoiceCriteria

/**
 * Interpolate an ordered ladder using the expected score, with a deadzone at
 * both ends. An expected score of 0.06 is the model saying "square", and
 * interpolating it literally yields a 0.0075rem radius: not zero, not visible,
 * and enough to break every guarantee the engine makes about square corners.
 */
export function lerp(rungs: readonly number[], s: number): number {
  const top = rungs.length - 1
  let v = Math.max(0, Math.min(top, s))
  if (v < 0.1) v = 0
  if (v > top - 0.1) v = top
  const lo = Math.floor(v)
  return rungs[lo] + (rungs[Math.min(top, lo + 1)] - rungs[lo]) * (v - lo)
}

/**
 * A deadzone in answer space is not enough. An expected score of 0.11 clears
 * the ladder's deadzone and still produces a 0.0138rem radius: a value that is
 * not zero, is invisible, and quietly breaks the guarantee that square corners
 * are square. The deadzone has to be applied in the unit that ships, so
 * anything under a pixel collapses to nothing.
 */
const rem = (n: number) => `${n < 0.0625 ? 0 : Number(n.toFixed(4))}rem`
const snap100 = (n: number) => String(Math.round(n / 100) * 100)

/* ── How the questions are written ───────────────────────────────────────────
 * Three shapes, each chosen by measurement rather than taste. The benchmark in
 * `scripts/jev/bench` scores twelve briefs against what a designer would accept
 * and reports per-question confidence; every rule below moved one of those two
 * numbers.
 *
 *   plain choice   — when the options are genuinely distinct and the brief
 *                    decides between them (hue, typeface, easing).
 *   `conventional` — when one option is the convention and the brief usually
 *                    says nothing. Without this, `indicatorSide` answered at
 *                    0.29 confidence: not confusion about design, just a
 *                    question the brief never addresses, so the mass split and
 *                    the answer flickered between runs. Naming the convention
 *                    took it to 0.87 without costing steerability — a brief
 *                    that asks for a mirrored layout still gets one.
 *   `signalScore`  — when a ladder needs matching against, not adjectives.
 *                    `surfaceTint` varied by 0.37 of a rung across twelve
 *                    unrelated styles, which is a question that is not reading
 *                    the brief at all. With signals per level it varies by 0.90.
 *
 * Structured criteria carry `not_for` and `requires` where two options blur.
 * The model answers the question you wrote, not the one you meant, so a
 * boundary that matters is stated rather than implied.
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * A choice where one option is the convention. Silence in the brief resolves to
 * the default instead of to noise.
 */
const conventional = (
  question: string | Record<string, string>,
  options: Record<string, { is: string; convention?: true; pick_when?: string }>
) =>
  choice(
    { question, when_the_brief_is_silent: "choose the option marked as the convention" },
    Object.fromEntries(
      Object.entries(options).map(([k, v]) => [
        k,
        v.convention
          ? { is: v.is, this_is_the_convention: "pick this unless the brief asks for something else" }
          : { is: v.is, pick_when: v.pick_when },
      ])
    ) as unknown as ChoiceCriteria
  )

/**
 * The same criteria, without the sentence that says which one to pick when the
 * brief is silent.
 *
 * `conventional()` fixed a real problem — questions the brief never addresses
 * were answered by a coin flip — and was then applied to the axes that ARE the
 * style, which made the engine timid exactly where it should commit. Measured
 * over ten strongly-styled briefs, the expressive axes landed on their default
 * 53% of the time; unanchored, 35%.
 *
 * Telling the model to be bolder was tried first and went the wrong way: an
 * added instruction took commitment DOWN from 47% to 36%, the same effect a
 * framing sentence had on the recognition pass. The fix is structural, not
 * verbal.
 *
 * `labelCase` and `titleAlign` keep their anchors. Unanchoring everything cost
 * 4.5 points of benchmark accuracy and every single loss was one of those two:
 * all-caps labels and centred titles are interface habits rather than neutral
 * defaults, which is why they were anchored in the first place.
 *
 * What it drops is the CONVENTION MARK, and for a long time it also dropped
 * `pick_when`, which was never the intention and was invisible because the
 * hints stayed in the source looking like they were doing something. Thirty-two
 * of them were written, maintained and never sent. `pageTexture` was the tell:
 * it answered `none` for almost everything, because the model was choosing
 * between "a ruled grid, like engineering paper" and "a flat, untextured
 * field" with nothing to say when either applied. Sending the hints took that
 * question from 9/12 to 12/12 and its `none` answers from 7 to 4, which is the
 * number of briefs in that set that should be flat.
 *
 * This is the third time in this engine that an option existed and could not
 * be reached. Being in the source is not the same as being in the request.
 */
const expressive = (
  question: string | Record<string, string>,
  options: Record<string, { is: string; convention?: true; pick_when?: string }>
) =>
  choice(
    question as string,
    Object.fromEntries(
      Object.entries(options).map(([k, v]) => [k, v.pick_when ? { is: v.is, pick_when: v.pick_when } : { is: v.is }])
    ) as unknown as ChoiceCriteria
  )

/** A rubric where each level carries the kinds of thing that look like it. */
const signalScore = (question: string, levels: [summary: string, signals: string][]) =>
  score(question, levels.map(([summary, signals]) => ({ summary, signals })) as never)

/* ── Asked only of a brief that is not describing an interface ───────────── */

/**
 * What the page is made OF, when the page is not a page.
 *
 * Every canvas in the catalog is a neutral or a paper: the largest tint in it
 * is parchment's 0.055. That is the right vocabulary for a brief about
 * software, and it has no word at all for a brief about a world. Asked what
 * `Minecraft` is made of, the engine answered `paper` — pure white — and put a
 * vivid green accent on it, because white was the only honest answer available
 * to it. The option was missing, not the nerve.
 *
 * These two questions are merged into stage one only when stage zero says the
 * brief has departed from business software. That gating is structural rather
 * than verbal on purpose: experiment 14 measured that ASKING for boldness moves
 * commitment the WRONG way (47% → 36%), and there is no temperature on this
 * model to turn up instead — `SystemOneRequest` takes a state, questions and a
 * model name. A style that should be conventional therefore never meets this
 * machinery at all, which is a stronger guarantee than a well-behaved answer.
 */
export const boldQuestions = {
  pageGround: choice(
    {
      question: "What colour is the thing this brief describes actually made of — its ground, its body, the surface it presents?",
      answer_with: "the colour of the material itself, not the colour of anything sitting on top of it",
    },
    described(Object.keys(hues) as HueKey[], (k) => hues[k].desc)
  ),
  /**
   * The amount, asked without the word `page` in it.
   *
   * The first version asked "how much of that colour is in the page itself",
   * and `Minecraft` answered 1.5 of 3 — a mint wash on white. The ladder was
   * not the problem. Measured over eight briefs (experiment 17), the same four
   * rungs answered 1.26 of 3 when the question said `page`, 2.06 when it said
   * `the thing`, and 2.28 in this form. One word was costing forty per cent of
   * the ladder, because a page is an interface and the model was dutifully
   * answering how coloured a dashboard ought to be.
   *
   * The wall is doing real work and is not decoration. It asks about the
   * material's own strength and says nothing about how much of a screen it
   * covers — which is the engine's decision, not the model's, and is what the
   * ladder below already encodes.
   */
  pageColour: signalScore(
    "If you had to fill an entire wall with the single colour that this thing is made of, how strong would that colour be?",
    [
      ["Not coloured at all. The wall would be white, grey or black.", "anything whose subject is flat, printed, drawn or monochrome"],
      ["Barely tinted. A near-neutral with a cast to it.", "paper stock, concrete, unpainted materials"],
      ["Clearly coloured. Nobody would describe that wall as white, grey or black.", "packaging, painted objects, printed colour, anything with a strong ground"],
      ["The wall IS that colour, at full strength.", "games, toys, landscapes, materials, posters, worlds"],
    ]
  ),
}

/**
 * The accent, asked a second time, against a page that now has a colour.
 *
 * `pageGround` and `hue` both live in stage one, where every question is
 * answered in isolation and in parallel. Asked separately what colour the
 * subject is, they agree — which is correct twice over and useless: Minecraft
 * came back a green accent on a green page, Mario crimson on crimson. Neither
 * question could know the other had taken the colour.
 *
 * Stage two is the only place they can be told apart, because it is the only
 * place where one of the two answers already exists.
 *
 * Asking it as a colour was not enough, and identity was the wrong test of
 * whether it worked. Phrased as "a colour that belongs to the same subject",
 * it stopped answering the page's exact hue and started answering its
 * neighbour — emerald on grass, 14° away, which is one colour as far as anyone
 * looking at it is concerned. Asking for the subject's SECOND MATERIAL moves
 * the mean separation from 62° to 81° and the answers that land within 40° from
 * three of eight to one, and that one is a page with no hue to be near.
 * Minecraft goes from emerald at 14° to amber at 80°: grass and dirt.
 */
export const boldStageTwo = {
  accentOnPage: choice(
    {
      question: "The page is already made of that material. What is the SECOND material this subject is made of — the one the buttons, the links and the selected rows would be cut from?",
      answer_with: "a different material belonging to the same subject, not a shade of the first one",
    },
    described(Object.keys(hues) as HueKey[], (k) => hues[k].desc)
  ),
}

/* ── Stage 1: everything the brief alone decides ─────────────────────────── */

export const stageOne = {
  canvas: choice(
    {
      question: "What is the page itself made of?",
      answer_with: "the material of the background, not the accent colour",
    },
    described(Object.keys(canvases) as CanvasKey[], (k) => ({
      is: canvases[k].desc,
      lightness:
        canvases[k].bg >= 0.9 ? "very light"
        : canvases[k].bg >= 0.5 ? "light"
        : canvases[k].bg >= 0.25 ? "dark"
        : "very dark",
    }))
  ),
  hue: choice(
    "What colour family does the accent come from?",
    described(Object.keys(hues) as HueKey[], (k) => hues[k].desc)
  ),
  /**
   * Whether the style has a colour at all, asked instead of inferred.
   *
   * This was read off the hue question's confidence: below 0.25 the engine
   * decided there was no colour. Uncertainty about WHICH colour is not evidence
   * that colour is absent, though — a vividly multicoloured brief spreads its
   * probability precisely because it is colourful. Measured over eight briefs
   * with explicit controls (experiment 21), the confidence rule scored 6/8 and
   * this question scored 8/8.
   *
   * The 6/8 understates the danger. `Memphis Group, Milan 1981` and `a tropical
   * fruit market` both answer their hue at 0.32 confidence, which is one bad
   * roll from the 0.25 threshold: the two most colourful briefs in the set were
   * the closest to being declared monochrome.
   */
  accentIsChromatic: noul(
    "Should the interactive accent contain a chromatic colour, rather than being white, grey or black?",
    {
      true: "The requested accent has a visible colour.",
      false: "The requested accent is achromatic: white, grey or black.",
    }
  ),
  chroma: signalScore("How saturated is that accent?", [
    ["Completely grey. The style uses no colour.", "print, legal, brutalism, anything austere"],
    ["A trace of colour, visible only beside a true neutral.", "restrained institutional work"],
    ["Muted and restrained.", "editorial, craft, anything warm but quiet"],
    ["Clearly coloured, the ordinary amount.", "most software"],
    ["Strong and confident.", "brands that lead with colour"],
    ["Maximum saturation. The colour is the point.", "alarms, neon, phosphor, psychedelia, anything that shouts"],
  ]),
  /* The face question is a flat catalog in disguise: nineteen faces in one list
     splits probability across near-neighbours the same way 250 finished
     palettes did. It is factored the same way — the kind of face first, the
     face within that kind once the kind is known.

     Measured honestly, this does NOT buy accuracy: 223/224 either way. What it
     buys is 7% fewer tokens, because the second question only ever carries four
     or five options instead of nineteen, and a second question that is confident
     about a small set rather than diffuse over a large one. The reason to keep
     it is cost and legibility, not a score. */
  /* `same` exists because the first version could not express the commonest
     arrangement of all. Asked to pick a heading face independently, the model
     would land on `display` and put a condensed poster face on a style whose
     headings are simply the body face at a larger size — a tight software UI
     came back with Bebas titles, which no such product has ever had. */
  displayCategory: expressive("What kind of typeface carries the headings and titles?", {
    same: { is: "The same face as the running text, just larger. Headings are not a separate voice.", convention: true },
    sans: { is: "A sans-serif, different from the body.", pick_when: "the headings want a neutral modern voice the body does not have" },
    serif: { is: "A serif, different from the body.", pick_when: "the headings want print, tradition, authority or luxury" },
    mono: { is: "A fixed-width face.", pick_when: "the headings should read as machine output" },
    /* This said "loud, condensed or deliberately strange", which quietly
       excluded the one thing a display face is most often for. A ship's log
       written by hand asked for nothing and got a book face, because the
       description gave handwriting nowhere to go. */
    display: { is: "A display face for headings only: loud, condensed, hand-written, engraved, pixelated, or deliberately strange.", pick_when: "the style is a poster, a masthead, an engraved title page, a certificate, an arcade cabinet, or anything drawn, lettered or rendered rather than typeset" },
  }),
  /* `display` is deliberately absent here: every face in that category is
     unreadable in running text, so offering it would produce an empty second
     question rather than a bad answer. A pixel face that IS readable is filed
     under sans for exactly this reason, and reachable from both questions. */
  bodyCategory: choice("What kind of typeface carries the running text, labels and controls?", {
    sans: "A sans-serif. Neutral, modern, the default voice of software.",
    serif: "A serif. Print, reading, tradition, authority.",
    mono: "A fixed-width face. Code, data, terminals, typewriters.",
  }),
  monoFace: choice(
    "Which fixed-width face carries numbers, codes and identifiers?",
    described(monoFaces, (k) => faces[k].desc)
  ),
  easing: choice(
    "What shape does a transition have in this style?",
    described(Object.keys(easingCurves) as EasingKey[], (k) => easingCurves[k].desc)
  ),
  density: choice("How tightly packed is the interface?", {
    compact: { what: "Information-dense, little air.", looks_like: "trading terminals, monitoring, professional tools used all day" },
    cozy: { what: "The ordinary middle.", looks_like: "most business software" },
    comfortable: { what: "Generous, few things per screen.", looks_like: "reading, luxury, consumer onboarding" },
  }),
  borders: choice("How does this style separate one thing from another?", {
    full: { what: "Every box is drawn with a visible outline.", looks_like: "forms in boxes, ruled tables, framed panels", not_for: "styles that separate with space or shadow" },
    quiet: { what: "Hairlines and dividers only, nothing is boxed.", looks_like: "a rule under a heading, a line between rows", not_for: "styles with no lines at all" },
    none: { what: "Nothing is outlined. Separation comes from space alone.", looks_like: "floating cards on a plain field, generous margins", not_for: "dense styles where space is scarce" },
    brackets: { what: "Only the corners are drawn: four short angles, with nothing along the sides.", looks_like: "a head-up display, a targeting reticle, a cockpit readout", not_for: "anything that is not a machine reading out a value" },
    ticks: { what: "Short marks repeating along the edges, like the graduations on a rule.", looks_like: "an instrument scale, a targeting overlay, a measuring device", not_for: "anything that is not measuring something" },
  }),

  /* The four headline figures carried the same thin progress bar and the same
     badge in every style the engine produced. Both are style decisions, and
     both turn out to be expressible entirely in CSS over the components that
     are already there — a segmented meter is a progress bar behind a repeating
     mask, and a plain delta is a badge with its fill and border taken away. */
  /* A dashboard is mostly empty page, and ours was the same flat field in every
     style. The texture is drawn from the engine's own edge colour, so it is
     never a decoration sitting on top of the system — it is the system, at low
     opacity, repeated. */
  /* The table is the largest surface in the console and was identical in every
     style the engine produced: a rule under every row, a faint fill on hover,
     nothing else. How rows are told apart is one of the oldest decisions in
     setting tabular matter. */
  /* A corner was only ever rounded, by an amount. A head-up display chamfers
     its corners and a ticket notches them, and neither is a rounder or squarer
     version of the other. `corner-shape` composes with `border-radius`, so the
     radius keeps meaning how much and this says of what kind. */
  cornerStyle: expressive("What shape is a corner?", {
    round: { is: "An arc, the ordinary rounded corner." },
    bevel: { is: "Cut off at an angle, like a chamfered plate. Head-up displays, machined panels, technical equipment." },
    notch: { is: "Cut inward into the shape, like a punched ticket or a warning label." },
    squircle: { is: "A superellipse: rounder than an arc in the middle and flatter at the sides, the way a modern device is drawn." },
    diagonal: { is: "Two opposite corners cut off hard and the other two left square, so the panel reads as a slanted plate rather than a box." },
  }),

  tableStyle: expressive("How are the rows of a table told apart?", {
    ruled: { is: "A hairline under each row." },
    striped: { is: "Alternating rows tinted, with no rules between them." },
    bare: { is: "Nothing between rows at all; the alignment does the work." },
    boxed: { is: "Every cell ruled on all sides, like a printed ledger or a spreadsheet." },
  }),

  /* A separator was always one hairline. It is one of the oldest decisions in
     printing and it carries a period almost by itself: a double rule reads as
     a title page, a lozenge between two rules as a chapter break, a groove as
     something moulded out of plastic in 1995. */
  ruleStyle: expressive("How is a dividing rule drawn?", {
    hairline: { is: "A single thin line." },
    double: { is: "Two parallel lines with a gap between them, as on a title page." },
    dotted: { is: "A dotted line, as on a form or a technical drawing." },
    groove: { is: "A line cut into the surface: one dark edge and one light, as though moulded." },
    fade: { is: "A line that fades out towards both ends rather than stopping." },
    ornament: { is: "A small printer's lozenge centred between two rules, as in a printed book." },
    none: { is: "No line at all. The space does the separating." },
  }),

  /* A panel's fill was a colour and nothing else. What separates a contemporary
     interface from a merely dark one is usually not the colour — it is the
     one-pixel highlight along the top edge, or a fill that is very slightly
     lighter at the top than the bottom. */
  surfaceFinish: expressive("Beyond its colour, how is a panel's surface finished?", {
    flat: { is: "An even fill, edge to edge.", convention: true },
    highlight: { is: "A hairline of light along the top edge, as though lit from above.", pick_when: "the style is a contemporary dark interface, or imitates a moulded physical object" },
    gradient: { is: "The fill very slightly lighter at the top than at the bottom.", pick_when: "the style is soft, atmospheric or editorial, and does not want a flat plane" },
    glass: { is: "Translucent and blurred, showing what is behind it.", pick_when: "the style is layered and modern, and treats panels as frosted sheets" },
    emissive: { is: "The outline itself gives off light, inside and out, as though the panel were lit rather than printed.", pick_when: "the style is a screen that emits: a head-up display, neon, a phosphor readout" },
  }),

  /* Numerals are a typographic decision the engine had no way to make. An
     eighteenth-century page sets its figures old-style, dipping below the
     baseline like lowercase letters; a control room sets them tabular so
     columns align. The default is neither: proportional lining, which is what
     a font gives you when nobody chooses. */
  figures: expressive("How are the numbers set?", {
    tabular: { is: "All the same width and sitting on the line, so columns align.", convention: true },
    lining: { is: "Full height and proportionally spaced, like ordinary modern type.", pick_when: "the style is contemporary and the figures are not being compared in columns" },
    oldstyle: { is: "Varying heights, some dipping below the line, like lowercase letters.", pick_when: "the style is a printed book, an engraving, or anything before the twentieth century" },
  }),

  /* Vignetting, chromatic fringing and noise are not three decisions. They are
     one physical thing — a signal arriving badly — and they arrive together or
     not at all, so they are asked as an intensity. */
  /* The silhouette. Every style this engine has produced has had the same one:
     a sidebar of one width, four figures in a row, one wide panel beside one
     narrow one. Colour, shape and type all changed and the shape of the page
     never did — which is why thirty styles could look different and still feel
     like the same product wearing outfits. */
  navWidth: conventional("How wide is the navigation down the side?", {
    regular: { is: "Wide enough for a label beside an icon.", convention: true },
    narrow: { is: "Barely wider than the labels themselves, giving the content the room.", pick_when: "the style is dense, technical, or treats navigation as a list rather than a panel" },
    wide: { is: "Generous, closer to a column of its own.", pick_when: "the style is spacious or editorial, and treats navigation as part of the composition" },
  }),
  figureLayout: conventional("How do the headline figures sit together?", {
    row: { is: "All of them across in one row.", convention: true },
    grid: { is: "Two by two, in a block.", pick_when: "the style is spacious and would rather have a square of figures than a strip" },
    lead: { is: "The first one large and the rest smaller around it, so one number leads.", pick_when: "the style has a single headline figure that matters more than the others" },
  }),
  panelSplit: conventional("How is the width shared between two panels side by side?", {
    majorMinor: { is: "One wide panel and one narrow one beside it.", convention: true },
    equal: { is: "Both the same width.", pick_when: "the style is symmetrical, editorial or ceremonial" },
    minorMajor: { is: "The narrow one first and the wide one after.", pick_when: "the style reads detail first and the overview second" },
    stacked: { is: "One above the other, each the full width.", pick_when: "the style is a single column by nature: reading, print, or a narrow instrument" },
  }),
  measure: conventional("How far does the content stretch?", {
    full: { is: "The whole width available, however wide the window.", convention: true },
    wide: { is: "Stopped at a comfortable maximum, with the rest left as margin.", pick_when: "the style is spacious and does not want a line running the width of a monitor" },
    reading: { is: "Held to the width of a page of text.", pick_when: "the style is editorial or printed, and treats the screen as a page" },
  }),

  /* The engine could set how fast a thing moves when you touch it, and nothing
     at all about what moves on its own. That is the whole difference between a
     screen and a printed page: a terminal blinks, an alarm pulses, a radar
     sweeps, and none of it is waiting for you.

     None of these animate geometry — they are opacity, light and a background
     position — so the rule this system set itself still holds. */
  /* Anchored, unlike the other visual axes. Most interfaces have no ambient
     motion and should not: a page that pulses while you read it is a fault,
     not a style. Left unanchored this answered `sweep` for an ordinary SaaS
     dashboard, which would put a radar pass over every card in a product
     nobody asked to look like an instrument. Movement that nobody started has
     to be asked for. */
  ambient: conventional("What moves on its own, with nobody touching it?", {
    none: { is: "Nothing. The screen is still until someone acts on it.", convention: true },
    blink: { is: "Anything raising an alarm blinks, the way a warning lamp does.", pick_when: "the style is an alarm panel, a terminal or a piece of equipment that signals by flashing" },
    breathe: { is: "The lit parts pulse slowly, as though the display were powered and idling.", pick_when: "the style is a screen that emits and is meant to read as switched on rather than printed" },
    sweep: { is: "A line travels across each panel at intervals, the way a radar passes over what it is reading.", pick_when: "the style IS an instrument that scans — a radar, a sonar, a scanner. Not merely a dark or technical interface" },
  }),

  signal: signalScore("How cleanly does this reach the screen?", [
    ["Perfectly. There is no transmission; the image simply is.", "everything printed, and every interface that is not pretending to be a screen"],
    ["A little fall-off at the edges, the way a tube darkens at its corners.", "a monitor being photographed, a period computer"],
    ["Visibly: the glyphs fringe with colour and the edges darken.", "a situation room, a surveillance feed, a broadcast being relayed"],
    ["Badly. Colour fringing, noise and heavy fall-off, on the edge of losing it.", "a compromised camera, a failing link, a signal about to drop"],
  ]),

  pageTexture: expressive("What is the empty background made of?", {
    none: { is: "A flat, untextured field.", convention: true },
    grid: { is: "A ruled grid, like engineering paper or a blueprint.", pick_when: "the style is drafted, technical, architectural or brutalist" },
    dots: { is: "A regular field of small dots.", pick_when: "the style is a modern developer tool or a systematic design" },
    scanlines: { is: "Fine horizontal lines, like a picture tube.", pick_when: "the style is a CRT, a terminal, a television or anything that emits" },
    grain: { is: "A faint irregular tooth, like uncoated paper.", pick_when: "the style is printed, editorial, analogue or aged" },
  }),

  figureMark: expressive("What sits under a headline figure to show where it stands?", {
    bar: { is: "A continuous progress bar.", convention: true },
    segments: { is: "A row of discrete blocks, like a level meter on a machine.", pick_when: "the style is industrial, technical, retro-computing or deliberately blunt" },
    rule: { is: "A hairline at the foot of the figure, marked only as far as the value reaches.", pick_when: "the style is editorial, printed or spare, and treats a bar as decoration" },
    none: { is: "Nothing. The number stands alone.", pick_when: "the style is austere enough that a figure needs no apparatus around it" },
  }),
  deltaStyle: expressive("How does a change against the previous period read?", {
    badge: { is: "A small filled chip beside the figure.", convention: true },
    text: { is: "Plain text, no container at all.", pick_when: "the style is editorial, printed or quiet, and would not put a pill next to a number" },
    arrow: { is: "A bare directional mark beside the number, with no chip around either.", pick_when: "the style reads like an instrument panel, where a pill would look like a decoration" },
  }),

  /* Charts were taking the style's colours and nothing else: the same smooth
     curve with the same faint wash, in a teletext screen and in an Admiralty
     chart alike. Two questions, and everything else about the chart is derived
     from answers already given — the grid from `borders`, the line weight from
     the border weight, the markers from the path. */
  chartPath: expressive("How does a chart's line travel from one reading to the next?", {
    smooth: { is: "A flowing curve through the points.", convention: true },
    straight: { is: "Straight segments from point to point, with visible corners.", pick_when: "the style is technical, printed or drafted: charts, blueprints, ledgers, anything drawn with instruments" },
    stepped: { is: "Flat runs with square jumps between them, like a staircase.", pick_when: "the style is a terminal, a readout, a logging screen, or anything that treats a value as discrete" },
  }),
  chartFill: expressive("How is the area under that line treated?", {
    tint: { is: "A faint wash of the line's colour.", convention: true },
    gradient: { is: "The colour fading downward into nothing.", pick_when: "the style is a contemporary dashboard or product interface, where a plot fades rather than stopping" },
    solid: { is: "A flat block of the colour at full strength.", pick_when: "the style is graphic and printed: posters, brutalism, anything that fills rather than shades" },
    hatched: { is: "Diagonal ruling, like an engraving or a printed chart.", pick_when: "the style is a map, a technical drawing, an old print or a document" },
    none: { is: "Nothing at all. The line alone carries it.", pick_when: "the style is spare, editorial or reading-first, and treats ink as expensive" },
  }),

  /* The icon family is a choice and not a ladder: between a stroke and a
     bitmap there is nothing in between. How heavy the drawing is comes from
     the line weight and is not asked here. */
  iconFamily: expressive("How are the icons drawn?", {
    stroke: { is: "Thin geometric outlines on a 24-unit grid, the ordinary interface icon.", convention: true },
    rounded: { is: "Outlines with rounder joins and a warmer hand.", pick_when: "the style is friendly, consumer or soft" },
    solid: { is: "Filled silhouettes rather than outlines. Heavier and blunter.", pick_when: "the style is bold, graphic, printed or aimed at children" },
    pixel: { is: "Bitmap glyphs drawn on a coarse pixel grid, with visible steps." },
    none: { is: "No icons beside labels at all. Words carry everything, and the only icons left are the ones that stand alone with no label to read." },
  }),

  /* Conventions. The brief usually says nothing about any of these, and a
     question the brief does not address is answered by a coin flip unless the
     default is named. */
  labelCase: conventional("How are field labels and table headers set?", {
    none: { is: "Sentence case, as written.", convention: true },
    upper: { is: "All caps, usually with wide letter-spacing.", pick_when: "the brief describes a technical panel, a terminal, brutalism, fashion, luxury, or anything that treats a label as an ornament rather than as prose" },
    smallCaps: { is: "Small capitals: capital forms at roughly lowercase height.", pick_when: "the brief describes a printed book, an engraving, a certificate, or anything typeset before the twentieth century" },
  }),
  titleAlign: conventional("Where does a panel title sit?", {
    start: { is: "Flush with the leading edge.", convention: true },
    center: { is: "Centred over the panel, as a masthead.", pick_when: "the brief describes something ceremonial, editorial or symmetrical: a masthead, a certificate, a boutique" },
  }),
  iconSide: conventional("Where does an icon sit inside a button or menu item?", {
    leading: { is: "Before the label.", convention: true },
    trailing: { is: "After the label, pushed to the far edge.", pick_when: "the brief asks for trailing icons, a mirrored layout, or a right-to-left reading order" },
  }),
  navSide: conventional("Which edge does the main navigation live on?", {
    left: { is: "The leading edge.", convention: true },
    right: { is: "The trailing edge.", pick_when: "the brief asks for navigation on the right, a mirrored layout, or a right-to-left reading order" },
  }),
  indicatorSide: conventional("Where does the tick on a selected menu item go?", {
    start: { is: "Before the label.", convention: true },
    end: { is: "After the label, at the far edge.", pick_when: "the brief asks for trailing indicators or a mirrored layout" },
  }),
  labelPlacement: conventional("Where does a field label sit relative to its input?", {
    top: { is: "Above the input, stacked.", convention: true },
    start: { is: "Beside the input, in a second column.", pick_when: "the brief describes a form that reads like a document, a ledger, a spec sheet or a settings list" },
  }),
  actionsAlign: conventional("How is a row of buttons at the foot of a panel arranged?", {
    end: { is: "Packed against the trailing edge.", convention: true },
    start: { is: "Packed against the leading edge.", pick_when: "the brief asks for it, or describes a style that refuses conventional interface polish" },
    stretch: { is: "Filling the full width, sharing it equally.", pick_when: "the brief describes something touch-first or deliberately blunt" },
    between: { is: "Pushed to both ends.", pick_when: "the brief describes a layout that uses the full measure, editorial or spacious" },
  }),

  /* Ladders. Every level carries signals, because an adjective alone gives the
     model nothing to match a brief against and every brief lands in the middle. */
  roundness: signalScore("How rounded are the corners?", [
    ["Perfectly square. No corner is rounded at all.", "drafting, engineering, print, terminals, brutalism, anything on a grid"],
    ["Barely softened, a corner you have to look for.", "technical tools that do not want to look harsh"],
    ["Modestly rounded, visible but restrained.", "the ordinary modern interface"],
    ["Clearly rounded, soft and friendly.", "consumer apps, anything aimed at non-experts"],
    ["Very rounded, approaching pill shapes.", "toys, children, games, anything deliberately soft"],
  ]),
  borderWeight: signalScore("How heavy is a drawn line?", [
    ["A hairline, present but barely noticed.", "minimal, editorial, anything that separates with space"],
    ["Slightly thickened, still quiet.", "ordinary interfaces"],
    ["A deliberate graphic stroke.", "technical drawings, ledgers, forms"],
    ["A heavy slab, a design element in its own right.", "brutalism, posters, industrial signage"],
  ]),
  airiness: signalScore("How much empty space sits between things?", [
    ["Almost none. Elements nearly touch.", "terminals, trading screens, dense monitoring"],
    ["Tight, but nothing collides.", "professional tools"],
    ["The ordinary amount.", "most software"],
    ["Generous. Space is used as a device.", "editorial, luxury, marketing"],
    ["Lavish. Space dominates the composition.", "galleries, fashion, anything that treats the page as a canvas"],
  ]),
  controlSize: signalScore("How large are the interactive controls?", [
    ["Small and tight, minimum viable.", "terminals, dense monitoring, expert tools"],
    ["Ordinary.", "most software"],
    ["Substantial, easy to hit.", "touch, consumer, accessibility-minded work"],
    ["Large and emphatic.", "children, kiosks, anything blunt or oversized"],
  ]),
  textSize: signalScore("How large is the running text?", [
    ["Small, dense, technical.", "terminals, tables, monitoring"],
    ["Ordinary interface size.", "most software"],
    ["Slightly enlarged, easier reading.", "consumer apps, anything read at arm's length"],
    ["Large, closer to a printed page than a control panel.", "editorial, reading, luxury, fashion"],
  ]),
  bodyTracking: signalScore("How much letter-spacing does the running text carry?", [
    ["None. Text is set solid, the way prose is.", "reading, editorial, almost everything"],
    ["Barely opened.", "technical interfaces at small sizes"],
    ["Clearly opened.", "head-up displays, readouts, anything spaced for legibility at a glance"],
    ["Widely spaced.", "ceremonial printing, titling, anything set as a monument"],
  ]),
  labelTracking: signalScore("How much letter-spacing do labels carry?", [
    ["None. Letters sit normally.", "reading, editorial, anything that mimics print prose"],
    ["A touch of extra space.", "ordinary interfaces with small labels"],
    ["Clearly tracked out.", "technical panels, uppercase labels, engineering"],
    ["Widely spaced, the label reads as a graphic band.", "brutalism, fashion, luxury, anything where the label is an ornament"],
  ]),
  titleTracking: signalScore("How is a heading letter-spaced?", [
    ["Tightly packed, letters almost touching.", "modern, compressed, contemporary branding"],
    ["Slightly tightened.", "the contemporary default"],
    ["Set normally.", "print, reading, classical typography"],
    ["Slightly opened up.", "technical and institutional work"],
    ["Widely spaced, monumental and formal.", "certificates, memorials, luxury, ceremony"],
  ]),
  titleWeight: signalScore("How heavy is a heading?", [
    ["Very light, almost hairline.", "head-up displays, galleries, fashion, anything that barely speaks"],
    ["Light.", "spacious editorial and luxury work"],
    ["Regular weight, no emphasis at all.", "literary work, anything that whispers"],
    ["Medium.", "restrained modern interfaces"],
    ["Semibold, the usual heading weight.", "most software"],
    ["Bold and loud.", "posters, sport, brutalism, alarms, anything that shouts"],
  ]),
  labelWeight: signalScore("How heavy is a label or a button?", [
    ["Very light, almost hairline.", "head-up displays, galleries, anything where the label is barely there"],
    ["Light.", "spacious, quiet interfaces"],
    ["Regular.", "print, editorial, anything where the label recedes"],
    ["Medium.", "the ordinary interface"],
    ["Semibold.", "tools where controls must read as controls"],
    ["Bold.", "brutalism, industrial panels, anything with heavy rules"],
  ]),
  speed: signalScore("How fast does this interface move?", [
    ["State changes are instant. Nothing eases from one state to the next.", "terminals, brutalism, trading, print, anything that refuses decoration"],
    ["Very quick, barely perceptible.", "professional tools used all day"],
    ["A normal, noticeable transition.", "most consumer software"],
    ["Slow and deliberate. The motion is part of the style.", "luxury, ceremony, calm, anything unhurried"],
  ]),
}

/* ── Stage 2: only answerable once stage 1 is known ──────────────────────── */

/** Body text has to be readable, so the display faces never enter this pool. */
const bodyPool = (cat: FaceCategory): FaceKey[] =>
  (facesByCategory[cat] ?? []).filter(canCarryBody)

export const facePair = (display: FaceCategory | "same", body: FaceCategory) => ({
  bodyFace: choice(
    `Within ${body} faces, which one carries the running text and controls?`,
    described(bodyPool(body), (k) => faces[k].desc)
  ),
  // When the headings share the body's face there is nothing to ask, so the
  // question is not sent at all rather than sent and ignored.
  ...(display === "same"
    ? {}
    : {
        displayFace: choice(
          `Within ${display} faces, which one carries the headings and titles?`,
          described(facesByCategory[display], (k) => faces[k].desc)
        ),
      }),
})

export const stageTwo = {
  /* `surface` sits here, not in stage one: whether a panel needs its own fill
     depends on what the page is made of and whether anything is outlined.
     Asked against the brief alone it answered "flat" for 83% of twelve
     unrelated styles at 0.68 confidence, which is a question not reading the
     brief. */
  surface: expressive(
    "Given that canvas and those borders, how should a panel sit against the page?",
    {
      flat: { is: "It shares the page background, distinguished only by spacing.", convention: true },
      raised: { is: "It has its own fill and sits above the page.", pick_when: "the style wants panels to read as separate objects stacked on the page" },
      outline: { is: "It is transparent, defined only by its outline.", pick_when: "the style draws everything and fills nothing" },
    }
  ),

  /* Depth was one choice over ten recipes, and `none`, `hairline` and
     `whisper` are three names for "no real shadow". Probability split across
     the synonyms and it answered "none" for 75% of briefs at 0.60 confidence —
     the flat-catalog failure again, at small scale. Factored into how much and
     what kind, each question has a real decision to make and the recipe is
     looked up in code. */
  /* "How far off the page" was the wrong axis on its own: a phosphor terminal
     answered rung 0 — terminals are flat — which then cancelled the glow it had
     correctly asked for. Emission is not elevation, so the rung has to ask
     about the strength of the effect, whatever kind it is. */
  depth: signalScore("How strongly does a panel set itself apart from the page, by shadow or by light?", [
    ["Not at all. The panel is drawn on the page, with no depth and no glow.", "print, brutalism, drafting, ledgers, anything drawn rather than stacked or lit"],
    ["Barely. A hint that something is on top, or the faintest halo.", "restrained modern interfaces"],
    ["Clearly set apart.", "consumer software, cards that read as objects, screens that visibly emit"],
    ["Strongly. It is one of the first things you notice.", "playful and tactile work, or a display whose glow is the whole point"],
  ]),
  /* This question started with a fifth option, `ring`: "no shadow at all, a
     containing hairline instead". It won 24 runs out of 24, because it was a
     second way of saying "no depth" and most styles want no depth. Rewording it
     was not enough. The real fault was conceptual: a containing outline is a
     border, and whether a panel is bounded by a line is already asked by
     `borders` and `surface`. One concept per question — the amount of depth is
     `depth`, the kind is here, and neither may mean "none". */
  depthKind: expressive(
    {
      question: "Supposing this style does set panels apart, what kind of effect does it use?",
      note: "answer for the character of the effect only; how strong it is has already been asked",
    },
    {
      blurred: { is: "A soft drop shadow, the ordinary kind.", convention: true },
      hardOffset: { is: "A solid unblurred block offset in the line colour.", pick_when: "brutalism, posters, print, anything graphic — needs square or nearly square corners and a heavy line" },
      glow: { is: "The accent bleeds outward as emitted light.", pick_when: "phosphor, neon, alarms, screens that emit their own light — needs a dark canvas" },
      inset: { is: "Panels are pressed into the page rather than raised off it.", pick_when: "machined panels, physical controls, anything recessed or chiselled" },
    }
  ),
  /* The top rung promises "nearly the ink colour" and the assembly did not
     reference ink at all: on paper it produced L 0.430 against an ink of 0.145,
     and on a black page L 0.480 against an ink of 0.940. Both are reasonable
     line colours and neither is the thing the rung said. The ladder is now a
     fraction of the distance from the page to the ink, so the endpoint means
     what it says on every canvas. */
  edgeContrast: signalScore(
    "Given that canvas and that line weight, how far should a line stand off the background?",
    [
      ["Barely visible, a suggestion of a boundary.", "minimal, airy, anything that hints at structure"],
      ["Legible but quiet.", "most interfaces"],
      ["Clearly separated from the surface.", "forms, tables, technical layouts"],
      ["Maximum contrast, nearly the ink colour.", "brutalism, engineering drawings, high-contrast work"],
    ]
  ),
  /**
   * Asked about a fill, not about a layout it cannot see.
   *
   * It opened with "Given how panels sit against the page", and `surface` — the
   * question that decides exactly that — is a key of this same request. Every
   * question here is answered in isolation and in parallel, so that clause
   * named an answer the model did not have. This is the failure the two stages
   * exist to prevent, and it was sitting inside the stage that was added to
   * prevent it.
   *
   * Rung zero also overclaimed: this axis controls how much ACCENT goes into a
   * panel fill, and adding none of it does not make the panel neutral. The page
   * can be parchment or grass, and the panel follows the page.
   */
  surfaceTint: signalScore(
    "For a panel that has a fill of its own, how much of the accent colour is mixed into that fill?",
    [
      ["None. The fill takes no accent at all; it is whatever the page is made of.", "print, legal, brutalism, terminals, anything austere"],
      ["A trace, visible only beside an untinted surface.", "most software, where the tint reads as warmth rather than colour"],
      ["A noticeable warmth or coolness across every panel.", "editorial, craft, anything with a house colour"],
      ["Strongly tinted. The accent colours the whole surface.", "themed interfaces, games, children, anything immersive"],
    ]
  ),
  /**
   * Asked as contrast, because contrast is what it controls.
   *
   * It used to ask "how light or dark should the accent itself be", with rungs
   * from "deep and dark" to "bright and luminous". The assembly reads it as
   * distance from the page, which is the right quantity: an accent that lifts
   * off a black page has to go lighter and one that lifts off white has to go
   * darker, and that direction is arithmetic rather than taste.
   *
   * The two did not agree. Replaying the four exact rungs through assembly on
   * paper gave accent lightnesses of 0.484, 0.461, 0.438 and 0.412 — so the
   * answer meaning "bright and luminous" produced the DARKEST accent of the
   * four, while on a black page the same rungs ran the right way. The model
   * could answer the written question perfectly and get the opposite result
   * half the time. Asking the quantity that is actually used removes the
   * contradiction without giving up the direction-dependence.
   */
  accentDepth: signalScore("How far should the accent stand away from the page in lightness?", [
    /* The endpoints describe the range this axis actually has, not an absolute
       one. The accent never approaches the page's lightness (it has to stay
       readable) and never reaches the ink's, so rungs promising "close to the
       page" and "the brightest thing on it" were overclaiming in both
       directions even after the direction was fixed. */
    ["The least contrast an accent can have and still read. It recedes.", "print, editorial, anything understated"],
    ["A moderate step away. Solid and grounded, not loud.", "institutional, corporate"],
    ["A clear step away. It lifts off the page.", "modern software, dark interfaces"],
    ["The strongest contrast in that range. It is the loudest thing that is not text.", "phosphor, neon, alarms, anything emitting light"],
  ]),
}

export const critiqueQuestions = {
  coherent: noul(
    "Do these token values describe one deliberate style, or unrelated decisions stapled together?",
    { true: "Every value points at the same intent.", false: "At least one value fights the others." }
  ),
  matchesBrief: noul("Does the resulting style match the brief it was asked for?"),
}

/* ── Stage 3: arithmetic, couplings and guards ───────────────────────────── */

export type Answers = {
  canvas: CanvasKey; hue: HueKey; displayFace: FaceKey; bodyFace: FaceKey
  displayCategory: FaceCategory | "same"; bodyCategory: FaceCategory
  monoFace: FaceKey; easing: EasingKey; depthKind: DepthKind
  density: "compact" | "cozy" | "comfortable"
  borders: "full" | "quiet" | "none" | "brackets" | "ticks"
  surface: "raised" | "flat" | "outline"
  labelCase: "none" | "upper" | "smallCaps"; titleAlign: "start" | "center"
  iconFamily: "stroke" | "rounded" | "solid" | "pixel" | "none"
  cornerStyle: "round" | "bevel" | "notch" | "squircle" | "diagonal"
  tableStyle: "ruled" | "striped" | "bare" | "boxed"
  ruleStyle: "hairline" | "double" | "dotted" | "groove" | "fade" | "ornament" | "none"
  surfaceFinish: "flat" | "highlight" | "gradient" | "glass" | "emissive"
  figures: "tabular" | "lining" | "oldstyle"
  navWidth: "narrow" | "regular" | "wide"
  figureLayout: "row" | "grid" | "lead"
  panelSplit: "majorMinor" | "equal" | "minorMajor" | "stacked"
  measure: "full" | "wide" | "reading"
  ambient: "none" | "blink" | "breathe" | "sweep"
  pageTexture: "none" | "grid" | "dots" | "scanlines" | "grain"
  figureMark: "bar" | "segments" | "rule" | "none"
  deltaStyle: "badge" | "text" | "arrow"
  chartPath: "smooth" | "straight" | "stepped"
  chartFill: "tint" | "gradient" | "solid" | "hatched" | "none"
  iconSide: "leading" | "trailing"
  actionsAlign: "start" | "end" | "stretch" | "between"
  labelPlacement: "top" | "start"; navSide: "left" | "right"
  indicatorSide: "start" | "end"
  /** The distribution's circular mean, when one was computed. */
  hueAngle?: number
  /* Present only when stage zero opened the gate. Absent means the page is
     whatever the canvas says it is, which is what every style did before. */
  pageGround?: HueKey
  pageColour?: number
  accentOnPage?: HueKey
} & Record<
  "signal" | "depth" | "chroma" | "roundness" | "borderWeight" | "airiness" | "controlSize" | "textSize" |
  "labelTracking" | "bodyTracking" | "titleTracking" | "titleWeight" | "labelWeight" | "speed" |
  "edgeContrast" | "surfaceTint" | "accentDepth" | "accentIsChromatic",
  number
>


/**
 * How much of the distribution to believe.
 *
 * A `choice` returns a probability for every label and we were taking the
 * argmax and discarding the rest. The rest is not always information, though,
 * and the first version of this got that backwards: an amber phosphor terminal
 * answers amber at 0.99, and the runners-up behind a winner that confident are
 * noise. Plotting them gave a CRT terminal a sky-blue and an indigo data
 * series.
 *
 * So confidence decides how specific an answer to commit to, which is the
 * docs' own recipe for a distribution, applied three ways:
 *
 *   high      the style has ONE hue. The series are spaced off it by rotation,
 *             which is at least deliberate and evenly spread.
 *   middle    the model is genuinely between hues. That IS the palette, so the
 *             top few become the series in the order it ranked them.
 *
 * It no longer decides whether the style HAS a colour. That was the bottom band
 * of this same number, and it was reading uncertainty about which colour as
 * evidence that there is none — which is backwards for exactly the briefs that
 * are most colourful. `accentIsChromatic` asks it directly now. This function
 * shapes the palette and says nothing about presence, so `committed` here means
 * only "there is a distribution worth reading".
 */
const HUE_IS_ONE = 0.6

/**
 * A continuous hue out of a 23-option question — measured, and NOT wired in.
 *
 * The idea was to stop snapping to the winner: if a brief answers 55% amber and
 * 30% gold it sits between them, and the probability-weighted circular mean
 * would give the angle the model actually described, for free, from a question
 * already asked.
 *
 * It moves the hue by 0–2°, which is invisible, and `experiments/13` says why.
 * When the model is unsure about hue, the mass does not go to NEIGHBOURS — it
 * goes to families far apart: orange 0.46 / green 0.35, cyan 0.63 / blue 0.34,
 * crimson 0.48 / teal 0.37. Its uncertainty is categorical, not continuous. It
 * is not saying "between orange and gold", it is saying "either an orange thing
 * or a green thing", and the average of those is a colour nobody described.
 *
 * So the winner still names the hue, and the spread becomes separate data
 * series rather than a blended one. Kept here because the measurement is the
 * reason the simpler thing is right.
 */
const NEIGHBOUR = 45

export function meanHue(probabilities: Record<string, number>, winner: HueKey): number {
  const centre = hues[winner].angle
  let x = 0
  let y = 0
  for (const [k, p] of Object.entries(probabilities) as [HueKey, number][]) {
    if (!(k in hues) || k === "neutral") continue
    const a = hues[k].angle
    const away = Math.abs(((a - centre + 540) % 360) - 180)
    if (away > NEIGHBOUR) continue
    x += p * Math.cos((a * Math.PI) / 180)
    y += p * Math.sin((a * Math.PI) / 180)
  }
  if (x === 0 && y === 0) return centre
  return Math.round((((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360)
}

export function seriesFrom(
  probabilities: Record<string, number>,
  confidence: number
): { angles: number[]; committed: boolean } {
  if (confidence >= HUE_IS_ONE) return { angles: [], committed: true }

  const ranked = (Object.entries(probabilities) as [HueKey, number][])
    .filter(([k]) => k in hues && k !== "neutral")
    .sort((a, b) => b[1] - a[1])

  const angles: number[] = []
  for (const [k] of ranked) {
    const a = hues[k].angle
    // Two hues 6° apart are the same colour under two names, and five chart
    // series that are all amber is one series drawn five times. 25° is roughly
    // two rungs of the catalog: far enough to read as a different colour.
    if (angles.every((b) => Math.abs(((a - b + 540) % 360) - 180) >= 25)) angles.push(a)
    if (angles.length === 5) break
  }
  return { angles, committed: true }
}

/** How much × what kind → a named recipe from the catalog. */

/**
 * oklch, clamped into sRGB.
 *
 * The chroma ladder's top rungs are not reachable at most hues and
 * lightnesses — 0.25 chroma at L 0.43 is outside sRGB for an orange — and a
 * browser asked to paint an out-of-gamut colour does not come back with a
 * duller version of it. It came back with a dark red, and a tropical fruit
 * market was drawn in blood. The model was right about the hue; the arithmetic
 * handed it a colour that does not exist.
 *
 * So chroma is reduced until the colour is actually printable. Lightness and
 * hue, which carry the meaning, are never touched.
 */
function inGamut(l: number, c: number, h: number): boolean {
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const rgb = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ]
  return rgb.every((v) => v >= -0.001 && v <= 1.001)
}

export function clampChroma(l: number, c: number, h: number): number {
  if (inGamut(l, c, h)) return c
  let lo = 0
  let hi = c
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2
    if (inGamut(l, mid, h)) lo = mid
    else hi = mid
  }
  return lo
}

/**
 * Saturation and depth are one decision, and the engine was treating them as
 * two.
 *
 * `accentDepth` sets a lightness from the canvas, `chroma` sets a saturation
 * from a ladder, and then the gamut clamp discovers they are incompatible and
 * gives up the chroma. So a brief that asked for maximum saturation came back
 * muted — a tropical fruit market at 0.25 chroma and L 0.43 was clamped to
 * 0.11, because at that lightness an orange that vivid does not exist.
 *
 * The colour the model asked for usually DOES exist, a little lighter or
 * darker. So lightness moves to find it, inside a window narrow enough that the
 * accent keeps the contrast against the canvas that `accentDepth` was choosing.
 * Hue is never touched: that is the part carrying the meaning.
 */
function reachable(l: number, c: number, h: number, window = 0.16): number {
  if (clampChroma(l, c, h) >= c - 0.001) return l
  let best = l
  let bestC = clampChroma(l, c, h)
  for (let step = 0.02; step <= window; step += 0.02) {
    for (const candidate of [l + step, l - step]) {
      if (candidate < 0.2 || candidate > 0.95) continue
      const got = clampChroma(candidate, c, h)
      if (got > bestC + 0.005) {
        bestC = got
        best = candidate
      }
    }
    if (bestC >= c - 0.001) break
  }
  return best
}

const okl = (l: number, c: number, h: number) =>
  `oklch(${l.toFixed(3)} ${clampChroma(l, c, h).toFixed(3)} ${h})`

/** Like `okl`, but allowed to move lightness to keep the saturation asked for. */
const oklVivid = (l: number, c: number, h: number) => {
  const found = reachable(l, c, h)
  return `oklch(${found.toFixed(3)} ${clampChroma(found, c, h).toFixed(3)} ${h})`
}

/**
 * Danger, warning and success, in the style's own voice.
 *
 * These were the last colours outside the engine: `--destructive` is a fixed
 * red in the base stylesheet and one dot was a hard-coded emerald, so across
 * twenty generated styles the alert badge and the online dot were byte for byte
 * the same. A console that repaints everything and leaves its warnings in
 * somebody else's red is not centrally controlled.
 *
 * The hue is fixed, because red means danger and that is not a style decision.
 * Everything else follows the style: its saturation, its lightness against its
 * own canvas, its gamut. The chroma has a floor — a greyscale brutalist style
 * would otherwise render a grey alert, and a warning that does not look like
 * one has stopped being a warning.
 */
const SEMANTIC_FLOOR = 0.11

export function semantic(
  hue: number,
  chroma: number,
  canvasL: number,
  dark: boolean
): string {
  const c = Math.max(chroma, SEMANTIC_FLOOR)
  // A plain offset from the canvas was not enough: on a near-black page it put
  // the danger colour at L 0.51, which is a dark red on black — legible, and
  // not a warning. A signal has to carry on any canvas, so the offset has a
  // floor and a ceiling rather than being a straight subtraction.
  const l = dark
    ? Math.max(0.62, Math.min(0.82, canvasL + 0.5))
    : Math.min(0.58, Math.max(0.42, canvasL - 0.45))
  return oklVivid(l, c, hue)
}

/** Below this a colour is arithmetic rather than something anyone can see. */
const PERCEPTIBLE_CHROMA = 0.02

/** Fixed by meaning, not by taste. */
export const SEMANTIC_HUES = { danger: 25, warning: 70, success: 150 } as const

/**
 * What the page actually turns out to be, from the answers that decide it.
 *
 * Extracted because two callers need it and they were disagreeing. `assemble`
 * computed it, and `generateDesign` separately told stage two the page was
 * `coloured: <the hue's associations>` for every gated brief — regardless of
 * whether any colour was added, without the amount, and substituting the hue's
 * evocative description for the material the canvas question actually chose.
 * So stage two could be told a neutral page was coloured, and a barely tinted
 * page and a saturated one received identical descriptions.
 */
export function resolvePage(a: Answers) {
  const canvas = canvases[a.canvas]
  /* `pageColour` is absent for any brief stage zero judged to be about an
     interface; absent means rung 0, and rung 0 must leave the canvas alone. */
  /* The ground's own hue may cap the amount, exactly as the accent's does: a
     page answered `neutral` is grey, and angle zero with chroma on it is red.
     Applied before the activation test, so a grey ground simply never
     activates rather than activating and then being flattened. */
  const limits = a.pageGround !== undefined ? HUE_LIMITS[a.pageGround] : undefined
  const asked = a.pageColour !== undefined ? lerp(ladders.pageChroma, a.pageColour) : 0
  const pageC = limits?.chroma !== undefined ? Math.min(asked, limits.chroma) : asked

  /* ONE activation test, and below it the catalog page is preserved exactly.
   *
   * Two things forced this. A ground the model declined was still taking its
   * hue, so parchment's aged brown became aged blue at the same strength. And
   * the outer gate is now permissive — it opens on a marble sculpture and a
   * black-and-white woodcut, which answer a chroma of about 0.007, more than
   * paper's tint of zero and invisible to anyone.
   *
   * The half-measure was worse than either: classification used the floor while
   * the lightness and chroma sums still used the raw amount, so a page could
   * shift while being described as unchanged. Below the threshold nothing is
   * touched now, and `pageDescription` can be trusted because there is only one
   * branch for it to describe. */
  /* Against an absolute threshold, not against the canvas's own tint. Tying it
     to the tint meant a blue ground weaker than parchment's brown was silently
     rejected, and changing what a page is MADE of does not require making it
     more saturated than it already was. */
  const coloured = a.pageGround !== undefined && pageC > PERCEPTIBLE_CHROMA
  if (!coloured) {
    return { canvas, coloured: false, hue: canvas.hue, lightness: canvas.bg, chroma: canvas.tint }
  }
  const h = hues[a.pageGround as HueKey].angle
  /* Paper is L 1.0 because nothing is on it, and at L 1.0 no colour exists at
     all: white is the absence of a material rather than a pale one. So the
     strength of the page's colour pulls its lightness off paper and toward
     where that material actually lives.

     Chroma alone cannot do this. Green is at its most saturated up near L 0.9,
     so a page asked to be made of grass came back the brightest green the gamut
     allows — a highlighter, not a ground — and, being nearly white already,
     left no room above itself for a panel to sit.

     It may not cross the middle, though. Whether the page is light or dark is
     the canvas question's answer and this one is not entitled to overturn it:
     the deep sea is a dark blue, and a chroma search left to itself would
     happily brighten it to a mid teal to find the saturation. */
  const strength = Math.min(1, pageC / ladders.pageChroma[ladders.pageChroma.length - 1])
  const groundL =
    canvas.bg < 0.5
      ? canvas.bg + (0.3 - canvas.bg) * strength * 0.6
      : canvas.bg - (canvas.bg - 0.7) * strength
  const moved = reachable(groundL, pageC, h, 0.5)
  let l = canvas.bg < 0.5 ? Math.min(moved, 0.45) : Math.max(moved, 0.55)
  /* A material limit belongs to the material, not to the role it is playing.
     Brown's lightness cap was applied to accents only, so a brown GROUND on a
     light canvas still came out as tan. */
  if (limits?.lightness !== undefined) l = Math.min(l, limits.lightness)
  /* The chroma that SHIPS, resolved once, here, after the lightness is final.
     `pageDescription` was quoting the requested amount: green on void asks 0.190
     and the gamut yields 0.132, and the description said 0.19. The description
     and the colour now read the same number because there is only one. */
  return { canvas, coloured, hue: h, lightness: l, chroma: clampChroma(l, pageC, h) }
}

/** How stage two is told what the page became. Honest about the amount. */
export function pageDescription(a: Answers): string {
  const p = resolvePage(a)
  if (!p.coloured) return `${a.canvas} — ${p.canvas.desc}`
  const strong = p.chroma >= ladders.pageChroma[2]
  return (
    `${a.canvas}, but the page is made of ${a.pageGround}: ` +
    `${strong ? "strongly coloured" : "lightly coloured"}, ` +
    `${p.lightness < 0.5 ? "dark" : "light"} (lightness ${p.lightness.toFixed(2)}, chroma ${p.chroma.toFixed(2)})`
  )
}

export function assemble(a: Answers, series?: { angles: number[]; committed: boolean }): DesignConfig {
  const page = resolvePage(a)
  const canvas = page.canvas
  const pageIsColoured = page.coloured
  const pageH = page.hue

  /* A second material is only worth having when there is a first one. The
     accent was re-asked against "the page is already that colour", so if the
     page did not take a colour, that question was answered against a premise
     that never came true and its answer is not the better one. */
  const accentKey = pageIsColoured ? (a.accentOnPage ?? a.hue) : a.hue
  const hue = hues[accentKey].angle
  /* What a grey is allowed to be. The hue and the saturation are separate
     questions and neither can see the other, so an option that promises "pure
     grey" can be handed maximum chroma and become a vivid red. */
  const hueCeiling = HUE_CEILING[accentKey]

  const pageL = page.lightness
  const pageChroma = page.chroma
  const dark = pageL < 0.5
  /* Whether the style has a colour is READ HERE, from the question that asks
     it, rather than carried in through the optional palette argument.
     
     It travelled as `series.committed`, which meant the ablation harness — which
     calls `assemble(answers)` with no palette — paid for the question and then
     ignored its answer. A decision this consequential must not depend on
     whether a caller passed an optional second parameter. */
  const achromatic =
    a.accentIsChromatic !== undefined
      ? Number(a.accentIsChromatic) < 0.5
      : series !== undefined && !series.committed
  let chroma = achromatic ? 0 : lerp(chromaLadder, a.chroma)

  /* One answer, two ladders, and they have to agree about what square means.
     The control radius has a deadzone that snaps a hair of a radius to zero;
     the surface radius did not share it, so a style that asked for perfectly
     square corners got square controls sitting inside rounded panels. */
  const roundness = lerp(ladders.roundness.control, a.roundness)
  const squared = rem(roundness) === "0rem"

  /* Couplings. Each of these is a place where two answers could contradict
     each other, resolved here rather than hoped for in the prompt. */

  // `mode` is not asked. It is whether the canvas is dark, and asking it
  // separately is how you get light-mode flags on a midnight page.
  const mode = dark ? "dark" : "light"

  // `motion` is not asked either: it is the bottom rung of the speed ladder
  // wearing a different name. Asked separately, the first run of this
  // generator returned `motion: off` alongside a 55ms duration.
  const duration = lerp(ladders.duration, a.speed)
  const motion = duration === 0 ? "off" : "on"

  /* Two answers, one recipe. The rung is how much, the kind is what sort, and
     the table is the only place that knows which named recipe that combination
     means — so a style can ask for "a lot of hard offset" without anyone having
     to enumerate that pairing as its own option.

     It is resolved here, above the emission guard, because whether a glow was
     actually assembled is the thing that guard has to know. */
  const rung = Math.round(Math.max(0, Math.min(3, a.depth)))
  let kind = a.depthKind
  // A hard offset is a square-corner device. On a 1rem radius it reads as a
  // rendering bug, so the shape wins and the depth follows it.
  if (kind === "hardOffset" && roundness > 0.4) kind = "blurred"
  // A glow is emitted light. On a white page it is a smudge.
  if (kind === "glow" && !dark) kind = "blurred"
  const shadowKey = DEPTH_RECIPES[kind][rung]
  const shadow = shadowRecipes[shadowKey]
  /* The rubric asks how strongly a panel sets itself apart and its four rungs
     were collapsing to two for a glow and to two for an inset, so "the faintest
     halo" and "the glow is the whole point" assembled to the same tokens. The
     recipes now vary with the rung, so an answer the model took trouble over
     survives into the output. */
  const glowing = kind === "glow" && rung > 0

  /* A screen that emits its own light is saturated at the source.
   *
   * "A situation room: degraded feeds" came back at 1.7 of 5 chroma and painted
   * a pale sage, because "degraded" reads as washed out — and for reflected
   * colour it is. For emitted colour it is not: a failing CRT is still vividly
   * green, and what degrades is the clarity, not the phosphor. The same brief
   * with "glowing green phosphor" spelled out answered 5.0.
   *
   * So a style that is lit from within gets a floor. The model still says how
   * saturated; the engine knows a light source cannot be pale. */
  /* Two things narrow it, both found by replaying fixed answers through here.
   *
   * `depthKind` is asked hypothetically — "supposing this style DOES set panels
   * apart, what kind of effect" — so its answer is not evidence the effect
   * exists. A style that answered `glow` and then answered zero strength was
   * assembling no glow at all and still being handed a saturation floor.
   *
   * And a screen that emits is not therefore a screen that emits COLOUR. A
   * white-phosphor tube and a black-and-white surveillance feed both have
   * scanlines and both degrade, and neither is coloured. So a hue that promised
   * grey is never overridden into colour by this. */
  const emits =
    dark &&
    (a.surfaceFinish === "emissive" || glowing || Number(a.signal) >= 2 || a.pageTexture === "scanlines")
  /* A floor may not overturn an explicit "this accent is not coloured". The
     hue ceiling caught the two briefs measured, but only because both happened
     to answer `neutral`; a brief answering green and "no chromatic accent"
     would have had its grey raised to a saturated green by a screen effect. */
  if (emits && hueCeiling === undefined && !achromatic) chroma = Math.max(chroma, 0.16)

  /* A hue that says it is grey may not be saturated. The saturation question
     cannot see which hue won, so the ceiling is applied here and applied last,
     after every floor, or a floor simply reintroduces the colour. */
  if (hueCeiling !== undefined) chroma = Math.min(chroma, hueCeiling)


  // Accent lightness is contrast bookkeeping, not taste: the same accent that
  // reads on paper disappears on midnight. The model says how much it should
  // lift off the page; which direction that is, is arithmetic.
  const depth = lerp(ladders.accentDepth, a.accentDepth)
  /* Against the page as it ACTUALLY is, not as the catalog described it.
     Every line below is contrast bookkeeping, and once the page colour is
     allowed to move the lightness, `canvas.bg` is a stale number: a border
     computed from paper's 1.0 came out LIGHTER than a page sitting at 0.72 and
     read as a neon outline drawn around every panel. */
  const accentL = dark
    ? Math.min(0.92, pageL + 0.28 + depth * 0.4)
    : Math.max(0.3, pageL - 0.62 + (1 - depth) * 0.18)
  /* A hue that is more than an angle gets its ceiling here, after the contrast
     arithmetic has chosen a lightness and before the colour is built. */
  const limits = HUE_LIMITS[accentKey]
  const accent = oklVivid(
    limits?.lightness !== undefined ? Math.min(accentL, limits.lightness) : accentL,
    chroma,
    hue
  )
  // The foreground has to follow where the accent actually landed, not where
  // it was aimed, or a lightened accent gets white text on a pale fill.
  const accentLightness = Number(/oklch\(([\d.]+)/.exec(accent)?.[1] ?? accentL)
  const accentForeground = accentLightness > 0.65 ? okl(0.16, 0, 0) : okl(0.99, 0, 0)

  // The line colour tracks the canvas, not the brief.
  const edgeContrast = lerp(ladders.edgeContrast, a.edgeContrast)
  /* A fraction of the way from the page to the ink, so "nearly the ink colour"
     lands near the ink on a white page and on a black one alike. */
  const edgeL = pageL + (canvas.ink - pageL) * edgeContrast
  /* A line on a coloured page belongs to the page, not to the accent. On a
     neutral page there is no page hue to speak of and it falls back to the
     accent's, which is what it always did. */
  const edge = pageChroma > 0.02
    ? okl(Math.max(0.04, Math.min(0.98, edgeL)), pageChroma * 0.3, pageH)
    : okl(Math.max(0.04, Math.min(0.98, edgeL)), chroma * 0.08, hue)

  // The canvas picks up a whisper of the accent hue, so a green style has a
  // green-cast page rather than a green accent floating on neutral grey.
  // The paper's own hue, not the accent's, and never zeroed: parchment is
  // brown whatever ink you set on it.
  const canvasColor = okl(pageL, pageChroma, pageH)
  /* The ink picks up the page's cast so text belongs to its ground, but only
     a trace of it. A page may be as green as it likes; text that green is a
     legibility problem wearing a style's clothes. */
  const ink = okl(canvas.ink, Math.min(pageChroma * 0.5, 0.055), pageH)

  return {
    scalars: {
      radiusControl: rem(roundness),
      radiusSurface: squared ? "0rem" : rem(lerp(ladders.roundness.surface, a.roundness)),
      borderWidth: `${Number(lerp(ladders.borderWeight, a.borderWeight).toFixed(2))}px`,
      shadowSurface: shadow.surface,
      shadowOverlay: shadow.overlay,
      space: "0.25rem",
      gapSection: rem(lerp(ladders.airiness.gapSection, a.airiness)),
      gapStack: rem(lerp(ladders.airiness.gapStack, a.airiness)),
      gapInline: rem(lerp(ladders.airiness.gapInline, a.airiness)),
      padSurface: rem(lerp(ladders.airiness.padSurface, a.airiness)),
      controlHeight: rem(lerp(ladders.controlSize.height, a.controlSize)),
      controlPadX: rem(lerp(ladders.controlSize.padX, a.controlSize)),
      gapField: rem(lerp(ladders.airiness.gapField, a.airiness)),
      fontSans: faces[a.bodyFace].stack,
      fontMono: faces[a.monoFace].stack,
      fontDisplay: faces[a.displayCategory === "same" ? a.bodyFace : a.displayFace].stack,
      fontSizeBase: rem(lerp(ladders.textSize.base, a.textSize)),
      fontScale: String(Number(lerp(ladders.textSize.scale, a.textSize).toFixed(3))),
      trackingTitle: `${Number(lerp(ladders.titleTracking, a.titleTracking).toFixed(3))}em`,
      trackingLabel: `${Number(lerp(ladders.tracking, a.labelTracking).toFixed(3))}em`,
      trackingBody: `${Number(lerp(ladders.bodyTracking, a.bodyTracking).toFixed(3))}em`,
      // Weights snap to the hundred: a ladder interpolates smoothly but the
      // font only ships the steps it ships, and 450 renders as 400 anyway.
      weightTitle: snap100(lerp(ladders.weight, a.titleWeight)),
      weightLabel: snap100(lerp(ladders.weight, a.labelWeight)),
      weightControl: snap100(lerp(ladders.weight, a.labelWeight)),
      accent,
      accentForeground,
      canvas: canvasColor,
      ink,
      edge,
      seriesHues: (series?.angles ?? []).join(" "),
      surfaceTint: String(Number(lerp(ladders.surfaceTint, a.surfaceTint).toFixed(2))),
      duration: `${Math.round(duration)}ms`,
      // A curve on a zero-length transition is noise, so the curve follows
      // the clock rather than the brief.
      easing: duration === 0 ? "linear" : easingCurves[a.easing].value,
    },
    flags: {
      iconSide: a.iconSide,
      actionsAlign: a.actionsAlign,
      labelPlacement: a.labelPlacement,
      navSide: a.navSide,
      indicatorSide: a.indicatorSide,
      density: a.density,
      borders: a.borders,
      surface: a.surface,
      labelCase: a.labelCase,
      titleAlign: a.titleAlign,
      motion,
      mode,
      cornerStyle: a.cornerStyle,
      tableStyle: a.tableStyle,
      ruleStyle: a.ruleStyle,
      surfaceFinish: a.surfaceFinish,
      figures: a.figures,
      // Ambient motion is motion. A style that has turned movement off does not
      // get to keep a blinking alarm, and the flag would otherwise contradict
      // itself the way `motion` and `duration` once did.
      navWidth: a.navWidth,
      figureLayout: a.figureLayout,
      panelSplit: a.panelSplit,
      measure: a.measure,
      /* Ambient motion is NOT cancelled by instant transitions. Those are two
         different questions and the model answered both; inferring a global
         prohibition from a local one threw away the second answer. A style
         that wants stillness says so by answering `none` here. */
      ambient: a.ambient,
      signal: String(Math.round(Math.max(0, Math.min(3, a.signal)))) as DesignFlags["signal"],
      pageTexture: a.pageTexture,
      figureMark: a.figureMark,
      deltaStyle: a.deltaStyle,
      chartPath: a.chartPath,
      chartFill: a.chartFill,
      iconFamily: a.iconFamily,
    },
  }
}

/* ── The pipeline ────────────────────────────────────────────────────────── */

type Flat = Record<string, string | number>
const flatten = (answers: Record<string, { type: string; choice?: string; score?: number; noul?: number }>): Flat =>
  Object.fromEntries(
    Object.entries(answers).map(([k, v]) => [
      k,
      v.type === "choice" ? v.choice! : v.type === "score" ? v.score! : v.noul!,
    ])
  )

export type GenerateResult = {
  config: DesignConfig
  /** The hue distribution, kept so the palette can use more than the winner. */
  hueSeries?: number[]
  answers: Flat
  usage: { inputTokens: number; ms: number; calls: number; usd: number }
  critique?: { coherent: number; matchesBrief: number }
  /** Present whenever the recognition pass ran, trusted or not. */
  recognition?: Recognition
  /** Every question's confidence, for diagnostics. Output is free. */
  confidence?: number[]
}

export async function generateDesign(
  brief: string,
  opts: {
    client?: JevClient
    critique?: boolean
    /** Skip stage zero entirely. Also makes a coloured ground unreachable. */
    recognise?: boolean
    /**
     * Run stage zero but withhold the product facts from stage one.
     *
     * These used to be one flag, and `recognise: false` silently did both —
     * so two experiments measuring "the pipeline without recognition" were
     * also measuring a pipeline that could not reach a coloured ground, and
     * did not say so. Enrichment and eligibility are different things and are
     * now independently controllable.
     */
    enrich?: boolean
  } = {}
): Promise<GenerateResult> {
  const client = opts.client ?? jevClient()
  const t0 = Date.now()
  let inputTokens = 0
  let calls = 0

  // Stage 0. Blocking on purpose: stage one has to see its result, and a
  // parallel sampler cannot condition one answer on another — the same reason
  // there are two stages and not one.
  let recognised: Recognition | undefined
  if (opts.recognise !== false) {
    const r = await recognise(client, brief)
    recognised = r.result
    inputTokens += r.inputTokens
    calls++
  }

  // The brief and nothing else. A framing sentence ("configure a design engine
  // so a dashboard takes on the style below") and a description of the
  // dashboard's contents were both measured against the brief alone: the
  // framing made no difference, and the description cost tokens and a point of
  // confidence. The questions already carry the context; the state only has to
  // carry the material being judged.
  const ctx = recognised && opts.enrich !== false ? recognitionContext(recognised) : null
  const state: Record<string, unknown> = { style_brief: brief }
  if (ctx) state.the_product_named = ctx

  /* The gate is a question set, not an instruction. When stage zero says the
     brief describes business software, the questions that let a page carry
     colour are not in this request at all, so a conventional style cannot be
     moved by them however they are worded. */
  const bold = recognised?.bold ?? false
  const one = await client.systemOne({
    state: state as never,
    questions: (bold ? { ...stageOne, ...boldQuestions } : stageOne) as never,
  })
  inputTokens += one.usage.input_tokens
  calls++
  const a = flatten(one.answers as never) as Flat
  const pageIsColoured = resolvePage(a as unknown as Answers).coloured

  const two = await client.systemOne({
    state: {
      ...state,
      already_decided: {
        /* The resolved page, including whether any colour actually landed on
           it and how much. Stage two conditions on this, so a description it
           invents rather than reads is a lie the later answers build on. */
        canvas: pageDescription(a as unknown as Answers),
        /* Withheld when the accent is about to be re-asked below: naming stage
           one's hue as decided, while `accentOnPage` replaces it in the same
           request, tells every other question here about a colour that will
           not ship. */
        ...(pageIsColoured ? {} : { accent_hue: a.hue }),
        corner_roundness_0_to_4: Number((a.roundness as number).toFixed(2)),
        line_weight_0_to_3: Number((a.borderWeight as number).toFixed(2)),
        borders: a.borders,
      },
    } as never,
    questions: {
      ...stageTwo,
      /* Asked only when the page ACTUALLY took a colour, which stage one has
         already answered. It used to be asked whenever the outer gate opened,
         so a gated-but-uncoloured brief was answering "what is the SECOND
         material" against a first material that never arrived — and then the
         commitment test read that answer's confidence while assembly used the
         original hue. One condition now decides whether the question exists,
         which accent ships, and whose confidence counts. */
      ...(pageIsColoured ? boldStageTwo : {}),
      ...facePair(a.displayCategory as FaceCategory | "same", a.bodyCategory as FaceCategory),
    } as never,
  })
  inputTokens += two.usage.input_tokens
  calls++
  const answers = { ...a, ...flatten(two.answers as never) } as Flat

  // The winner becomes the accent; the shape of the whole distribution becomes
  // the data series. Both come out of the one question already asked.
  const hueAnswer = (one.answers as Record<string, unknown>).hue as {
    confidence: number
    probabilities: Record<string, number>
  }
  /* Whether the style HAS a colour is decided by the accent that actually
     ships, not by the one stage one proposed.
     
     On a gated brief the accent is re-asked in stage two against the resolved
     page, and that later answer is the one assembly uses — but the commitment
     test still read stage one's confidence. So a confident second answer could
     be desaturated because the first was uncertain, and an uncertain one could
     be given full chroma because the first was sure. The distribution stays
     stage one's, because that question asked what colours the SUBJECT has and
     that is what a chart series wants; only the commitment follows the accent. */
  /* Commitment comes from the question that asks it, so it no longer depends on
     which accent shipped or how sure that answer was. `seriesFrom` still shapes
     the palette from the distribution, because that question asked what colours
     the SUBJECT has and that is what a chart wants. */
  const series = seriesFrom(hueAnswer.probabilities, hueAnswer.confidence)
  const config = assemble(answers as unknown as Answers, series)
  const result: GenerateResult = {
    config,
    hueSeries: config.scalars.seriesHues.split(" ").filter(Boolean).map(Number),
    answers,
    recognition: recognised,
    /* Output is free, so the confidences ride along. The benchmark could not
       report them for the real pipeline and printed a zero in that column. */
    confidence: [
      ...Object.values(one.answers as Record<string, { confidence?: number }>),
      ...Object.values(two.answers as Record<string, { confidence?: number }>),
    ]
      .map((v) => v.confidence)
      .filter((c): c is number => typeof c === "number"),
    /* Filled in below, once every request this call is going to make has been
       made. The critique used to be issued AFTER these were computed, so its
       tokens landed in `inputTokens` and its cost and its 300ms did not: the
       readout in the panel under-reported both whenever the critique ran. */
    usage: { inputTokens: 0, ms: 0, calls: 0, usd: 0 },
  }

  let critique: { coherent: number; matchesBrief: number } | undefined
  if (opts.critique) {
    const c = await client.systemOne({
      state: { style_brief: brief, tokens: config } as never,
      questions: critiqueQuestions as never,
    })
    calls++
    inputTokens += c.usage.input_tokens
    const judged = c.answers as Record<string, { noul: number }>
    critique = {
      coherent: Number(judged.coherent.noul.toFixed(3)),
      matchesBrief: Number(judged.matchesBrief.noul.toFixed(3)),
    }
  }
  if (critique) result.critique = critique
  result.usage = { inputTokens, ms: Date.now() - t0, calls, usd: (inputTokens / 1e6) * 0.042 }
  return result
}
