#!/usr/bin/env tsx
/**
 * Both readings in one request.
 *
 * Framing the state as "the user interface of X, the software product" lifts
 * what the pass believes it knows — Linear 0.23 → 0.56, Notion 0.41 → 0.54,
 * Figma 0.45 → 0.58 — and it rescues `namesAProduct` for tokens that are also
 * ordinary words: Linear goes 0.15 → 0.84.
 *
 * But committing to that reading would be a lie for a brief like "concrete
 * brutalism". So instead of choosing a framing, the state carries both: the
 * brief as written, and the product reading offered conditionally. One request,
 * and the pass is still free to say it is not a product.
 */
import { TypeSafeClient } from "@typesafe-ai/sdk"

import { recognition } from "@/design/jev/recognise"

const client = new TypeSafeClient({ timeout: 60000 })

const BARE = (b: string) => ({ brief: b })
const DUAL = (b: string) => ({
  brief: b,
  if_it_names_a_product: `the user interface of ${b}, read as the name of a software product, company or console`,
  note: "The second reading is offered, not asserted. If the brief describes a style rather than naming a product, ignore it.",
})

const SUBJECTS = [
  "Linear", "Vercel", "Slack", "Notion", "Stripe", "Figma", "Spotify", "Windows 95",
  "Zorblax", "Flembic", "Concrete brutalism, square and heavy", "A warm literary reading app",
]

console.log(`${"brief".padEnd(38)} ${"product".padEnd(15)} ${"knows".padEnd(15)} ${"dark".padEnd(15)} colour`)
console.log("─".repeat(100))
for (const b of SUBJECTS) {
  const [bare, dual] = await Promise.all([
    client.systemOne({ state: BARE(b), questions: recognition }),
    client.systemOne({ state: DUAL(b), questions: recognition }),
  ])
  const f = (x: number, y: number) => `${x.toFixed(2)} → ${y.toFixed(2)}`.padEnd(15)
  console.log(
    `${b.padEnd(38)} ${f(bare.answers.namesAProduct.noul, dual.answers.namesAProduct.noul)} ` +
      `${f(bare.answers.appearanceKnown.noul, dual.answers.appearanceKnown.noul)} ` +
      `${f(bare.answers.interfaceIsDark.noul, dual.answers.interfaceIsDark.noul)} ` +
      `${bare.answers.brandColour.choice} → ${dual.answers.brandColour.choice}`
  )
}
