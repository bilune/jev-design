#!/usr/bin/env node
/**
 * Build gate: a selector that targets a slot which can lose its `data-slot`
 * must also target the class that survives.
 *
 * Base UI's `render` prop renders your element and overrides its `data-slot`
 * with its own, so `<TooltipTrigger render={<Badge/>} />` produces a badge
 * whose slot reads `tooltip-trigger`. The `group/badge` class its variants
 * carry exists precisely so it stays addressable — and a rule that names only
 * the slot silently stops matching the moment anyone wraps it.
 *
 * This has now bitten three times. `.group/button` and `.group/badge` were
 * added to the families by hand after the first two; the third was
 * `.group/menu-button`, missing from the `leading-icon` family since it was
 * written, which meant one nav item never obeyed `iconSide` and nobody noticed
 * until an unrelated change made it visible.
 *
 * The lists are hand-written, so they will be wrong again. This makes them
 * wrong loudly.
 */
import { readFileSync } from "node:fs"
import postcss from "postcss"
import selectorParser from "postcss-selector-parser"

import { renderAnchors, renderTargets } from "./render-anchors.mjs"

const SHEETS = ["src/design/families.css", "src/design/system.css", "src/design/compat.css"]
/* Only the slots that are actually wrapped somewhere. A group class on a
   container nobody renders as anything else is a Tailwind group name, not a
   survivor, and demanding it produced 145 findings that were all noise. */
const targets = renderTargets()
const all = renderAnchors()
const anchors = new Map([...all].filter(([slot]) => targets.has(slot)))

const problems = []

for (const file of SHEETS) {
  const root = postcss.parse(readFileSync(file, "utf8"), { from: file })
  root.walkRules((rule) => {
    /* The whole comma-separated list counts as one membership list: a family
       names its members across branches and any of them may carry the class. */
    const slots = new Set()
    const classes = new Set()
    selectorParser((sel) => {
      sel.walkAttributes((attr) => {
        if (attr.attribute === "data-slot" && attr.value) slots.add(attr.value.replace(/^["']|["']$/g, ""))
      })
      sel.walkClasses((cls) => classes.add(cls.value.replace(/\\/g, "")))
    }).processSync(rule.selector)

    for (const slot of slots) {
      for (const group of anchors.get(slot) ?? []) {
        if (classes.has(group)) continue
        problems.push({
          file,
          line: rule.source?.start?.line,
          slot,
          group,
          selector: rule.selector.replace(/\s+/g, " ").slice(0, 110),
        })
      }
    }
  })
}

/* Recorded debt, in the same shape the coverage gate uses: a rule that was
   already like this does not fail the build, but a NEW one does, and a
   recorded entry that has been fixed must be removed so it cannot come back. */
const RECORDED = new Set(
  JSON.parse(readFileSync("src/design/render-anchors.json", "utf8")).accepted
)

const key = (p) => `${p.file}:${p.slot}:${p.group}`
const added = problems.filter((p) => !RECORDED.has(key(p)))
const stale = [...RECORDED].filter((k) => !problems.some((p) => key(p) === k))

console.log("Render anchors")
console.log(`  ${String(anchors.size).padStart(3)} slots are wrapped somewhere and can lose their data-slot`)
console.log(`  ${String(problems.length).padStart(3)} selectors name a slot without its surviving class`)
console.log(`  ${String(RECORDED.size).padStart(3)} accepted`)

if (added.length || stale.length) {
  console.error(`\n✗ ${added.length + stale.length} problem(s):\n`)
  for (const p of added) {
    console.error(`  • ${p.file}:${p.line} targets "${p.slot}" without .${p.group}`)
    console.error(`      ${p.selector}`)
    console.error(`      → add ${p.group} to the member list, or accept it in src/design/render-anchors.json`)
  }
  for (const k of stale) {
    console.error(`  • ${k} is accepted but no longer a problem — remove the entry`)
  }
  console.error("")
  process.exit(1)
}
console.log("\n✓ every rule that names a slot also names what survives it")
