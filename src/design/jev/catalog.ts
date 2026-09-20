/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  THE CATALOG — everything the generator is allowed to reach for
 * ─────────────────────────────────────────────────────────────────────────────
 *  Jev does not invent values. It picks. So the ceiling on what a generated
 *  style can look like is set here, by a person, in advance.
 *
 *  The catalog is FACTORED, not enumerated. A flat list of 250 finished
 *  palettes measured worse than three questions of 24, 7 and 9 options: the
 *  flat list splits probability across near-synonyms and lands at 0.13
 *  confidence, and it put an amber CRT terminal on a sand-coloured page.
 *  Factored, each axis answers confidently and the outcomes multiply.
 *
 *  Anything with more than 255 options will be rejected by the API outright.
 *  Nothing here comes close, and that is the point.
 */

/* ── Typefaces ───────────────────────────────────────────────────────────────
 * Keys match `src/app/fonts.ts`. The descriptions are what the model reads, so
 * they describe voice and register, not classification. "A geometric sans"
 * tells it nothing a brief can match against; "the house face of a transit
 * system" does.
 */
export type FaceKey = keyof typeof faces

export const faces = {
  geist: {
    category: "sans",
    stack: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
    desc: "A neutral modern interface sans. The default voice of a well-made tool: invisible, current, opinion-free.",
  },
  inter: {
    category: "sans",
    stack: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
    desc: "The standard screen sans of the last decade. Dense, functional, unmistakably software.",
  },
  dmSans: {
    category: "sans",
    stack: "var(--font-dm-sans), ui-sans-serif, sans-serif",
    desc: "A soft geometric sans with round bowls. Friendly, consumer, approachable, slightly playful.",
  },
  workSans: {
    category: "sans",
    stack: "var(--font-work-sans), ui-sans-serif, sans-serif",
    desc: "A sturdy humanist sans built for long interfaces. Warm, plain-spoken, civic.",
  },
  spaceGrotesk: {
    category: "sans",
    stack: "var(--font-space-grotesk), ui-sans-serif, sans-serif",
    desc: "A quirky technical grotesque with odd details. Reads as engineering, aerospace, developer tooling.",
  },
  archivo: {
    category: "sans",
    stack: "var(--font-archivo), ui-sans-serif, sans-serif",
    desc: "A grotesque with strong flat terminals. Signage, wayfinding, institutional confidence.",
  },
  outfit: {
    category: "sans",
    stack: "var(--font-outfit), ui-sans-serif, sans-serif",
    desc: "A clean geometric sans with even circles. Startup, product, modern and uninflected.",
  },
  syne: {
    category: "display",
    stack: "var(--font-syne), ui-sans-serif, sans-serif",
    desc: "An art-directed display sans with strange widths. Galleries, fashion, deliberately unusual.",
  },
  playfair: {
    category: "serif",
    stack: "var(--font-playfair), ui-serif, Georgia, serif",
    desc: "A high-contrast didone serif. Fashion masthead, luxury, editorial authority, thin hairlines.",
  },
  fraunces: {
    category: "serif",
    stack: "var(--font-fraunces), ui-serif, Georgia, serif",
    desc: "An expressive wonky serif with soft old-style warmth. Craft, bakery, independent publishing.",
  },
  ebGaramond: {
    category: "serif",
    stack: "var(--font-eb-garamond), ui-serif, Georgia, serif",
    desc: "A classical old-style serif with true small capitals and figures that dip below the line. Printed books, engravings, anything typeset before the twentieth century.",
  },
  imFell: {
    category: "serif",
    stack: "var(--font-im-fell), ui-serif, Georgia, serif",
    desc: "A digitised seventeenth-century printing type, with the irregular inking and worn edges of metal on damp paper. Early printing, almanacs, broadsides, anything predating industrial typesetting.",
  },
  pinyon: {
    category: "display",
    stack: "var(--font-pinyon), cursive",
    desc: "An engraver's copperplate script, written with a pointed pen. Certificates, banknotes, invitations, eighteenth-century title pages. Never for running text.",
  },
  lora: {
    category: "serif",
    stack: "var(--font-lora), ui-serif, Georgia, serif",
    desc: "A calm contemporary reading serif. Long-form articles, essays, comfortable on screen.",
  },
  baskerville: {
    category: "serif",
    stack: "var(--font-baskerville), ui-serif, Georgia, serif",
    desc: "A classical bookish transitional serif. Printed page, scholarship, quiet formality.",
  },
  instrumentSerif: {
    category: "serif",
    stack: "var(--font-instrument-serif), ui-serif, Georgia, serif",
    desc: "An elegant light display serif. Restrained luxury, boutique, understated expense.",
  },
  bebas: {
    category: "display",
    stack: "var(--font-bebas), ui-sans-serif, sans-serif",
    desc: "A tall condensed all-caps display face. Posters, sports, loud declarative headlines. Never for body text.",
  },
  /* The display category had one generalist and three specialists — a
     copperplate script, an arcade face and an art-directed fashion sans — so
     every brief that wanted a heading voice and was not a certificate, a
     coin-op cabinet or a gallery received the condensed poster face BY
     ELIMINATION. Measured over ten such briefs it won all ten with the other
     three at 0.00–0.32, and it was winning a kindergarten classroom wall at
     0.89. That is not a choice, it is the absence of one. */
  fredoka: {
    category: "display",
    stack: "var(--font-fredoka), ui-sans-serif, sans-serif",
    desc: "A rounded display sans with soft, full letterforms. Toys, children, sweets, games, anything warm and unserious.",
  },
  abril: {
    category: "display",
    stack: "var(--font-abril), ui-serif, Georgia, serif",
    desc: "A fat didone display serif with heavy strokes and hairline serifs. Record sleeves, 1970s magazines, editorial mastheads, anything with weight and glamour.",
  },
  geistMono: {
    category: "mono",
    stack: "var(--font-geist-mono), ui-monospace, monospace",
    desc: "A clean modern monospace. Code, data, the fixed grid of a developer tool.",
  },
  jetbrainsMono: {
    category: "mono",
    stack: "var(--font-jetbrains-mono), ui-monospace, monospace",
    desc: "A monospace designed for reading code for hours. Technical, precise, ergonomic.",
  },
  plexMono: {
    category: "mono",
    stack: "var(--font-plex-mono), ui-monospace, monospace",
    desc: "A corporate monospace with engineering heritage. Mainframes, infrastructure, serious systems.",
  },
  courier: {
    category: "mono",
    stack: "var(--font-courier), ui-monospace, monospace",
    desc: "A typewriter face. Manuscripts, legal filings, carbon copies, deliberately analogue.",
  },
  vt323: {
    category: "mono",
    stack: "var(--font-vt323), ui-monospace, monospace",
    desc: "A pixel bitmap terminal face from a CRT. 1980s computing, phosphor glow, raw and low resolution.",
  },
  /* Pixels were reachable only through `vt323`, which is filed under mono and
     described as a CRT terminal — so the only way to ask for a face made of
     pixels was to ask for a 1980s computer. A brief about a game built out of
     cubes could not get there, the same way the `display` category once could
     not reach a handwritten face. These two are filed under display, where a
     brief looking for a voice rather than a grid will actually look.

     `pixelify` is filed under sans rather than display because it is legible
     at body sizes, and a world made of blocks does not use a pixel face for
     its headings and a humanist sans for everything else. */
  pixelify: {
    category: "sans",
    stack: "var(--font-pixelify), ui-sans-serif, sans-serif",
    desc: "A bitmap face with visibly square pixels that still reads as ordinary text. Games, voxels, sprites, toys, anything built out of blocks rather than curves.",
  },
  pressStart: {
    category: "display",
    stack: "var(--font-press-start), ui-monospace, monospace",
    desc: "The chunky all-caps pixel face of an arcade cabinet, eight pixels to a letter. 8-bit consoles, high score tables, coin-op. Enormous and unreadable below a headline.",
  },
} as const

