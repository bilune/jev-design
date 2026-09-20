#!/usr/bin/env tsx
/**
 * Can the engine tell a style brief from a transplant?
 *
 * The complaint: `Minecraft` returns a green accent (right) on a pure white
 * page (wrong). `Atlassian Jira` returns a blue accent on a pure white page,
 * which is correct — the same answer, right once and wrong once.
 *
 * So the engine is not too timid in general. It is missing the distinction
 * between a brief that describes a piece of business software and one that
 * drags something that is not an interface at all onto a dashboard. The first
 * should inherit interface convention; the second should not.
 *
 * There is no temperature on this model — `SystemOneRequest` takes `state`,
 * `questions` and `model`, and nothing else — and experiment 14 measured that
 * ASKING for boldness moves commitment the wrong way (47% → 36%). So the
 * boldness has to come from which questions get asked, which means something
 * has to decide. This measures whether that decision can be made reliably.
 *
 * Three phrasings, because the wording of a gate has decided its calibration
 * every previous time it was measured.
 */
import { TypeSafeClient, noul, score } from "@typesafe-ai/sdk"

/** true = an interface convention is the right answer; false = a transplant. */
const CASES: [brief: string, conventional: boolean][] = [
  ["Atlassian Jira", true],
  ["Linear", true],
  ["Slack", true],
  ["Stripe", true],
  ["Notion", true],
  ["Asana", true],
  ["GitHub", true],
  ["An ordinary operations dashboard", true],
  ["A modern SaaS analytics product", true],
  ["Bloomberg terminal: maximum information density", true],

  ["Minecraft", false],
  ["Super Mario Bros", false],
  ["A lava lamp", false],
  ["A tropical fruit market", false],
  ["A coral reef", false],
  ["A box of Lego bricks", false],
  ["A 1960s psychedelic concert poster", false],
  ["An 18th century printed book, aged paper", false],
  ["A pinball machine", false],
  ["Deep sea bioluminescence", false],
]

const PHRASINGS = {
  /** The user's own framing: how odd would this be for a dashboard. */
  departure: {
    q: noul(
      "If a working business dashboard actually looked the way this brief describes, would that be a striking departure from what business software normally looks like?",
      {
        true: "It would look unlike business software. The brief describes an object, a place, a material, a game or a world, and carrying it onto a dashboard would be a visible departure.",
        false: "It would be unremarkable. The brief describes business software, or a look that business software already has.",
      }
    ),
    read: (r: { noul: number }) => r.noul,
  },
  /** Names the category instead of the consequence. */
  isSoftware: {
    q: noul(
      "Does this brief describe the look of a piece of business or productivity software, as opposed to the look of something that is not an interface — an object, a place, a material, a game, a period or a work of art?",
      {
        true: "It describes business or productivity software.",
        false: "It describes something that is not an interface of that kind.",
      }
    ),
    read: (r: { noul: number }) => 1 - r.noul,
  },
  /** A rung rather than a boolean. */
  distance: {
    q: score(
      "How far is the look this brief describes from the look of ordinary business software?",
      [
        { summary: "It IS business software, or indistinguishable from it.", signals: "productivity tools, admin panels, dashboards, enterprise products" },
        { summary: "Adjacent. A styled interface, but still plainly an interface.", signals: "a consumer app, a developer tool with a strong house style" },
        { summary: "Clearly not an interface, but a flat and restrained thing.", signals: "print, editorial, signage, a technical drawing" },
        { summary: "Not an interface at all, and vividly coloured or textured.", signals: "a game, a toy, a landscape, a material, a poster, a world" },
      ] as never
    ),
    read: (r: { score: number }) => r.score / 3,
  },
} as const

const client = new TypeSafeClient({ timeout: 30000 })

const rows = await Promise.all(
  CASES.map(async ([brief, conventional]) => {
    const res = await client.systemOne({
      state: { brief },
      questions: Object.fromEntries(Object.entries(PHRASINGS).map(([k, v]) => [k, v.q])) as never,
    })
    const a = res.answers as Record<string, never>
    const out: Record<string, unknown> = { brief, want: conventional ? "convention" : "transplant" }
    for (const [k, v] of Object.entries(PHRASINGS)) {
      out[k] = Number((v.read as (x: never) => number)(a[k]).toFixed(2))
    }
    return out as { brief: string; want: string } & Record<string, number>
  })
)

console.table(rows)

/* A gate is only worth having if one threshold separates the two groups. */
for (const k of Object.keys(PHRASINGS)) {
  const conv = rows.filter((r) => r.want === "convention").map((r) => r[k] as number)
  const trans = rows.filter((r) => r.want === "transplant").map((r) => r[k] as number)
  const best = { t: 0, correct: 0 }
  for (let t = 0; t <= 1.001; t += 0.01) {
    const correct = conv.filter((v) => v < t).length + trans.filter((v) => v >= t).length
    if (correct > best.correct) { best.correct = correct; best.t = Number(t.toFixed(2)) }
  }
  const mean = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length
  console.log(
    `${k.padEnd(11)} convention ${mean(conv).toFixed(2)}  transplant ${mean(trans).toFixed(2)}  ` +
      `gap ${(mean(trans) - mean(conv)).toFixed(2)}  best threshold ${best.t} → ${best.correct}/${rows.length}`
  )
}
