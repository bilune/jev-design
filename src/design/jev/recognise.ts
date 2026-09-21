/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  STAGE 0 — what kind of brief is this?
 * ─────────────────────────────────────────────────────────────────────────────
 *  A brand name is a compressed style brief, and it only decompresses if text
 *  ever did the describing. Measured over twelve products, a bare name scores
 *  60–63% against facts about them; invented names produce the same answer, so
 *  the failures are not wrong memories, they are the absence of one.
 *
 *  This pass asks about the product in the vocabulary text uses for products —
 *  what colour a company is associated with, whether its interface is dark,
 *  who it is for — rather than in the vocabulary of a design engine. The answers
 *  are then handed to stage one as context.
 *
 *  Two things make this safe to put in front of everything:
 *
 *  - It is gated. If the model does not recognise a product, nothing is added to
 *    the state. A confident wrong assertion in the state is worse than silence,
 *    because the downstream questions will commit to it instead of hedging.
 *  - It is one request. All of its questions are independent, so they travel
 *    together, and the whole pass costs about 400ms.
 */
import { choice, noul, score } from "@typesafe-ai/sdk"

import type { JevClient } from "./client"

import { hues, type HueKey } from "./catalog"

export const recognition = {
  namesAProduct: noul(
    "Does this brief name a specific real product, company, console, operating system or piece of software — as opposed to describing a style, a period or a mood?",
    {
      true: "A named thing that exists in the world and has an interface.",
      false: "A description of a style, however specific. Naming a movement or an era is not naming a product.",
    }
  ),
  appearanceKnown: noul(
    "Is the way this product's interface looks — its colours, its density, its shape — something widely described in writing, as opposed to something you would only know by having seen it?",
    {
      true: "Its appearance is commonly written about: a signature colour, a famously dark interface, a well-known look.",
      false: "Writing about it covers what it does, not what it looks like.",
    }
  ),
  interfaceIsDark: noul(
    "Is this product's own interface predominantly dark — a black or near-black background rather than a white one?"
  ),
  brandColour: choice(
    "What single colour is this product or company most associated with?",
    Object.fromEntries(
      (Object.keys(hues) as HueKey[]).map((k) => [k, hues[k].desc])
    )
  ),
  /**
   * The question the warning actually wants answered.
   *
   * It used to be proxied by two others: "is this a product" and "does the
   * brief have fewer than four words". That proxy fired on `Deep sea
   * bioluminescence` — three words, not a product — when the result was one of
   * the best the engine produced. The brief was never thin; it determines a
   * dark canvas, a cyan accent and an emissive treatment on its own.
   */
  briefIsSpecific: noul(
    "Does this brief, on its own, say enough to determine how an interface should look — its colours, how dark or light it is, how dense, what shape?",
    {
      true: "Someone handed only this could produce a specific style from it, whether it describes one outright or names something with a known look.",
      false: "It would have to be invented. The brief names or describes nothing that pins down an appearance.",
    }
  ),
  /**
   * How far the brief is from business software.
   *
   * `Minecraft` used to return a vivid green accent on a pure white page, and
   * `Atlassian Jira` returned a blue accent on a pure white page. The second is
   * right and the first is wrong, which means the engine was not too timid in
   * general: it was missing the distinction between a brief that describes
   * business software and one that drags something that is not an interface at
   * all onto a dashboard. The first should inherit interface convention. The
   * second has no convention to inherit.
   *
   * This is a rung rather than a flag because it is used as one. It decides
   * whether the page is allowed to carry colour of its own, and at a low rung
   * those questions are not asked, so a brief about business software cannot
   * be affected by machinery it never reaches.
   *
   * Measured over twenty labelled briefs (experiment 16), three phrasings all
   * separated the groups 20/20. This one was kept for having the widest empty
   * margin: business software tops out at 0.39 and transplants bottom out at
   * 0.80, against 0.60/0.91 and 0.70/0.97 for the two boolean phrasings, both
   * of which put Stripe within a hair of their own threshold.
   */
  departure: score(
    "How far is the look this brief describes from the look of ordinary business software?",
    [
      {
        summary: "It IS business software, or indistinguishable from it.",
        signals: "productivity tools, admin panels, dashboards, enterprise products",
      },
      {
        summary: "Adjacent. A styled interface, but still plainly an interface.",
        signals: "a consumer app, a developer tool with a strong house style",
      },
      {
        summary: "Clearly not an interface, but a flat and restrained thing.",
        signals: "print, editorial, signage, a technical drawing",
      },
      {
        summary: "Not an interface at all, and vividly coloured or textured.",
        signals: "a game, a toy, a landscape, a material, a poster, a world",
      },
    ] as never
  ),
  /* `mixed` exists because the other seven overlap and the question had no way
     to decline. Dense, technical and corporate can all be true of one product,
     and the winner of a three-way split was being emitted as a stated fact at
     0.45 confidence. A product with no single character can now say so. */
  /**
   * The question the gate is actually for.
   *
   * `departure` classifies the SUBJECT and was being used to grant permission
   * for a coloured page, which is a different property. Measured over the eight
   * briefs where the two come apart (experiment 19), `departure` scored 2/8 and
   * blocked every explicit request: "an ordinary operations dashboard with a
   * saturated cobalt-blue page background" is business software, scored 0.16,
   * and could not reach a coloured ground at all. This question scored 7/8 on
   * the same eight.
   *
   * Its one miss is the other direction: `Minecraft` reads at 0.29 because the
   * brief does not SAY "coloured background" — a world supplies one without
   * asking. So the two are combined rather than swapped, and the amount
   * question decides what actually happens. Opening the gate costs two
   * questions; it does not spend colour.
   */
  needsColouredGround: noul(
    "Does this brief call for the background itself to carry a clearly chromatic colour, rather than a white, grey, black, or lightly tinted paper ground?",
    {
      true: "The brief explicitly requests a coloured background, or its material or world clearly supplies one.",
      false: "The background should remain white, grey, black, or lightly tinted paper; colour belongs only to foreground details, if anywhere.",
    }
  ),
  character: choice("How is this product usually described?", {
    mixed: "No single description fits, or several of the others fit equally well.",
    minimal: "Spare, restrained, uncluttered. Praised for what it leaves out.",
    dense: "Packed with information. Built for people who stare at it all day.",
    playful: "Colourful, rounded, fun. Aimed at delight.",
    corporate: "Institutional and conservative. Built to be trusted.",
    technical: "Made for engineers. Precise, plain, unsentimental.",
    luxurious: "Expensive-feeling. Spacious, quiet, considered.",
    retro: "Of an earlier era of computing, deliberately or by age.",
  }),
}