/**
 * The one definition of what may carry running text.
 *
 * This was a hand-typed list, and it had already drifted: it omitted two faces
 * production offers and the benchmark's flat-face ablation, filtering by a
 * different rule, was offering a copperplate script and an arcade face as body
 * text although both descriptions say they are unreadable at that size. Three
 * places decided the same question and none of them agreed.
 *
 * Derived now, so a face added to the catalog joins or does not join by its own
 * category and this note, rather than by someone remembering a list.
 */
const NOT_FOR_BODY = new Set<FaceKey>([
  /* Filed as a serif and described as a display serif. It sets a beautiful
     heading and a punishing paragraph. */
  "instrumentSerif",
])
export const canCarryBody = (k: FaceKey) =>
  faces[k].category !== "display" && !NOT_FOR_BODY.has(k)
export const bodyFaces = (Object.keys(faces) as FaceKey[]).filter(canCarryBody)

/** Faces that can carry a headline. Display faces only ever appear here. */
export const displayFaces = Object.keys(faces) as FaceKey[]

/** Fixed-width faces, for data and code. */
export const monoFaces = [
  "geistMono", "jetbrainsMono", "plexMono", "courier", "vt323",
] as const satisfies readonly FaceKey[]

/* ── Colour, factored into three axes ────────────────────────────────────── */

