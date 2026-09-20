# Sweeping the whole style space

Every style in this project has been checked one at a time, from a brief. That
tests what the model chooses, not what the engine can survive: the flags alone
now make **1,128,701,952,000,000** combinations, and the continuous scalars are on
top of that.

This is the harness for sweeping it. Paste it into the console of the running
console in development, where `window.applyDesignConfig` and `window.designAudit`
are exposed.

```js
const FLAGS = /* paste from: node scripts/jev/flag-space.mjs */
const BASE = await fetch("/api/design/generate", {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ brief: "An ordinary operations dashboard" }),
}).then((r) => r.json()).then((r) => r.config)

const pick = (a) => a[Math.floor(Math.random() * a.length)]
const R = (lo, hi) => lo + Math.random() * (hi - lo)
const plain = (x) => Object.fromEntries(Object.entries(x).filter(([, v]) => typeof v !== "object"))

let clean = 0, transient = 0
const real = []
for (let i = 0; i < 40; i++) {
  const flags = {}
  for (const [k, v] of Object.entries(FLAGS)) flags[k] = pick(v)
  const scalars = { ...BASE.scalars,
    radiusControl: R(0, 1.4).toFixed(3) + "rem", radiusSurface: R(0, 1.8).toFixed(3) + "rem",
    borderWidth: R(1, 4).toFixed(2) + "px", padSurface: R(0.5, 3.5).toFixed(2) + "rem",
    gapSection: R(0.5, 3.5).toFixed(2) + "rem", gapStack: R(0.25, 2).toFixed(2) + "rem",
    gapInline: R(0.2, 1.4).toFixed(2) + "rem", controlHeight: R(1.75, 3.6).toFixed(2) + "rem",
    controlPadX: R(0.4, 1.8).toFixed(2) + "rem", fontSizeBase: R(0.75, 1.2).toFixed(3) + "rem",
    fontScale: R(0.9, 1.25).toFixed(3), trackingBody: R(0, 0.06).toFixed(3) + "em",
    trackingLabel: R(0, 0.18).toFixed(3) + "em" }

  window.applyDesignConfig({ scalars, flags })
  // Charts re-measure asynchronously. Judging before they have settles the
  // audit against the PREVIOUS config's width, and the first version of this
  // sweep reported three faults that all evaporated on a second look.
  await new Promise((r) => setTimeout(r, 900))
  await window.designAudit()
  let issues = (window.designIssues() ?? []).map(plain)

  if (issues.length) {
    await new Promise((r) => setTimeout(r, 900))
    await window.designAudit()
    issues = (window.designIssues() ?? []).map(plain)
    if (!issues.length) { transient++; continue }
    real.push({ i, msgs: issues.map((x) => x.message), scalars, flags })
    continue
  }
  const doc = document.documentElement
  if (doc.scrollWidth > doc.clientWidth + 1) real.push({ i, msgs: ["horizontal scroll"], scalars, flags })
  else clean++
}
console.log({ ran: 40, clean, transient, real })
```

## What it found

**35 of 40 clean, 0 transient, 5 real** — every one of them the same shape:

```
card-header — 273px of content in 269px, and it neither scrolls nor clips
card-header — 300px of content in 281px
card-header — 315px of content in 289px
```

Between 2 and 26 pixels, always on a headline figure's header, always with a
base text size above roughly 1.05rem. **Not reproduced in isolation**: setting
those scalars with the base flags does not trigger it, so some flag combination
is part of the cause and I did not isolate which. It is recorded here rather
than fixed, because a fix nobody has reproduced is a guess with a commit
message.

## What it cost to trust the number

The first sweep reported 3 of 30 failing and every one was the harness's fault.
Recharts measures its container asynchronously; the audit ran 320ms after the
config changed, while the chart still held the previous width, and reported
`card-content — 713px of content in 696px`. Re-applying the identical config
afterwards gave zero.

A stress test that produces false positives is worse than none, because the real
findings are then indistinguishable from the noise. Hence the settle, and hence
confirming every failure on a second pass before it counts.
