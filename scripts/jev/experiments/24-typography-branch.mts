#!/usr/bin/env tsx
/**
 * Is the heading category's runner-up worth keeping?
 *
 * Production takes the argmax of `displayCategory`, resolves a face inside it,
 * and throws the rest of the distribution away. The branching proposal is to
 * carry the runner-up forward as a second complete interpretation and then
 * compare the two CONCRETE pairings — something neither isolated face question
 * can do, because each is answered without seeing the other.
 *
 * Three things have to hold before any of that is worth building, and they are
 * measured here in order. Failing the first makes the rest moot:
 *
 *   1. A REAL ALTERNATIVE EXISTS. If the runner-up category carries almost no
 *      probability, there is nothing to branch on.
 *   2. IT LEADS SOMEWHERE ELSE. If both branches resolve to the same face, or
 *      to two faces nobody could tell apart, branching costs a request and buys
 *      a synonym.
 *   3. THE MODEL CAN CHOOSE. Shown the two finished pairings, does it prefer
 *      the incumbent, and does it prefer it for a reason?
 *
 * Three is the one to be sceptical about. A model that always picks the
 * incumbent has told us nothing, and a model that switches half the time at
 * random is worse than not asking. So the comparison is run in BOTH orders on
 * every brief: a preference that survives swapping the labels is a preference,
 * and one that does not is position bias, which experiment 03 already found in
 * this model once.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RESULT, AND WHY THE BRANCHING WAS NOT BUILT
 *
 * First run: 16/30 had a real alternative, 30/30 resolved to different pairings,
 * and the model preferred the alternative in BOTH orders on 9/30 with only 1/30
 * order-dependent. Judged by hand, seven of those nine were improvements.
 *
 * But FOUR of the nine had `bebas` as the incumbent, and that turned out not to
 * be a choice. The display category held four faces of which three were
 * specialists — a copperplate script, an arcade face and an art-directed
 * fashion sans — so every brief wanting a heading voice that was not a
 * certificate, a coin-op cabinet or a gallery got the condensed poster face by
 * elimination. Measured directly, it won ten of ten such briefs with the others
 * at 0.00–0.32, taking a kindergarten classroom wall at 0.89.
 *
 * Adding two general-purpose display faces (`fredoka`, `abril`) moved the vinyl
 * sleeve from bebas 0.70 to abril 0.99, the children's pop-up book to fredoka
 * 0.87 and the kindergarten wall to fredoka 0.85, while bebas correctly kept the
 * skate deck, the rave flyer, the jazz poster and the brutalist car park.
 *
 * Re-run after that, the comparison prefers the alternative on 3–5 of 30 rather
 * than 9. So two thirds of what branching appeared to buy was the comparison
 * rescuing the engine from a sparse catalog, and the catalog fix is free at
 * runtime where branching costs a request and a whole second interpretation to
 * carry. What remains is roughly three real improvements in thirty against one
 * regression, which does not clear the bar.
 *
 * The mechanism is not refuted. A comparative question sees a PAIR that neither
 * isolated question can, and it demonstrably overturns confident argmaxes. It
 * is worth reaching for again if a future axis shows the same 9/30 with no
 * catalog explanation underneath it.
 */
import { TypeSafeClient, choice } from "@typesafe-ai/sdk"
import { stageOne, facePair } from "@/design/jev/generate"
import { faces, type FaceCategory, type FaceKey } from "@/design/jev/catalog"

const prod = stageOne as unknown as Record<string, unknown>
const client = new TypeSafeClient({ timeout: 30000 })

/** Briefs that NAME a thing and leave the style implicit, which is what a real
 *  user types, and none of which appear in the benchmark or another experiment. */
const BRIEFS = [
  "A Swiss railway timetable", "A vinyl record sleeve from 1973", "An operating theatre",
  "The dashboard of a 1960s Citroën", "A seed catalogue", "A Soviet space program control panel",
  "A neon-lit ramen bar at midnight", "A wedding invitation, letterpressed", "A hospital triage board",
  "A skate deck graphic", "An illuminated medieval manuscript", "A power station turbine hall",
  "A children's pop-up book", "A jazz club poster, 1958", "An aircraft cockpit at night",
  "A perfume advertisement", "A weather station readout", "A brutalist car park",
  "A telephone exchange switchboard", "A botanical illustration", "An arcade high score table",
  "A courtroom transcript", "A submarine sonar station", "A luxury hotel key card",
  "A kindergarten classroom wall", "A seismograph trace", "A bank vault door",
  "A war memorial", "A chemistry set from 1962", "A rave flyer, Berlin",
]