/**
 * Hue families.
 *
 * The descriptions carry what a colour MEANS, and they used to carry only its
 * natural meanings — growth, danger, wealth, night. A brief about a phosphor
 * monitor was being matched against "growth, money, success, nature" and had
 * no reason to reach green, so it reached amber instead, which is the rarer
 * phosphor in life and the commoner one in writing.
 *
 * Where a colour has a technological association as strong as its natural one,
 * both are stated. A model that has never seen a screen knows only what the
 * words say about it.
 */
export const hues = {
  crimson: { angle: 22, desc: "Blood red. Alarm, urgency, danger." },
  brick: { angle: 38, desc: "Burnt earthen red. Terracotta, warmth, age." },
  orange: { angle: 52, desc: "Bright orange. Energy, construction, warning." },
  amber: { angle: 68, desc: "Amber and honey. Warmth, caution lights, and the second kind of monochrome screen — rarer than the green one." },
  gold: { angle: 85, desc: "Old gold. Luxury, awards, gilt." },
  olive: { angle: 108, desc: "Olive and moss. Military, utility, organic." },
  lime: { angle: 128, desc: "Sharp acid green. Highlighter, radioactive, synthetic. Also the green of a P1 phosphor screen and of night vision." },
  green: { angle: 148, desc: "True green. Growth, money, success, nature. Also the standard colour of a monochrome computer monitor, a radar screen and an oscilloscope." },
  emerald: { angle: 162, desc: "Deep jewel green. Wealth, forest, considered." },
  teal: { angle: 185, desc: "Teal. Medical, calm, clinical competence." },
  cyan: { angle: 205, desc: "Cyan. Cold and digital: the blue of a contemporary control room, a head-up display or a diagnostic readout, rather than of an older monochrome screen." },
  sky: { angle: 228, desc: "Open sky blue. Light, airy, optimistic." },
  blue: { angle: 258, desc: "Institutional blue. Banks, government, trust, software." },
  navy: { angle: 268, desc: "Deep navy. Authority, uniform, night." },
  indigo: { angle: 285, desc: "Indigo. Twilight, ink, contemplative." },
  violet: { angle: 302, desc: "Violet. Synthetic, creative, slightly unreal." },
  purple: { angle: 318, desc: "Royal purple. Ceremony, mysticism, extravagance." },
  magenta: { angle: 334, desc: "Magenta. Print, pop, loud artificiality." },
  pink: { angle: 350, desc: "Pink. Soft, sweet, youthful or subversive." },
  rose: { angle: 10, desc: "Dusty rose. Faded romance, gentle, vintage." },
  /* Two gaps found by review. There was no plain yellow: the nearest routes
     were "old gold" and olive, neither of which is what a brief means by
     yellow. And there was no plain brown, which the second-material question
     needs constantly — wood, soil, leather and dirt all had to be answered as
     amber or brick. */
  yellow: { angle: 100, desc: "Plain yellow. Warning tape, taxis, highlighters, school buses, egg yolk." },
  brown: { angle: 55, desc: "Plain brown. Wood, soil, leather, chocolate, cardboard, dirt." },
  slate: { angle: 250, desc: "Barely-blue grey. Neutral with a cold cast." },
  stone: { angle: 70, desc: "Barely-warm grey. Neutral with a paper cast." },
  neutral: { angle: 0, desc: "No hue at all. Pure grey." },
} as const

