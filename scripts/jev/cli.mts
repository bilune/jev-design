#!/usr/bin/env tsx
/**
 * node --env-file=.env.jev npx tsx scripts/jev/cli.ts "<brief>" [--critique] [--apply]
 *
 * `--apply` writes the config to `src/design/generated.json`, which the design
 * panel offers as a preset. Everything else prints.
 */
import { writeFileSync } from "node:fs"
import { generateDesign } from "@/design/jev/generate"
import { reachableStyles } from "@/design/jev/catalog"

const args = process.argv.slice(2)
const brief = args.find((a) => !a.startsWith("--"))
if (!brief) {
  console.error('usage: npx tsx scripts/jev/cli.ts "<brief>" [--critique] [--apply]')
  process.exit(1)
}

const r = await generateDesign(brief, { critique: args.includes("--critique") })

if (args.includes("--apply")) {
  writeFileSync("src/design/generated.json", JSON.stringify({ brief, ...r.config }, null, 2))
  console.error("→ written to src/design/generated.json")
}

console.log(JSON.stringify(r.config, null, 2))
console.error(
  `\n${r.usage.calls} calls · ${r.usage.ms}ms · ${r.usage.inputTokens} in tok · ` +
    `USD ${r.usage.usd.toFixed(6)}` +
    (r.critique ? ` · coherent ${r.critique.coherent} · matches ${r.critique.matchesBrief}` : "")
)
console.error(`catalog reach: ${reachableStyles.toLocaleString("en-US")} palette/face/depth combinations before the ladders`)
console.error(`picks: ${JSON.stringify(Object.fromEntries(Object.entries(r.answers).map(([k, v]) => [k, typeof v === "number" ? Number(v.toFixed(2)) : v])))}`)