type Cat = FaceCategory | "same"
const nameFor = (cat: Cat, face: FaceKey | null) =>
  cat === "same" ? "the body face at a larger size" : `${face} — ${faces[face!].desc}`

const rows = await Promise.all(BRIEFS.map(async (brief) => {
  /* Stage one, for the two categories and their probabilities. */
  const one = await client.systemOne({
    state: { style_brief: brief },
    questions: { displayCategory: prod.displayCategory, bodyCategory: prod.bodyCategory } as never,
  })
  const d = (one.answers as Record<string, never>).displayCategory as unknown as {
    choice: Cat; probabilities: Record<string, number>
  }
  const bodyCat = ((one.answers as Record<string, never>).bodyCategory as unknown as { choice: FaceCategory }).choice
  const ranked = (Object.entries(d.probabilities) as [Cat, number][]).sort((a, b) => b[1] - a[1])
  const [win, runner] = ranked
  const [winCat, winP] = win
  const [runCat, runP] = runner

  /* Both branches resolved in one request. They are answered in isolation, so
     neither face question is influenced by the other's existence. */
  const qs: Record<string, unknown> = {}
  const A = facePair(winCat, bodyCat)
  const B = facePair(runCat, bodyCat)
  if ("displayFace" in A) qs.aDisplay = A.displayFace
  if ("displayFace" in B) qs.bDisplay = B.displayFace
  qs.bodyFace = A.bodyFace
  const two = await client.systemOne({ state: { style_brief: brief }, questions: qs as never })
  const t = two.answers as Record<string, never>
  const aFace = "aDisplay" in t ? (t.aDisplay as unknown as { choice: FaceKey }).choice : null
  const bFace = "bDisplay" in t ? (t.bDisplay as unknown as { choice: FaceKey }).choice : null
  const body = (t.bodyFace as unknown as { choice: FaceKey }).choice

  const aLabel = nameFor(winCat, aFace)
  const bLabel = nameFor(runCat, bFace)
  const differ = aLabel !== bLabel

  /* Three: shown both finished pairings, which does it prefer? Asked twice with
     the options swapped, so position bias is visible rather than assumed away. */
  let prefersRunner: [boolean, boolean] = [false, false]
  if (differ) {
    const ask = (first: "incumbent" | "alternative") =>
      choice(
        {
          question: `The running text is set in ${body} — ${faces[body].desc} What should the headings be, to best convey "${brief}"?`,
          answer_with: "the pairing that better expresses the subject, judged as a pair",
        },
        (first === "incumbent"
          ? { incumbent: aLabel, alternative: bLabel }
          : { alternative: bLabel, incumbent: aLabel }) as never
      )
    const cmp = await client.systemOne({
      state: { style_brief: brief },
      questions: { order1: ask("incumbent"), order2: ask("alternative") } as never,
    })
    const c = cmp.answers as Record<string, never>
    prefersRunner = [
      (c.order1 as unknown as { choice: string }).choice === "alternative",
      (c.order2 as unknown as { choice: string }).choice === "alternative",
    ]
  }

  return {
    brief: brief.slice(0, 30),
    incumbent: `${winCat}${aFace ? `/${aFace}` : ""}`,
    p1: Number(winP.toFixed(2)),
    alternative: `${runCat}${bFace ? `/${bFace}` : ""}`,
    p2: Number(runP.toFixed(2)),
    differ,
    switches: differ ? (prefersRunner[0] && prefersRunner[1] ? "BOTH" : prefersRunner[0] || prefersRunner[1] ? "one order" : "no") : "—",
  }
}))

console.table(rows)

const real = rows.filter((r) => r.p2 >= 0.15)
const diff = rows.filter((r) => r.differ)
const both = rows.filter((r) => r.switches === "BOTH")
const flip = rows.filter((r) => r.switches === "one order")

console.log(`\n1. a real alternative exists (runner-up ≥ 0.15): ${real.length}/${rows.length}`)
console.log(`2. the two branches resolve to different pairings: ${diff.length}/${rows.length}`)
console.log(`3. the model prefers the alternative in BOTH orders: ${both.length}/${diff.length} of those`)
console.log(`   prefers it in only one order (position bias, not a preference): ${flip.length}/${diff.length}`)
console.log(`\nmedian runner-up probability: ${rows.map((r) => r.p2).sort((a, b) => a - b)[Math.floor(rows.length / 2)]}`)