/**
 * Hues that are not only an angle.
 *
 * An angle says where on the colour wheel; some of these descriptions promise
 * something an angle cannot carry, and the questions that set saturation and
 * lightness are separate axes that cannot see which hue won. So the limits live
 * here, where both answers are in hand.
 *
 * Two kinds, both found by replaying fixed answers:
 *
 * - GREYS. Angle zero is not the absence of a hue, it is red. `neutral` says
 *   "No hue at all. Pure grey" and, asked for maximum saturation, assembled to
 *   `oklch(0.598 0.243 0)`. `slate` and `stone` promise "barely" coloured greys
 *   and were free to take any saturation asked for.
 *
 * - BROWN. Brown is not a hue, it is a dark low-chroma orange: at the same
 *   lightness the two are indistinguishable, and `brown` assembled to
 *   `oklch(0.598 0.149 55)` against orange's `oklch(0.598 0.155 52)`. On a dark
 *   page, where the accent is deliberately lightened to stay readable, it came
 *   out at L 0.73 — a bright orange from an option whose description is wood,
 *   soil and leather. It needs a lightness ceiling as well as a chroma one, and
 *   the ceiling is set where brown stops reading as brown rather than where it
 *   would be most legible.
 */
export const HUE_LIMITS: Partial<Record<HueKey, { chroma?: number; lightness?: number }>> = {
  neutral: { chroma: 0 },
  slate: { chroma: 0.02 },
  stone: { chroma: 0.02 },
  brown: { chroma: 0.11, lightness: 0.6 },
} as const

/** Just the chroma ceilings, for the callers that only cap saturation. */
export const HUE_CEILING: Partial<Record<HueKey, number>> = Object.fromEntries(
  Object.entries(HUE_LIMITS)
    .filter(([, v]) => v.chroma !== undefined)
    .map(([k, v]) => [k, v.chroma])
)

export type HueKey = keyof typeof hues

/** How saturated the accent is. Ordered, so the answer interpolates. */
export const chromaLadder = [0, 0.04, 0.09, 0.15, 0.22, 0.31]

/** Canvases. Each is a background and the ink that reads on it. */
/**
 * Canvases. Each is a background, the ink that reads on it, and its OWN hue.
 *
 * The hue used to come from the accent, and the tint was zeroed whenever the
 * accent was desaturated. Both were wrong in the same way: paper is warm
 * because of what it is made of, not because of what you write on it. A
 * greyscale eighteenth-century style got a pure grey-white page, and a
 * blue-accented one got a blue sand.
 */
export const canvases = {
  paper: { bg: 1.0, ink: 0.145, tint: 0, hue: 0, desc: "Pure white. Nothing behind the content." },
  bone: { bg: 0.975, ink: 0.2, tint: 0.014, hue: 80, desc: "Warm off-white, like uncoated stock." },
  newsprint: { bg: 0.93, ink: 0.235, tint: 0.022, hue: 75, desc: "Greyed warm paper. Print, newspapers, cheap stock." },
  sand: { bg: 0.945, ink: 0.26, tint: 0.038, hue: 70, desc: "Sandy beige. Analogue, archival, sun-faded." },
  parchment: { bg: 0.905, ink: 0.24, tint: 0.055, hue: 66, desc: "Aged, browned paper. Laid stock, foxed at the edges, two centuries old." },
  chalk: { bg: 0.978, ink: 0.18, tint: 0.01, hue: 250, desc: "Cool blue-white. Clinical, crisp, laboratory." },
  slate: { bg: 0.42, ink: 0.96, tint: 0.014, hue: 250, desc: "Mid grey. Neither light nor dark, a working surface." },
  graphite: { bg: 0.27, ink: 0.93, tint: 0.01, hue: 260, desc: "Soft dark grey. Dimmed, professional, easy on the eyes." },
  charcoal: { bg: 0.2, ink: 0.95, tint: 0.012, hue: 265, desc: "Near-black with weight. The standard dark interface." },
  midnight: { bg: 0.145, ink: 0.96, tint: 0.022, hue: 265, desc: "Deep blue-black. Night, depth, submerged." },
  void: { bg: 0.06, ink: 0.94, tint: 0.004, hue: 0, desc: "True black. A screen with the lights off. OLED, terminal, cinema." },
} as const

export type CanvasKey = keyof typeof canvases

/* ── Shape and depth ─────────────────────────────────────────────────────── */

