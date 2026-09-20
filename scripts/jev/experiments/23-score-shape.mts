#!/usr/bin/env tsx
/**
 * How often is a rubric answer BIMODAL rather than moderate?
 *
 * `score` returns an expected value, and the engine interpolates it onto a
 * ladder. Two very different answers produce the same number:
 *
 *   all the mass on rung 2          modestly rounded
 *   half on rung 0, half on rung 4  square OR pill-shaped, and certainly not
 *                                   the thing halfway between them
 *
 * The SDK returns `probabilities` keyed by rung for `score` as well as for
 * `choice` — verified in the type declarations — and production's `flatten()`
 * keeps only `score`. So this is information already paid for and discarded,
 * and the question is whether discarding it ever costs anything.
 *
 * This measures ONLY frequency. Rendering comparisons come after, and only if
 * the shape turns up often enough to be worth the machinery. The threshold was
 * set before running: under 5% of answers and the idea is not worth pursuing.
 *
 * A candidate is defined before looking at any data:
 *   two peaks at least TWO rungs apart,
 *   each carrying at least 0.25,
 *   with the rungs between them carrying at most 0.10 in total.
 *
 * RESULT: 20 of 520 answers, 3.8%. Below the threshold, so the idea is
 * deprioritised — no mode-selection machinery is being built.
 *
 * The shape is real where it occurs and it concentrates: `bodyTracking` 5,
 * `speed` 4, `chroma` 4, `textSize` 4, and nothing else above 2. `A vinyl
 * record sleeve from 1973` answers speed 0.41 at rung 0 and 0.49 at rung 3 —
 * either nothing moves or it moves slowly and deliberately — and interpolation
 * hands it 1.65, a middling transition neither peak asked for. So the cost is
 * genuine; it is just rare.
 *
 * The script also prints a looser shape at 37.9%, and that number should NOT be
 * used to rescue this. It fires on ordinary spread across three adjacent rungs,
 * which is what a well-behaved rubric answer looks like, not on the disjunction
 * this idea is about. It is printed for context and it is not evidence.
 */
import { TypeSafeClient } from "@typesafe-ai/sdk"
import { stageOne } from "@/design/jev/generate"

const prod = stageOne as unknown as Record<string, { type: string }>
/** Every rubric the brief alone answers. */
const AXES = Object.keys(prod).filter((k) => prod[k].type === "score")

/** Forty briefs used by no benchmark case and no earlier experiment. */
const BRIEFS = [
  "A Swiss railway timetable",
  "A vinyl record sleeve from 1973",
  "An operating theatre",
  "A ransom note cut from magazines",
  "The dashboard of a 1960s Citroën",
  "A seed catalogue",
  "A Soviet space program control panel",
  "An origami crane",
  "A neon-lit ramen bar at midnight",
  "A wedding invitation, letterpressed",
  "A hospital triage board",
  "A skate deck graphic",
  "An illuminated medieval manuscript",
  "A power station turbine hall",
  "A children's pop-up book",
  "A tax form",
  "A jazz club poster, 1958",
  "An aircraft cockpit at night",
  "A perfume advertisement",
  "A weather station readout",
  "A brutalist car park",
  "A tide chart",
  "A sushi counter",
  "A telephone exchange switchboard",
  "A botanical illustration",
  "An arcade high score table",
  "A courtroom transcript",
  "A greenhouse in winter",
  "A submarine sonar station",
  "A luxury hotel key card",
  "A kindergarten classroom wall",
  "A seismograph trace",
  "A bank vault door",
  "A surf shop in Byron Bay",
  "A war memorial",
  "A chemistry set from 1962",
  "A rave flyer, Berlin",
  "A lighthouse keeper's log",
  "An ant colony seen through glass",
  "A mid-century modern living room",
]

const client = new TypeSafeClient({ timeout: 30000 })

/** Two separated peaks with a quiet valley between them. */
const PEAK_MIN = 0.25
const VALLEY_MAX = 0.1
const GAP_MIN = 2

function bimodal(p: Record<string, number>) {
  const rungs = Object.keys(p).map(Number).sort((a, b) => a - b)
  const peaks = rungs.filter((r) => p[String(r)] >= PEAK_MIN)
  for (let i = 0; i < peaks.length; i++) {
    for (let j = i + 1; j < peaks.length; j++) {
      if (peaks[j] - peaks[i] < GAP_MIN) continue
      const valley = rungs
        .filter((r) => r > peaks[i] && r < peaks[j])
        .reduce((s, r) => s + p[String(r)], 0)
      if (valley <= VALLEY_MAX) return { lo: peaks[i], hi: peaks[j], valley }
    }
  }
  return null
}

const results = await Promise.all(
  BRIEFS.map(async (brief) => {
    const res = await client.systemOne({
      state: { style_brief: brief },
      questions: Object.fromEntries(AXES.map((k) => [k, prod[k]])) as never,
    })
    const a = res.answers as Record<string, never>
    return AXES.map((axis) => {
      const r = a[axis] as unknown as {
        score: number
        confidence: number
        probabilities: Record<string, number>
      }
      return { brief, axis, score: r.score, conf: r.confidence, probabilities: r.probabilities, shape: bimodal(r.probabilities) }
    })
  })
)

const all = results.flat()
const hits = all.filter((r) => r.shape)
const pct = (hits.length / all.length) * 100

console.log(`${AXES.length} rubrics × ${BRIEFS.length} briefs = ${all.length} answers\n`)
console.log(`bimodal by the pre-declared definition: ${hits.length} (${pct.toFixed(1)}%)`)
console.log(`threshold set before running: below 5% → deprioritise\n`)

if (hits.length) {
  console.log("── every candidate, with what interpolation does to it ──")
  console.table(
    hits
      .sort((x, y) => y.shape!.hi - y.shape!.lo - (x.shape!.hi - x.shape!.lo))
      .slice(0, 25)
      .map((h) => ({
        brief: h.brief.slice(0, 30),
        axis: h.axis,
        peaks: `${h.shape!.lo} & ${h.shape!.hi}`,
        mass: `${h.probabilities[String(h.shape!.lo)].toFixed(2)} / ${h.probabilities[String(h.shape!.hi)].toFixed(2)}`,
        valley: h.shape!.valley.toFixed(2),
        expected: h.score.toFixed(2),
        conf: h.conf.toFixed(2),
      }))
  )
  const byAxis: Record<string, number> = {}
  for (const h of hits) byAxis[h.axis] = (byAxis[h.axis] ?? 0) + 1
  console.log("\nby axis:", Object.entries(byAxis).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join("  "))
}

/* A weaker shape, reported separately so the strict number stays honest: the
   expected value lands far from ANY rung carrying real mass. */
const stranded = all.filter((r) => {
  const near = Object.entries(r.probabilities).filter(([k]) => Math.abs(Number(k) - r.score) < 0.5)
  return near.reduce((s, [, p]) => s + p, 0) < 0.35
})
console.log(
  `\nweaker shape — expected value sits where little mass is (<0.35 within half a rung): ` +
    `${stranded.length} (${((stranded.length / all.length) * 100).toFixed(1)}%)\n` +
    `  NOT evidence for this idea: it fires on ordinary spread over three adjacent rungs.`
)
