/**
 * Reads the two sources of truth and reports what each one knows.
 *
 *  - The components declare slots (literal `data-slot` and `useRender` state).
 *  - `families.css` governs slots. Only a slot that is the SUBJECT of a rule
 *    inside a block marked `@family <id> subject` counts as governed: a slot
 *    used as an ancestor, a condition or an exclusion is NOT enrolled by that.
 *
 * The build gate consumes this. The dev auditor shares the size scale through
 * `src/design/scale.ts`, but still classifies elements with its own maps.
 */

import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import postcss from "postcss"
import selectorParser from "postcss-selector-parser"

const ROOT = new URL("..", import.meta.url).pathname
const UI_DIR = join(ROOT, "src/components/ui")
const FAMILIES = join(ROOT, "src/design/families.css")

/* ── Declared slots ──────────────────────────────────────────────────────── */

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

export function declaredSlots() {
  const found = new Map() // slot -> Set<file>
  const add = (slot, file) => {
    if (!found.has(slot)) found.set(slot, new Set())
    found.get(slot).add(relative(ROOT, file))
  }

  for (const file of walk(UI_DIR).filter((f) => f.endsWith(".tsx"))) {
    const src = readFileSync(file, "utf8")
    // Literal attribute: data-slot="x"
    for (const m of src.matchAll(/data-slot=["']([a-z0-9-]+)["']/g)) {
      add(m[1], file)
    }
    // Base UI useRender: state: { slot: "x" }
    for (const m of src.matchAll(/\bslot:\s*["']([a-z0-9-]+)["']/g)) {
      add(m[1], file)
    }
  }
  return found
}

/* ── Governed slots ──────────────────────────────────────────────────────── */

/**
 * Which slots a rule actually styles.
 *
 * Uses a real selector parser rather than scanning the string: a hand-written
 * scanner has to track parentheses, brackets and quotes to tell a descendant
 * combinator from a space inside `[data-slot = "x"]`, and every time it missed
 * one it either enrolled the wrong slot or silently enrolled nothing. Both
 * failures are invisible — which is the opposite of what a gate is for.
 *
 * The rules:
 *  - The SUBJECT is the last compound of each selector in the list.
 *  - `:is()` / `:where()` are expanded branch by branch, and each branch is
 *    reduced to its own subject, so `:where([data-slot="a"] [data-slot="b"])`
 *    enrolls only `b`.
 *  - `:not()`, `:has()` and the `of` clause of `:nth-child()` are conditions,
 *    never membership.
 *  - Any attribute selector on `data-slot` this cannot read as a plain equality
 *    throws, so unsupported syntax fails the build instead of passing quietly.
 */
function subjectSlotsOf(selectorAst, out = new Set()) {
  const nodes = selectorAst.nodes ?? []

  // The subject is everything after the last combinator at this level.
  let lastCombinator = -1
  nodes.forEach((node, index) => {
    if (node.type === "combinator") lastCombinator = index
  })
  const subject = nodes.slice(lastCombinator + 1)

  for (const node of subject) {
    if (node.type === "attribute") {
      if (node.attribute !== "data-slot") continue
      // A bare `[data-slot]` is the specificity anchor every family rule ends
      // with, not a membership declaration.
      if (!node.operator && !node.value) continue
      if (node.operator !== "=" || !node.value) {
        throw new Error(
          `families.css: cannot read "${node.toString().trim()}" as a membership declaration.\n` +
            `Only [data-slot="name"] is supported as a subject. Rewrite it, or move ` +
            `the rule out of a @family subject block.`
        )
      }
      out.add(node.value.replace(/^["']|["']$/g, ""))
      continue
    }
    if (node.type === "pseudo") {
      const name = node.value
      // Conditions, not membership.
      if (name === ":not" || name === ":has") continue
      if (name === ":nth-child" || name === ":nth-last-child") continue
      if (name === ":is" || name === ":where") {
        for (const branch of node.nodes ?? []) subjectSlotsOf(branch, out)
      }
    }
  }
  return out
}

export function governedSlots() {
  const css = readFileSync(FAMILIES, "utf8")
  const root = postcss.parse(css)
  const governed = new Map() // slot -> Set<familyId>
  let currentFamily = null
  let subjectMode = false

  root.walk((node) => {
    if (node.type === "comment") {
      const marks = [...node.text.matchAll(/@family\s+([a-z0-9-]+)\s+(\w+)/g)]
      if (marks.length) {
        currentFamily = marks.map((m) => m[1]).join("+")
        subjectMode = marks.every((m) => m[2] === "subject")
      }
      return
    }
    if (node.type !== "rule" || !subjectMode || !currentFamily) return

    selectorParser((selectors) => {
      for (const selector of selectors.nodes) {
        for (const slot of subjectSlotsOf(selector)) {
          if (!governed.has(slot)) governed.set(slot, new Set())
          governed.get(slot).add(currentFamily)
        }
      }
    }).processSync(node.selector)
  })
  return governed
}

/**
 * Every slot NAMED anywhere in the family CSS — subject, ancestor or condition.
 *
 * Reference collection and subject enrollment need different traversals on
 * purpose: a stale ancestor is just as dead as a stale subject, so this walks
 * the whole selector instead of only its last compound. It uses the same AST as
 * enrollment, because a regex missed unquoted values — `[data-slot=name]` is
 * ordinary equality, and one that slipped through enrolled a slot no component
 * declares while the reverse check reported nothing.
 */
export function referencedSlots() {
  const css = readFileSync(FAMILIES, "utf8")
  const root = postcss.parse(css)
  const out = new Set()

  root.walkRules((rule) => {
    selectorParser((selectors) => {
      selectors.walkAttributes((node) => {
        if (node.attribute !== "data-slot") return
        if (!node.value) return
        out.add(node.value.replace(/^["']|["']$/g, ""))
      })
    }).processSync(rule.selector)
  })
  return out
}

export function dispositions() {
  const file = join(ROOT, "src/design/dispositions.json")
  return JSON.parse(readFileSync(file, "utf8"))
}