export const shadowRecipes = {
  none: { surface: "none", overlay: "none", desc: "No shadow at all. The style does not believe in depth." },
  hairline: { surface: "0 0 0 1px oklch(0 0 0 / 0.04)", overlay: "0 0 0 1px var(--ui-edge)", desc: "A containing hairline instead of a shadow." },
  whisper: { surface: "0 1px 2px 0 oklch(0 0 0 / 0.04)", overlay: "0 12px 32px -8px oklch(0 0 0 / 0.16)", desc: "One pixel of blur, almost subliminal." },
  soft: { surface: "0 2px 6px -1px oklch(0 0 0 / 0.07)", overlay: "0 16px 40px -10px oklch(0 0 0 / 0.2)", desc: "A gentle everyday drop shadow." },
  lifted: { surface: "0 4px 14px -2px oklch(0 0 0 / 0.1)", overlay: "0 24px 56px -14px oklch(0 0 0 / 0.26)", desc: "Panels clearly float above the page." },
  floating: { surface: "0 12px 32px -8px oklch(0 0 0 / 0.16)", overlay: "0 36px 80px -20px oklch(0 0 0 / 0.34)", desc: "Deep soft elevation, cards hover well clear of the page." },
  hard: { surface: "4px 4px 0 0 var(--ui-edge)", overlay: "6px 6px 0 0 var(--ui-edge)", desc: "A solid unblurred offset block in the line colour. Only right on square corners with heavy borders." },
  hardTight: { surface: "2px 2px 0 0 var(--ui-edge)", overlay: "3px 3px 0 0 var(--ui-edge)", desc: "A small solid offset. Graphic but restrained." },
  glow: { surface: "0 0 12px -2px var(--ui-accent)", overlay: "0 0 24px -4px var(--ui-accent)", desc: "The accent bleeds outward as light. Phosphor, neon, emission." },
  inset: { surface: "inset 0 1px 2px 0 oklch(0 0 0 / 0.08)", overlay: "0 16px 40px -10px oklch(0 0 0 / 0.2)", desc: "Surfaces are pressed into the page rather than raised off it." },
  /* A glow and an inset each had ONE recipe, so the four rungs of the depth
     rubric collapsed to two: "barely, the faintest halo" and "it is one of the
     first things you notice" assembled to identical tokens. The question was
     being asked, answered carefully and then thrown away. These give both kinds
     the range their rubric already promised. */
  glowFaint: { surface: "0 0 6px -3px var(--ui-accent)", overlay: "0 0 14px -5px var(--ui-accent)", desc: "The faintest halo of emitted accent." },
  glowStrong: { surface: "0 0 22px 0 var(--ui-accent)", overlay: "0 0 44px 0 var(--ui-accent)", desc: "The accent floods outward. The emission is the point." },
  insetFaint: { surface: "inset 0 1px 1px 0 oklch(0 0 0 / 0.05)", overlay: "0 12px 32px -8px oklch(0 0 0 / 0.16)", desc: "A hint that the surface is recessed." },
  insetDeep: { surface: "inset 0 3px 6px -1px oklch(0 0 0 / 0.16)", overlay: "0 20px 48px -12px oklch(0 0 0 / 0.24)", desc: "Surfaces are cut deep into the page." },
  hardLarge: { surface: "7px 7px 0 0 var(--ui-edge)", overlay: "10px 10px 0 0 var(--ui-edge)", desc: "A large solid offset block. The shadow is as much of the poster as the panel." },
} as const

export type ShadowKey = keyof typeof shadowRecipes

export const easingCurves = {
  linear: { value: "linear", desc: "Constant speed. Mechanical, digital, unfeeling." },
  standard: { value: "cubic-bezier(0.32, 0.72, 0, 1)", desc: "Fast out, slow in. The unobtrusive default." },
  gentle: { value: "cubic-bezier(0.4, 0, 0.2, 1)", desc: "Symmetric and calm, nothing hurries." },
  /* Described as "overshoots and settles" for a curve whose control points are
     both at 1, which cannot overshoot. It was competing with `elastic` for a
     physical effect only `elastic` produces, so a brief asking for bounce had
     two answers and one of them was a lie. */
  expressive: { value: "cubic-bezier(0.22, 1, 0.36, 1)", desc: "Decelerates hard and lands. Emphatic and quick, without bouncing." },
  snappy: { value: "cubic-bezier(0.87, 0, 0.13, 1)", desc: "Holds, then snaps. Abrupt and decisive." },
  elastic: { value: "cubic-bezier(0.34, 1.56, 0.64, 1)", desc: "Springs past the target and bounces back. Toy-like." },
} as const

export type EasingKey = keyof typeof easingCurves

/* ── Ordered ladders. The model says how far up; the rungs are ours. ─────── */