/**
 * What the pass is actually for.
 *
 * Measured over twelve products, running this in front of generation moves a
 * bare brand name from 57% to 60–63% against facts about those products. That
 * is a real gain and a small one: the information is not there to extract, and
 * asking more cleverly does not create it.
 *
 * What it does do is TELL us. Grouped by its own `appearanceKnown` answer, the
 * briefs it says it can picture come out 78% accurate and the ones it says it
 * cannot come out 39%. It also rejected all five controls — three invented
 * company names and two style briefs — as not naming a product at all. So the
 * pass earns its 350ms less by improving the answer than by letting the
 * interface ask for the three words that would.
 *
 * It is not a guarantee. Windows 95 reports 0.86 and is 25% accurate: confident
 * and wrong, which is the failure mode this kind of gate always has.
 */
export type Recognition = {
  namesAProduct: number
  appearanceKnown: number
  briefIsSpecific: number
  interfaceIsDark: number
  brandColour: HueKey
  brandColourConfidence: number
  character: string
  characterConfidence: number
  /** How far the brief is from business software, 0 to 3. */
  departure: number
  /** Whether the brief asks the page itself to carry a colour. */
  needsColouredGround: number
  /** Whether the brief is about a product at all. */
  trusted: boolean
  /** Whether the page is allowed to carry colour of its own. */
  bold: boolean
}

/** Below this, the brief is not about a product and none of this applies. */
const NAMES_A_PRODUCT = 0.6
/**
 * Above this rung, the brief is not describing an interface, so interface
 * convention is not the answer and the page may carry colour of its own.
 *
 * Set between the two measured groups rather than at the edge of either. On
 * twenty labelled briefs the highest business-software answer was 1.17 of 3 and
 * the lowest transplant was 2.40, so anywhere in that gap classifies all twenty
 * correctly; the midpoint is the furthest from both.
 */
export const DEPARTURE_IS_BOLD = 1.8
/**
 * A direct request for a coloured page, and it has to be believed strongly.
 *
 * It was 0.5, the natural midpoint of a noul, and that is the wrong place for a
 * question whose yes REPAINTS THE PAGE. The brief `Una terminal de fósforo
 * ámbar de los 80` (an 80s amber phosphor terminal, quoted as it was measured)
 * answered 0.57 and got an amber page with a green accent: the brief names
 * one colour and the engine shipped two, with the named one demoted to the
 * background. An amber phosphor terminal is amber ON BLACK — the amber is the
 * light, not the paper.
 *
 * The measured distribution leaves no reason to sit at the midpoint. Explicit
 * requests for a coloured background answer 0.97–0.98; the two amber terminals
 * answer 0.57 and 0.70; plain interfaces answer 0.03–0.14. The gap between 0.70
 * and 0.97 is empty, so the threshold belongs inside it rather than in the
 * middle of the uncertainty.
 *
 * A brief whose WORLD supplies a ground without asking for one — Minecraft at
 * 0.26, the deep sea at 0.48 — is not meant to come through here at all. It
 * comes through `departure`, and that is why there are two routes.
 */
export const NEEDS_GROUND = 0.8
/**
 * Every fact carries its own gate rather than sharing one.
 *
 * A single `appearanceKnown` gate was measured first and it threw away correct
 * answers: for Figma it reported 0.45 — it does not feel it knows the interface
 * — while the colour question answered `violet`, which is right. Whether a
 * company has a signature colour and whether its layout is widely described are
 * different facts, and a model can know one without the other.
 */
