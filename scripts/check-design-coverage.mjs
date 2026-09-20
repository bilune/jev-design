#!/usr/bin/env node
/**
 * Build gate: every slot a component declares must be governed by a family or
 * carry an explicit disposition.
 *
 * It fails on:
 *   - a NEW unclassified slot (the orphan component),
 *   - a family rule targeting a slot no component declares (a stale selector),
 *   - a disposition for a slot that no longer exists,
 *   - an alias pointing at a contract that is not governed.
 *
 * Slots parked as `unresolved` are existing, deliberately visible debt: they
 * are reported but do not fail the build, so the gate can go in before the
 * backlog is finished.
 */

import { declaredSlots, governedSlots, referencedSlots, dispositions } from "./design-registry.mjs"

const declared = declaredSlots()
const governed = governedSlots()
const referenced = referencedSlots()
const registry = dispositions().slots

const VALID = new Set(["structural", "alias", "adapter", "shape-exception", "unresolved"])

const errors = []
const warnings = []
const registryDoc = dispositions()

/* 1. Coverage: declared but neither governed nor dispositioned. */
for (const slot of declared.keys()) {
  if (governed.has(slot)) continue
  const entry = registry[slot]
  if (!entry) {
    errors.push(
      `unclassified slot "${slot}" (declared in ${[...declared.get(slot)].join(", ")})\n` +
        `    → enroll it in a family in src/design/families.css, or give it a disposition in src/design/dispositions.json`
    )
    continue
  }
  if (!VALID.has(entry.disposition)) {
    errors.push(`slot "${slot}" has unknown disposition "${entry.disposition}"`)
  }
  if (entry.disposition === "unresolved") warnings.push(slot)
}

/* 2. Stale selectors: a family targets a slot nothing declares. */
for (const slot of referenced) {
  if (!declared.has(slot)) {
    errors.push(
      `family CSS references "${slot}", which no component declares\n` +
        `    → the selector is dead; remove it or fix the name`
    )
  }
}

/* 2b. A family cannot govern a slot no component declares. */
for (const slot of governed.keys()) {
  if (!declared.has(slot)) {
    errors.push(
      `family CSS governs "${slot}", which no component declares\n` +
        `    → the rule is dead; remove it or fix the name`
    )
  }
}

/* 3. Stale dispositions: registry entries for slots that no longer exist. */
for (const slot of Object.keys(registry)) {
  if (!declared.has(slot)) {
    errors.push(`disposition for "${slot}", which no component declares — remove the entry`)
  } else if (governed.has(slot)) {
    errors.push(
      `slot "${slot}" is both governed by a family and listed in dispositions.json — remove the entry`
    )
  }
}

/* 4. An alias must name a contract, and that contract must exist. */
const families = new Set([...governed.values()].flatMap((set) => [...set].flatMap((f) => f.split("+"))))
for (const [slot, entry] of Object.entries(registry)) {
  if (entry.disposition !== "alias") continue
  if (!entry.of) {
    errors.push(`slot "${slot}" is an alias with no "of" — name the contract it is painted by`)
  } else if (!families.has(entry.of)) {
    errors.push(`slot "${slot}" aliases "${entry.of}", which is not a known family`)
  }
}

/* 5. An adapter must say who treats it, so the claim can be checked. */
for (const [slot, entry] of Object.entries(registry)) {
  if (entry.disposition === "adapter" && !entry.owner) {
    errors.push(`slot "${slot}" is an adapter with no "owner" — name the file that treats it`)
  }
}

/* 6. Debt is held to a recorded set, so a new entry cannot hide among the old.
      Lowering the ceiling alone would let one slot be resolved and another
      added in the same change without anyone noticing. */
const recorded = new Set(registryDoc.unresolvedSlots ?? [])
const added = warnings.filter((slot) => !recorded.has(slot))
if (added.length) {
  errors.push(
    `${added.length} slot(s) newly parked as unresolved: ${added.join(", ")}\n` +
      `    → give them a real disposition, or enroll them in a family\n` +
      `    → if the debt is genuinely accepted, add them to "unresolvedSlots"`
  )
}
// A ratchet, not a ceiling: once a slot is resolved it leaves the list, so it
// cannot quietly slide back into debt later.
const staleDebt = [...recorded].filter((slot) => !warnings.includes(slot))
if (staleDebt.length) {
  errors.push(
    `${staleDebt.length} slot(s) are recorded as unresolved but no longer are: ` +
      `${staleDebt.join(", ")}\n` +
      `    → remove them from "unresolvedSlots" so the debt cannot come back unnoticed`
  )
}

/* ── Report ──────────────────────────────────────────────────────────────── */

const pad = (n) => String(n).padStart(3)
console.log("Design coverage")
console.log(`  ${pad(declared.size)} slots declared by components`)
console.log(`  ${pad(governed.size)} governed by a family`)
console.log(`  ${pad(Object.keys(registry).length)} with an explicit disposition`)
console.log(
  `  ${pad(warnings.length)} parked as unresolved (recorded ${(registryDoc.unresolvedSlots ?? []).length})`
)
if (process.env.DESIGN_VERBOSE) console.log(`\n  unresolved: ${warnings.join(", ")}`)

if (errors.length) {
  console.error(`\n✗ ${errors.length} problem(s):\n`)
  for (const e of errors) console.error(`  • ${e}`)
  console.error("")
  process.exit(1)
}
console.log("\n✓ every slot is accounted for")