export const ladders = {
  /* Two ladders indexed by one answer, and they must agree about what "square"
     means: at 0.4 the control radius snapped to zero while the surface kept
     0.075rem, so a style asked for perfectly square corners got square controls
     inside rounded panels. The surface ladder now starts its second rung where
     the deadzone lets the control ladder leave zero. */
  roundness: { control: [0, 0.125, 0.375, 0.625, 1], surface: [0, 0.25, 0.5, 0.875, 1.25] },
  borderWeight: [1, 1.5, 2, 3],
  airiness: {
    gapSection: [0.75, 1.25, 1.5, 2, 2.75],
    gapStack: [0.5, 0.75, 1, 1.25, 1.75],
    /* Rungs 1 and 2 were both 0.5rem, so a third of this ladder produced no
       change in the gap between a label and the thing beside it. The plateau
       was not deliberate, it was a rounded number written twice. */
    gapInline: [0.375, 0.5, 0.625, 0.8, 1],
    padSurface: [0.875, 1.25, 1.5, 2, 2.5],
    gapField: [0.25, 0.375, 0.5, 0.625, 0.75],
  },
  controlSize: { height: [2, 2.25, 2.5, 2.875], padX: [0.625, 0.875, 1, 1.25] },
  textSize: { base: [0.8125, 0.875, 0.9375, 1], scale: [0.95, 1, 1.05, 1.12] },
  /* Two rungs below regular. A head-up display and a gallery both set type
     lighter than an interface ever does, and the ladder started at the weight
     a font gives you when nobody chooses. */
  weight: [200, 300, 400, 500, 600, 700],
  tracking: [0, 0.04, 0.08, 0.14],
  titleTracking: [-0.03, -0.015, 0, 0.02, 0.06],
  /* Running text is normally set solid. A head-up display and a piece of
     ceremonial printing both open it, and the ladder had nowhere to say so. */
  bodyTracking: [0, 0.01, 0.025, 0.05],
  surfaceTint: [0, 0.2, 0.35, 0.6],
  duration: [0, 90, 180, 260],
  /* Read as a fraction of the distance from the page colour to the ink, so
     the top rung reaches nearly the ink on any canvas. */
  edgeContrast: [0.08, 0.26, 0.55, 0.88],
  accentDepth: [0.42, 0.55, 0.68, 0.82],
  /* How much colour the page itself carries. Only ever asked of a brief that
     is not describing an interface, so rung 0 is what every ordinary style
     gets without the question being put. The top rung is well past anything
     in the canvas catalog, whose largest tint is parchment's 0.055: that
     catalog can say what paper a page is made of and cannot say that a page
     is green, which is why a brief about a world built out of grass and dirt
     could only ever come back white. */
  pageChroma: [0, 0.035, 0.1, 0.19],
} as const

/**
 * The reachable style space, as a sanity check on "it only picks".
 * Multiply it out: this is generation by any useful definition.
 */
export type FaceCategory = "sans" | "serif" | "mono" | "display"

export const facesByCategory = (Object.keys(faces) as FaceKey[]).reduce(
  (acc, k) => {
    ;(acc[faces[k].category] ??= []).push(k)
    return acc
  },
  {} as Record<FaceCategory, FaceKey[]>
)

/**
 * How much depth an answer can actually produce: the rung says how much, the
 * kind says what sort, and this is the only place that knows which named recipe
 * the pair means.
 *
 * It lives here rather than beside the assembly because the count below has to
 * derive from it. `soft` and `hairline` are in `shadowRecipes` and in no row,
 * so the model cannot reach them; they are kept for the design panel's hand
 * presets. Counting the catalog's length instead overstated the space, and
 * maintaining the number in two places is how the two stop agreeing.
 */
/** The four kinds of depth an answer can ask for. */
export type DepthKind = "blurred" | "hardOffset" | "glow" | "inset"

export const DEPTH_RECIPES: Record<DepthKind, [ShadowKey, ShadowKey, ShadowKey, ShadowKey]> = {
  blurred: ["none", "whisper", "lifted", "floating"],
  hardOffset: ["none", "hardTight", "hard", "hardLarge"],
  glow: ["none", "glowFaint", "glow", "glowStrong"],
  inset: ["none", "insetFaint", "inset", "insetDeep"],
}

export const REACHABLE_SHADOW_COUNT = new Set(Object.values(DEPTH_RECIPES).flat()).size
export const reachableStyles =
  displayFaces.length * bodyFaces.length * monoFaces.length *
  Object.keys(hues).length * Object.keys(canvases).length *
  REACHABLE_SHADOW_COUNT * Object.keys(easingCurves).length
