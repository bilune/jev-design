#!/usr/bin/env tsx
/** How concentrated is the hue answer, really? */
import { TypeSafeClient } from "@typesafe-ai/sdk"
import { stageOne, meanHue } from "@/design/jev/generate"
import { hues, type HueKey } from "@/design/jev/catalog"

const client = new TypeSafeClient({ timeout: 60000 })
const BRIEFS = [
  "A luxury Swiss watch boutique, gold on near-black",
  "A children's vaccination clinic, friendly and soft",
  "A tropical fruit market",
  "Deep sea bioluminescence",
  "Autumn in a beech forest",
  "A hospital triage board",
]
for (const brief of BRIEFS) {
  const r = await client.systemOne({ state: { style_brief: brief }, questions: { hue: stageOne.hue } })
  const a = r.answers.hue
  const top = Object.entries(a.probabilities).sort((x, y) => y[1] - x[1]).slice(0, 4)
  const snapped = hues[a.choice as HueKey].angle
  const mean = meanHue(a.probabilities as Record<string, number>, a.choice as HueKey)
  console.log(
    `${brief.slice(0, 42).padEnd(42)} snap ${String(snapped).padStart(3)}°  mean ${String(mean).padStart(3)}°  ` +
      `shift ${String(Math.abs(mean - snapped)).padStart(2)}°  ${top.map(([k, v]) => `${k} ${v.toFixed(2)}`).join("  ")}`
  )
}
