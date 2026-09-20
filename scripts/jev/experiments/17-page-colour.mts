#!/usr/bin/env tsx
/**
 * Two faults in the first coloured-page build, measured rather than guessed.
 *
 * 1. THE AMOUNT IS TIMID. `Minecraft` asked for 1.5 of 3 and landed on a mint
 *    wash. The ladder is not obviously wrong, so the suspicion is the question:
 *    "how much of that colour is in the page" contains the word page, and a
 *    page is an interface thing. Four phrasings are compared.
 *
 * 2. THE GROUND AND THE ACCENT COLLAPSE. Minecraft returned a green page and a
 *    green accent, Mario crimson on crimson. Both questions live in stage one,
 *    where every question is answered in isolation and in parallel, so neither
 *    can know the other picked the same colour. Asking the accent again in
 *    stage two — where the page is already decided and stated — is the only
 *    place the two can be told apart.
 */
import { TypeSafeClient, choice, score } from "@typesafe-ai/sdk"
import { hues, type HueKey } from "@/design/jev/catalog"

const BRIEFS = [
  "Minecraft", "Super Mario Bros", "A box of Lego bricks", "A lava lamp",
  "A tropical fruit market", "Deep sea bioluminescence",
  "An 18th century printed book, aged paper", "A coral reef",
]

const LEVELS = (subject: string) => [
  { summary: `None. ${subject} is a neutral background and only the accent is coloured.`, signals: "anything whose subject is flat, printed, drawn or monochrome" },
  { summary: "A wash. Tinted enough to notice beside a true neutral, still reads as white or grey.", signals: "a house colour bleeding into the paper" },
  { summary: `Clearly coloured. Nobody would describe ${subject} as white, grey or black.`, signals: "themed interfaces, packaging, anything with a strong ground" },
  { summary: `${subject[0].toUpperCase() + subject.slice(1)} IS that colour, at full strength. The colour is the ground everything else sits on.`, signals: "games, toys, landscapes, materials, posters, worlds" },
]

const AMOUNT = {
  /** What ships now. */
  page: score("How much of that colour is in the page itself, behind everything?", LEVELS("the page") as never),
  /** The word `page` removed: asks about the subject, not about an interface. */
  thing: score("How much of that colour does the thing this brief describes actually carry, across its whole surface?", LEVELS("the thing") as never),
  /** Names the consequence without naming an interface. */
  ground: score("If you had to fill an entire wall with the single colour that this thing is made of, how strong would that colour be?", LEVELS("the wall") as never),
  /** The same as `page`, but the rungs are stated as paint rather than as UI. */
  paint: score(
    "How saturated is the colour of the material this thing is made of?",
    [
      { summary: "Not coloured at all. It is white, grey or black.", signals: "print, drawings, monochrome things" },
      { summary: "Barely tinted. A near-neutral with a cast to it.", signals: "paper stock, concrete, unpainted materials" },
      { summary: "Plainly coloured, the strength of ordinary paint.", signals: "packaging, painted objects, printed colour" },
      { summary: "Vivid. As saturated as that material ever gets.", signals: "games, toys, plastics, flowers, neon, tropical things" },
    ] as never
  ),
} as const

const client = new TypeSafeClient({ timeout: 30000 })

const rows = await Promise.all(BRIEFS.map(async (brief) => {
  const res = await client.systemOne({
    state: { brief },
    questions: {
      ...AMOUNT,
      ground_hue: choice(
        { question: "What colour is the thing this brief describes actually made of — its ground, its body, the surface it presents?",
          answer_with: "the colour of the material itself, not the colour of anything sitting on top of it" },
        Object.fromEntries((Object.keys(hues) as HueKey[]).map((k) => [k, hues[k].desc])) as never
      ),
    } as never,
  })
  const a = res.answers as Record<string, never>
  const g = a.ground_hue as unknown as { choice: string }
  const out: Record<string, unknown> = { brief: brief.slice(0, 30) }
  for (const k of Object.keys(AMOUNT)) out[k] = Number(((a[k] as unknown as { score: number }).score).toFixed(2))
  out.groundHue = g.choice
  return out
}))
console.table(rows)
const mean = (k: string) => (rows.reduce((s, r) => s + (r[k] as number), 0) / rows.length).toFixed(2)
console.log("mean rung (0–3):", Object.keys(AMOUNT).map((k) => `${k} ${mean(k)}`).join("   "))