const COLOUR_SURE = 0.45
const CHARACTER_SURE = 0.45
/** A noul has to be this decisive before its claim is stated rather than omitted. */
const ASSERT = 0.7

export async function recognise(
  client: JevClient,
  brief: string
): Promise<{ result: Recognition; inputTokens: number }> {
  // The state is the brief and nothing else, and that is a measured choice.
  //
  // A bare token is genuinely ambiguous here: `Linear`, `Stripe`, `Notion` and
  // `Slack` are ordinary English words before they are companies, and asked
  // bare, `Linear` scores 0.14 on "names a product" — the pass is not failing to
  // recall the product, it is not considering that one was meant. Offering the
  // product reading alongside the brief fixes exactly that: 0.14 → 0.79, and its
  // answer on whether that interface is dark moves 0.39 → 0.62, the right
  // direction for a near-black app. It does not make the pass hallucinate
  // products either; invented names stay at 0.17–0.28 and style briefs at 0.05.
  //
  // It was still dropped, because it halves the thing this pass is actually for.
  // Grouped by `appearanceKnown`, the bare framing separates briefs it can
  // picture from briefs it cannot by 39 points (78% vs 39%, stable across runs).
  // With the product reading offered, that separation falls to 11–16 points,
  // because pushing an interpretation drags the confident cases toward the
  // middle — Windows 95 from 0.86 to 0.80, Figma from 0.47 to 0.39.
  //
  // A framing that urges a reading costs you the model's honest answer about
  // whether it has one. The common-noun problem is real, but the interface
  // solves it more cheaply by noticing the brief is three words long.
  const res = await client.systemOne({
    state: { brief } as never,
    questions: recognition as never,
  })
  /* The transport types its answers loosely, because two SDKs describe them
     differently. The shapes the questions above ask for are known here. */
  const a = res.answers as Record<
    string,
    { noul: number; choice: string; confidence: number; score: number }
  >
  const result: Recognition = {
    namesAProduct: a.namesAProduct.noul,
    appearanceKnown: a.appearanceKnown.noul,
    briefIsSpecific: a.briefIsSpecific.noul,
    interfaceIsDark: a.interfaceIsDark.noul,
    brandColour: a.brandColour.choice as HueKey,
    brandColourConfidence: a.brandColour.confidence,
    character: a.character.choice,
    characterConfidence: a.character.confidence,
    departure: a.departure.score,
    needsColouredGround: a.needsColouredGround.noul,
    trusted: a.namesAProduct.noul >= NAMES_A_PRODUCT,
    /* Deliberately NOT gated on `trusted`. Whether the brief names a real
       product and whether it describes an interface are different facts:
       `Minecraft` is a real product and is not an interface of this kind. */
    /* Either route opens it. One reads the subject and catches a world that
       supplies a ground without naming it; the other reads the request and
       catches a piece of business software that names one. Neither catches
       both, and measured together they cover all eight crossing cases. */
    bold: a.departure.score >= DEPARTURE_IS_BOLD || a.needsColouredGround.noul >= NEEDS_GROUND,
  }
  return { result, inputTokens: res.usage.input_tokens }
}

/**
 * What stage one is told. Only claims the pass was sure about are stated; the
 * rest are left out rather than hedged, because a hedge in the state reads as
 * a fact to a model that does not weigh probabilities.
 */
export function recognitionContext(r: Recognition): Record<string, string> | null {
  if (!r.trusted) return null
  const ctx: Record<string, string> = {}
  if (r.brandColourConfidence >= COLOUR_SURE) ctx.associated_colour = r.brandColour
  if (r.characterConfidence >= CHARACTER_SURE && r.character !== "mixed") ctx.character = r.character
  if (r.interfaceIsDark >= ASSERT) ctx.canvas = "its interface is dark: a black or near-black page"
  /* The complement of "predominantly dark" is not "white".
   *
   * A low probability here was being emitted as "a white or near-white page",
   * which also swallows mid-grey, coloured and mixed interfaces. The question
   * asked one thing and the context asserted a stronger one, and a stated fact
   * is what the later questions commit to. */
  else if (r.interfaceIsDark <= 1 - ASSERT) ctx.canvas = "its interface is not dark; the page is light or mid-toned"
  if (Object.keys(ctx).length === 0) return null
  /* Precedence, stated.
   *
   * A brief can name a product AND ask for something else: "Spotify, but white
   * with a pink accent" is two tasks, and this block used to hand stage one
   * Spotify's green and black as "what is known", with nothing saying that the
   * words in the brief outrank them. A correct recognition answer then became
   * misleading context. */
  ctx.note =
    "The brief names a real product. What follows is what is known about that product. " +
    "Anything the brief itself states about how it should look takes precedence over these " +
    "associations, and anything not stated here is not known and should be answered from the style itself."
  return ctx
}
