#!/usr/bin/env tsx
/** Where does green sit for a command-centre screen? */
import { TypeSafeClient } from "@typesafe-ai/sdk"
import { stageOne } from "@/design/jev/generate"

const client = new TypeSafeClient({ timeout: 60000 })
const BRIEFS = [
  "A situation room: banks of monitors, degraded feeds",
  "A 1980s NORAD war room screen",
  "A phosphor monitor from a 1970s mainframe",
  "An oscilloscope trace",
  "A night vision display",
]
for (const brief of BRIEFS) {
  const r = await client.systemOne({ state: { style_brief: brief }, questions: { hue: stageOne.hue } })
  const top = Object.entries(r.answers.hue.probabilities).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const green = (r.answers.hue.probabilities as Record<string, number>).green ?? 0
  console.log(
    `${brief.slice(0, 44).padEnd(44)} ${top.map(([k, v]) => `${k} ${v.toFixed(2)}`).join("  ")}   | green ${green.toFixed(3)}`
  )
}
