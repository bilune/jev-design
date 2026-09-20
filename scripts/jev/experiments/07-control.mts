#!/usr/bin/env tsx
/**
 * The control.
 *
 * Every brand the name alone gets wrong lands on roughly the same answer: a
 * white page, a blue-ish accent, moderate rounding, ordinary density. If made-up
 * company names land there too, that answer is not knowledge of any brand — it
 * is the model's picture of "a piece of software", returned whenever the brief
 * identifies nothing it recognises.
 */
import { generateDesign } from "@/design/jev/generate"

const PROBES = [
  "Zorblax", "Quintara", "Flembic", "Andromeda Systems", "Palvex",
  "a software product", "an app", "Linear", "Vercel", "Slack",
]

console.log(`${"brief".padEnd(20)} ${"canvas".padEnd(8)} ${"hue".padEnd(9)} chroma round density      body`)
console.log("─".repeat(72))
for (const brief of PROBES) {
  const { answers: a } = await generateDesign(brief)
  console.log(
    `${brief.padEnd(20)} ${String(a.canvas).padEnd(8)} ${String(a.hue).padEnd(9)} ` +
      `${Number(a.chroma).toFixed(1).padEnd(6)} ${Number(a.roundness).toFixed(1).padEnd(5)} ` +
      `${String(a.density).padEnd(12)} ${a.bodyFace}`
  )
}
