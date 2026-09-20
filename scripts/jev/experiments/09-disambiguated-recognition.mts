#!/usr/bin/env tsx
/**
 * Does telling the recognition pass that the token is a company change what it
 * believes it knows?
 *
 * An earlier experiment added the category to the brief that reaches stage one,
 * and it barely moved. This is a different place to put it: if the pass is told
 * up front that `Linear` means the company, its own `appearanceKnown`,
 * `brandColour` and `interfaceIsDark` answers might change — and those are what
 * stage one is then handed.
 */
import { TypeSafeClient } from "@typesafe-ai/sdk"

import { recognise } from "@/design/jev/recognise"

const NAMES = ["Linear", "Vercel", "Slack", "Notion", "Stripe", "Figma", "Spotify"]
const FRAMES: [label: string, wrap: (n: string) => string][] = [
  ["bare", (n) => n],
  ["the company", (n) => `${n}, the company`],
  ["not the word", (n) => `${n} — the software company and its product, not the ordinary English word`],
  ["its interface", (n) => `the user interface of ${n}, the software product`],
]

const client = new TypeSafeClient({ timeout: 60000 })

console.log(`${"brand".padEnd(9)} ${"framing".padEnd(14)} product  knows  dark   colour     character`)
console.log("─".repeat(74))
for (const name of NAMES) {
  for (const [label, wrap] of FRAMES) {
    const { result: r } = await recognise(client, wrap(name))
    console.log(
      `${name.padEnd(9)} ${label.padEnd(14)} ${r.namesAProduct.toFixed(2)}     ` +
        `${r.appearanceKnown.toFixed(2)}   ${r.interfaceIsDark.toFixed(2)}   ` +
        `${r.brandColour.padEnd(10)} ${r.character}`
    )
  }
  console.log()
}