/* ── Fault 2: does stage two separate the accent from the ground? ───────── */
console.log("\n── accent asked AGAINST a decided page ──")
const two = await Promise.all(rows.map(async (r: Record<string, unknown>) => {
  const res = await client.systemOne({
    state: {
      brief: BRIEFS[rows.indexOf(r)],
      already_decided: { the_page_is: `${r.groundHue} — ${hues[r.groundHue as HueKey].desc}` },
    },
    questions: {
      accent: choice(
        { question: "The page is already that colour. What colour are the interactive parts — the buttons, the links, the selected row — so that they read as objects sitting ON that page rather than disappearing into it?",
          answer_with: "a colour that belongs to the same subject, not an arbitrary contrast" },
        Object.fromEntries((Object.keys(hues) as HueKey[]).map((k) => [k, hues[k].desc])) as never
      ),
    } as never,
  })
  const a = (res.answers as Record<string, never>).accent as unknown as { choice: string; confidence: number }
  return { brief: r.brief, page: r.groundHue, accent: a.choice, same: a.choice === r.groundHue ? "COLLAPSED" : "ok", conf: Number(a.confidence.toFixed(2)) }
}))
console.table(two)
console.log(`collapsed: ${two.filter((t) => t.same === "COLLAPSED").length}/${two.length}`)

/* ── Fault 2b: "different" is not "far" ──────────────────────────────────── */
/* The accent stopped landing on the page's exact hue, and then landed on its
   neighbour: lime on grass. Identity was the wrong test. Distance is the test,
   measured the short way round the circle, which is the check this codebase has
   got backwards twice. */
const apart = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d }

const ACCENT = {
  same: { question: "The page is already that colour. What colour are the interactive parts — the buttons, the links, the selected row — so that they read as objects sitting ON that page rather than disappearing into it?",
          answer_with: "a colour that belongs to the same subject, not an arbitrary contrast" },
  material: { question: "The page is already made of that material. What is the SECOND material this subject is made of — the one the buttons, the links and the selected rows would be cut from?",
              answer_with: "a different material belonging to the same subject, not a shade of the first one" },
} as const

console.log("\n── how far the accent lands from the page, in degrees ──")
const three = await Promise.all(rows.map(async (r: Record<string, unknown>) => {
  const res = await client.systemOne({
    state: { brief: BRIEFS[rows.indexOf(r)], already_decided: { the_page_is: `${r.groundHue} — ${hues[r.groundHue as HueKey].desc}` } },
    questions: Object.fromEntries(Object.entries(ACCENT).map(([k, q]) => [k,
      choice(q as never, Object.fromEntries((Object.keys(hues) as HueKey[]).map((h) => [h, hues[h].desc])) as never)])) as never,
  })
  const a = res.answers as Record<string, never>
  const pageAngle = hues[r.groundHue as HueKey].angle
  const out: Record<string, unknown> = { brief: r.brief, page: r.groundHue }
  for (const k of Object.keys(ACCENT)) {
    const pick = (a[k] as unknown as { choice: HueKey }).choice
    out[k] = `${pick} ${Math.round(apart(hues[pick].angle, pageAngle))}°`
  }
  return out
}))
console.table(three)
for (const k of Object.keys(ACCENT)) {
  const degs = three.map((t) => Number(String(t[k]).match(/(\d+)°/)?.[1] ?? 0))
  console.log(`${k.padEnd(9)} mean ${Math.round(degs.reduce((s, d) => s + d, 0) / degs.length)}°  under 40° (reads as the same colour): ${degs.filter((d) => d < 40).length}/${degs.length}`)
}
