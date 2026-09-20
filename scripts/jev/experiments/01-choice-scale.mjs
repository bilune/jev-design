// How many labels can a `choice` carry before it stops discriminating?
// Build catalogs of growing size containing one clearly-correct entry plus
// plausible distractors, and see whether the right one still wins.
import { TypeSafeClient, choice } from "@typesafe-ai/sdk"
const c = new TypeSafeClient({ timeout: 60000 })

const HUES = ["red","orange","amber","yellow","lime","green","emerald","teal","cyan","sky","blue","indigo","violet","purple","fuchsia","pink","rose","stone","slate","zinc"]
const TONES = ["muted","vivid","pastel","deep","washed","neon","dusty","ink"]
const SURF = ["on paper","on charcoal","on bone","on midnight","on sand","on graphite"]

// A big catalog of palette names with descriptions. One is the plant.
function catalog(n, plantKey, plantDesc) {
  const out = {}
  let i = 0
  outer: for (const t of TONES) for (const h of HUES) for (const s of SURF) {
    if (i >= n - 1) break outer
    out[`${t}-${h}-${s.replace(/ /g,"-")}`] = `A ${t} ${h} accent ${s}.`
    i++
  }
  out[plantKey] = plantDesc
  return out
}

const brief = "1980s amber phosphor terminal: dark screen, glowing amber text, nothing else"
const plantKey = "phosphor-amber-on-midnight"
const plantDesc = "A glowing amber accent on a near-black screen, like a CRT phosphor terminal."

for (const n of [8, 25, 60, 120, 250, 500]) {
  const crit = catalog(n, plantKey, plantDesc)
  const keys = Object.keys(crit)
  const t0 = Date.now()
  try {
    const r = await c.systemOne({
      state: { style_brief: brief },
      questions: { palette: choice("Which palette is this style drawn in?", crit) },
    })
    const a = r.answers.palette
    const sorted = Object.entries(a.probabilities).sort((x,y)=>y[1]-x[1]).slice(0,3)
    console.log(
      `n=${String(keys.length).padStart(3)} ${Date.now()-t0}ms ${String(r.usage.input_tokens).padStart(6)}tok  ` +
      `pick=${a.choice === plantKey ? "HIT " : "MISS"} conf=${a.confidence.toFixed(3)}  ` +
      `top3=${sorted.map(([k,v])=>`${k}:${v.toFixed(3)}`).join(" ")}`
    )
  } catch (e) { console.log(`n=${keys.length} ERROR ${e.constructor.name}: ${String(e.message).slice(0,120)}`) }
}
