#!/usr/bin/env tsx
/**
 * Does naming the category rescue a brand the name alone gets wrong?
 *
 * Two confounds are tangled in a bare brand name: the model may not know what
 * the product looks like, or it may not know the token is a product at all —
 * "Linear", "Stripe", "Notion" and "Slack" are ordinary English words first.
 * This separates them by adding only the category, never an adjective.
 */
import { generateDesign } from "@/design/jev/generate"

const PROBES: [label: string, brief: string][] = [
  ["Linear", "Linear"],
  ["+ category", "Linear, the software issue tracker"],
  ["Vercel", "Vercel"],
  ["+ category", "Vercel, the developer platform website"],
  ["Slack", "Slack"],
  ["+ category", "Slack, the workplace chat application"],
  ["Stripe", "Stripe"],
  ["+ category", "Stripe, the payments company dashboard"],
  ["Notion", "Notion"],
  ["+ category", "Notion, the note-taking application"],
  ["Figma", "Figma"],
  ["+ category", "Figma, the design tool"],
]

console.log(`${"brief".padEnd(14)} ${"canvas".padEnd(10)} ${"hue".padEnd(9)} chroma  round  density`)
console.log("─".repeat(64))
for (const [label, brief] of PROBES) {
  const { answers: a } = await generateDesign(brief)
  console.log(
    `${label.padEnd(14)} ${String(a.canvas).padEnd(10)} ${String(a.hue).padEnd(9)} ` +
      `${Number(a.chroma).toFixed(1).padEnd(7)} ${Number(a.roundness).toFixed(1).padEnd(6)} ${a.density}`
  )
  if (label === "+ category") console.log()
}
