// Two harder questions:
//  1. Is a big catalog matched semantically, or is it keyword overlap?
//  2. How much total catalog fits in one request?
import { TypeSafeClient, choice } from "@typesafe-ai/sdk"
const c = new TypeSafeClient({ timeout: 60000 })

const HUES = ["red","orange","amber","yellow","lime","green","emerald","teal","cyan","sky","blue","indigo","violet","purple","fuchsia","pink","rose","stone","slate","zinc"]
const TONES = ["muted","vivid","pastel","deep","washed","neon","dusty","ink"]
const SURF = ["paper","charcoal","bone","midnight","sand","graphite"]
function catalog(n) {
  const out = {}; let i = 0
  outer: for (const t of TONES) for (const h of HUES) for (const s of SURF) {
    if (i >= n) break outer
    out[`${t}-${h}-on-${s}`] = `A ${t} ${h} accent on ${s}.`; i++
  }
  return out
}

console.log("── 1. semantic, no lexical overlap with the brief ──")
for (const brief of [
  "the inside of a submarine at depth",
  "a hospital discharge summary printed on a dot matrix",
  "a luxury watch boutique in Geneva",
  "a nuclear reactor control room during an alarm",
]) {
  const crit = catalog(250)
  const r = await c.systemOne({ state: { style_brief: brief }, questions: { palette: choice("Which palette is this style drawn in?", crit) } })
  const top = Object.entries(r.answers.palette.probabilities).sort((a,b)=>b[1]-a[1]).slice(0,4)
  console.log(`  "${brief}"\n    ${top.map(([k,v])=>`${k} ${v.toFixed(2)}`).join("  |  ")}`)
}

console.log("\n── 2. many big catalogs in one request ──")
for (const [nq, nc] of [[5,100],[10,100],[20,100],[25,200],[40,200]]) {
  const qs = {}
  for (let q = 0; q < nq; q++) qs[`q${q}`] = choice(`Decision ${q}: which option fits the style?`, catalog(nc))
  const t0 = Date.now()
  try {
    const r = await c.systemOne({ state: { style_brief: "1980s amber phosphor terminal" }, questions: qs })
    console.log(`  ${nq} questions x ${nc} options = ${nq*nc} labels · ${Date.now()-t0}ms · ${r.usage.input_tokens} in tok`)
  } catch (e) { console.log(`  ${nq} x ${nc} → ${e.constructor.name}: ${String(e.message).slice(0,140)}`) }
}
