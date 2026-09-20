// Flat catalog vs factored axes.
//
// CORRECTION, added after review. This is NOT an equal-outcome-space
// comparison and the conclusion drawn from it was overstated. The `i % 4`
// stride over a product whose innermost dimension has six surfaces lands on
// surface indices 0, 4 and 2 only, so `flat250` is 240 options made of
// {paper: 80, sand: 80, bone: 80} and contains no dark canvas at all. The flat
// variant could not answer "dark canvas" for the terminal or the reactor, so
// those failures cannot show that probability splitting caused light canvases.
//
// The cost and confidence observations stand; the causal claim does not.
// Experiment 03 shares the sampling pattern and the same caveat applies.
import { TypeSafeClient, choice } from "@typesafe-ai/sdk"
const c = new TypeSafeClient({ timeout: 60000 })
const HUES = ["red","orange","amber","yellow","lime","green","emerald","teal","cyan","sky","blue","indigo","violet","purple","fuchsia","pink","rose","stone","slate","zinc"]
const TONES = ["muted","vivid","pastel","deep","washed","neon","dusty","ink"]
const SURF = ["paper","charcoal","bone","midnight","sand","graphite"]

const flat = {}
for (const t of TONES) for (const h of HUES) for (const s of SURF) flat[`${t}-${h}-on-${s}`] = `A ${t} ${h} accent on ${s}.`
const flat250 = Object.fromEntries(Object.entries(flat).filter((_,i)=>i%4===0).slice(0,250))

const axes = {
  hue: choice("What colour family is the accent?", Object.fromEntries(HUES.map(h=>[h,`The accent is ${h}.`]))),
  tone: choice("How is that colour treated?", Object.fromEntries(TONES.map(t=>[t,`A ${t} treatment of the accent.`]))),
  surface: choice("What is the canvas made of?", Object.fromEntries(SURF.map(s=>[s,`The interface sits on ${s}.`]))),
}

for (const brief of ["1980s amber phosphor terminal","a luxury watch boutique in Geneva","a children's hospital waiting room","a nuclear reactor control room during an alarm"]) {
  const t0 = Date.now()
  const f = await c.systemOne({ state:{style_brief:brief}, questions:{ palette: choice("Which palette is this style drawn in?", flat250) } })
  const tf = Date.now()-t0
  const t1 = Date.now()
  const a = await c.systemOne({ state:{style_brief:brief}, questions: axes })
  const ta = Date.now()-t1
  const A = a.answers
  console.log(`"${brief}"`)
  console.log(`  flat   250 labels · ${tf}ms · ${f.usage.input_tokens}tok → ${f.answers.palette.choice} @ conf ${f.answers.palette.confidence.toFixed(2)}`)
  console.log(`  factor  34 labels · ${ta}ms · ${a.usage.input_tokens}tok → ${A.tone.choice}-${A.hue.choice}-on-${A.surface.choice} @ conf ${A.hue.confidence.toFixed(2)}/${A.tone.confidence.toFixed(2)}/${A.surface.confidence.toFixed(2)}`)
}
