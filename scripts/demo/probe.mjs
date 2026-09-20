const briefs = process.argv.slice(2)
const keys = ["canvas","accent","ink","edge","radiusControl","borderWidth","fontSizeBase","surfaceTint"]
const fkeys = ["mode","borders","surface","cornerStyle","labelCase","pageTexture","surfaceFinish","iconFamily","density","ruleStyle","ambient","signal","chartFill"]
for (const b of briefs) {
  const t0 = Date.now()
  const r = await fetch("http://localhost:3000/api/design/generate", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ brief: b }),
  })
  const j = await r.json()
  const wall = Date.now() - t0
  if (!r.ok) { console.log(b, "ERROR", j); continue }
  const s = Object.fromEntries(keys.map(k => [k, j.config.scalars[k]]))
  const f = Object.fromEntries(fkeys.map(k => [k, j.config.flags[k]]))
  console.log("\n### " + b)
  console.log(`wall ${wall}ms · engine ${j.usage.ms}ms · calls ${j.usage.calls} · usd ${j.usage.usd.toFixed(5)} · onBrief ${j.critique ? Math.round(j.critique.matchesBrief*100) : "?"}%`)
  console.log(JSON.stringify(s))
  console.log(JSON.stringify(f))
}
