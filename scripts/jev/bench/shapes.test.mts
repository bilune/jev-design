#!/usr/bin/env tsx
/**
 * The ablation helpers, against one question of every primitive.
 *
 * `flattenCriteria` handled choice and score and fell through to score for
 * anything else, so the first `noul` added to the question set crashed the
 * whole benchmark — in a stack trace that named neither the question nor the
 * primitive. A helper that walks a shape needs a fixture for every shape it
 * can be handed, and this is cheaper than finding out from a run.
 */
import { choice, noul, score } from "@typesafe-ai/sdk"
import { flattenCriteria, dropField } from "./variants"

const FIXTURE = {
  aChoice: choice(
    { question: "q", when_the_brief_is_silent: "choose the convention" },
    {
      a: { is: "A", this_is_the_convention: "pick this" },
      b: { is: "B", pick_when: "otherwise" },
      c: { is: "C" },
    } as never
  ),
  aScore: score("q", [
    { summary: "low", signals: "a, b" },
    { summary: "high", signals: "c, d" },
  ] as never),
  aNoul: noul("q", { true: "yes", false: "no" }),
  aBareNoul: noul("q"),
}

let failed = 0
const ok = (name: string, cond: boolean) => {
  console.log(`${cond ? "OK  " : "FAIL"} ${name}`)
  if (!cond) failed++
}

for (const [name, q] of Object.entries(FIXTURE)) {
  try {
    const flat = flattenCriteria(q) as { type: string }
    ok(`flattenCriteria keeps the primitive of ${name}`, flat.type === (q as { type: string }).type)
  } catch (e) {
    ok(`flattenCriteria survives ${name} — ${String(e).slice(0, 60)}`, false)
  }
  try {
    const dropped = dropField(q, "this_is_the_convention") as { type: string }
    ok(`dropField keeps the primitive of ${name}`, dropped.type === (q as { type: string }).type)
  } catch (e) {
    ok(`dropField survives ${name} — ${String(e).slice(0, 60)}`, false)
  }
}

/* The properties the ablations depend on, each of which regressed once.
 *
 * Compared against the WHOLE expected transformation rather than one criterion:
 * checking only that the untouched option survived would pass a helper that
 * dropped the instruction and kept the mark, which is the opposite of the fix. */
const dropped = dropField(FIXTURE.aChoice, "this_is_the_convention") as {
  criteria: Record<string, unknown>
  instructions: unknown
}
ok(
  "dropField transforms a choice exactly",
  JSON.stringify({ instructions: dropped.instructions, criteria: dropped.criteria }) ===
    JSON.stringify({
      /* An object, not the bare string: the instruction's SHAPE is preserved
         exactly as the criteria's is, and only the sentence naming the removed
         mark goes with it. */
      instructions: { question: "q" },
      criteria: { a: { is: "A" }, b: { is: "B", pick_when: "otherwise" }, c: { is: "C" } },
    })
)
ok("dropField removes the field from the criterion that HAD it", !("this_is_the_convention" in (dropped.criteria.a as object)))
ok("dropField does not collapse a one-field criterion", typeof dropped.criteria.c === "object")
/* Removal on a rubric, which the fixture exercised for survival only. */
const droppedScore = dropField(FIXTURE.aScore, "signals") as { criteria: unknown[] }
ok(
  "dropField removes signals from every rung",
  JSON.stringify(droppedScore.criteria) === JSON.stringify([{ summary: "low" }, { summary: "high" }])
)
ok("dropField is a no-op for an absent field", JSON.stringify(dropField(FIXTURE.aScore, "nope")) === JSON.stringify(FIXTURE.aScore))

console.log(failed ? `\n✗ ${failed} failed` : "\n✓ every primitive survives both ablation helpers")
process.exit(failed ? 1 : 0)
