// Position bias: same 250 options, five different orderings. If the answer
// moves with the order, a big catalog is a lottery and this whole approach dies.
import { TypeSafeClient, choice } from "@typesafe-ai/sdk"
const c = new TypeSafeClient({ timeout: 60000 })
const HUES = ["red","orange","amber","yellow","lime","green","emerald","teal","cyan","sky","blue","indigo","violet","purple","fuchsia","pink","rose","stone","slate","zinc"]
const TONES = ["muted","vivid","pastel","deep","washed","neon","dusty","ink"]
const SURF = ["paper","charcoal","bone","midnight","sand","graphite"]
const all = []
for (const t of TONES) for (const h of HUES) for (const s of SURF) all.push([`${t}-${h}-on-${s}`, `A ${t} ${h} accent on ${s}.`])
// 960 combos; sample a fixed 250 so every ordering holds the same set.
const seedPick = all.filter((_, i) => i % 4 === 0).slice(0, 250)
const rot = (arr, k) => [...arr.slice(k), ...arr.slice(0, k)]
const orders = {
  "as-authored": seedPick,
  "reversed": [...seedPick].reverse(),
  "rotated-125": rot(seedPick, 125),
  "shuffled-a": [...seedPick].sort((a,b)=> a[0].length - b[0].length || a[0].localeCompare(b[0])),
  "shuffled-b": [...seedPick].sort((a,b)=> b[0].localeCompare(a[0])),
}
for (const brief of ["1980s amber phosphor terminal", "a luxury watch boutique in Geneva", "a children's hospital waiting room"]) {
  console.log(`\n"${brief}"`)
  for (const [name, entries] of Object.entries(orders)) {
    const r = await c.systemOne({ state: { style_brief: brief }, questions: { palette: choice("Which palette is this style drawn in?", Object.fromEntries(entries)) } })
    const top = Object.entries(r.answers.palette.probabilities).sort((a,b)=>b[1]-a[1]).slice(0,3)
    const pos = entries.findIndex(([k]) => k === r.answers.palette.choice)
    console.log(`  ${name.padEnd(13)} pick=${r.answers.palette.choice.padEnd(26)} at idx ${String(pos).padStart(3)}  conf=${r.answers.palette.confidence.toFixed(2)}  top3=${top.map(([k,v])=>v.toFixed(2)).join("/")}`)
  }
}
