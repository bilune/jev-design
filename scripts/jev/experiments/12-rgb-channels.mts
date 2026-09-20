#!/usr/bin/env tsx
/**
 * Can Jev pick a colour channel by channel?
 *
 * Three questions, one per channel, instead of a hue family plus a chroma rung.
 * Two shapes are tried, because the obvious one is the one the model is
 * documented to be worst at:
 *
 *   choice  255 bare integers per channel. No descriptions, and the docs say
 *           Jev reads numbers as text and cannot judge numeric proximity.
 *           (256 would be one over the API's hard limit of 255 choices.)
 *   score   a described ladder per channel, whose expected value interpolates —
 *           continuous output from five rungs, the same trick the rest of the
 *           engine uses.
 *
 * Scored against what the colour should obviously be.
 */
import { TypeSafeClient, choice, score } from "@typesafe-ai/sdk"

const client = new TypeSafeClient({ timeout: 60000 })

const CHANNELS = ["red", "green", "blue"] as const
const asChoice = Object.fromEntries(
  CHANNELS.map((c) => [
    c,
    choice(
      `How much ${c} is in this colour, from 0 to 255?`,
      Object.fromEntries(Array.from({ length: 255 }, (_, i) => [String(i), null]))
    ),
  ])
)
const asScore = Object.fromEntries(
  CHANNELS.map((c) => [
    c,
    score(`How much ${c} is in this colour?`, [
      `None at all. The colour contains no ${c}.`,
      `A little ${c}.`,
      `A moderate amount of ${c}.`,
      `A lot of ${c}.`,
      `As much ${c} as possible.`,
    ]),
  ])
)

const CASES: [brief: string, expect: string][] = [
  ["the accent colour of a 1980s amber phosphor terminal", "amber: high red, mid green, no blue"],
  ["the green of the Spotify logo", "green: low red, high green, low blue"],
  ["Slack's aubergine sidebar", "dark purple: mid red, low green, mid blue"],
  ["the red of a fire engine", "red: max red, no green, no blue"],
  ["the blue of a clear sky at noon", "sky blue: mid red, high green, max blue"],
]

const hex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")

console.log(`${"brief".padEnd(48)} ${"choice/255".padEnd(26)} ${"score ladder".padEnd(26)} expected`)
console.log("─".repeat(130))
for (const [brief, expect] of CASES) {
  const [c, s] = await Promise.all([
    client.systemOne({ state: { colour: brief }, questions: asChoice as never }),
    client.systemOne({ state: { colour: brief }, questions: asScore as never }),
  ])
  const cv = CHANNELS.map((k) => Number((c.answers as Record<string, {choice: string}>)[k].choice))
  const sv = CHANNELS.map((k) => ((s.answers as Record<string, {score: number}>)[k].score / 4) * 255)
  const conf = CHANNELS.map((k) => (c.answers as Record<string, {confidence: number}>)[k].confidence)
  console.log(
    `${brief.slice(0, 48).padEnd(48)} ` +
      `${`${hex(cv[0], cv[1], cv[2])} ${cv.join(",")} c${(conf.reduce((a: number, b: number) => a + b, 0) / 3).toFixed(2)}`.padEnd(26)} ` +
      `${`${hex(sv[0], sv[1], sv[2])} ${sv.map(Math.round).join(",")}`.padEnd(26)} ${expect}`
  )
}
