/**
 * Which slots can lose their `data-slot`, and what survives when they do.
 *
 * Base UI's `render` prop renders your element but overrides its `data-slot`
 * with its own. `<TooltipTrigger render={<Badge/>} />` produces a badge whose
 * slot says `tooltip-trigger`, and the only thing left identifying it is the
 * `group/badge` class its variants carry.
 *
 * That class exists PRECISELY so the element stays addressable. So the rule is
 * simple and checkable: if a component declares both a slot and a group class,
 * every selector that targets the slot must also target the class — otherwise
 * the rule silently stops matching the moment anyone wraps it.
 *
 * Two ways a component declares the pairing:
 *
 *   direct    the class sits in the same JSX tag as the `data-slot`.
 *   via cva   the class is the first token of a `cva()` base string, and the
 *             element applies that variant function.
 *   via state the slot is not an attribute at all — it is `state: { slot: "x" }`
 *             inside a `useRender` call, which is the very mechanism that
 *             replaces it. `badge` and `sidebar-menu-button` are declared this
 *             way, and both are among the ones that kept biting.
 */
import { readdirSync, readFileSync } from "node:fs"
import { globSync } from "node:fs"

const UI_DIR = "src/components/ui"

/**
 * The components this codebase actually wraps.
 *
 * A `group/` class exists for two unrelated reasons: as the survivor of a
 * replaced `data-slot`, and as an ordinary Tailwind group name so descendants
 * can react to a parent's state. Only the first matters here, and the two are
 * indistinguishable from the declaration alone — requiring the anchor
 * everywhere produced 145 findings, almost all of them containers that are
 * never rendered as anything else.
 *
 * What separates them is the call site: an element loses its slot only where
 * someone writes `render={<It/>}`. So the requirement applies to what is
 * actually wrapped, and grows by itself the day anyone wraps something new.
 */
export function renderTargets() {
  const kebab = (n) => n.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()
  const found = new Set()
  for (const file of globSync("src/**/*.tsx")) {
    const src = readFileSync(file, "utf8")
    for (const m of src.matchAll(/render=\{\s*<\s*([A-Z][A-Za-z0-9]*)/g)) found.add(kebab(m[1]))
  }
  return found
}

export function renderAnchors() {
  const anchors = new Map()
  const add = (slot, group) => {
    if (!anchors.has(slot)) anchors.set(slot, new Set())
    anchors.get(slot).add(group)
  }

  for (const file of readdirSync(UI_DIR)) {
    if (!file.endsWith(".tsx")) continue
    const src = readFileSync(`${UI_DIR}/${file}`, "utf8")

    /* Direct: the class is in the same tag as the slot. The attribute list is
       taken to end at `{...props}` or at the next slot, whichever comes first,
       which is where it ends in every component here. */
    for (const m of src.matchAll(/data-slot="([a-z0-9-]+)"/g)) {
      const rest = src.slice(m.index + m[0].length)
      const stops = [rest.indexOf("{...props}"), rest.indexOf("data-slot=")].filter((i) => i !== -1)
      const tag = stops.length ? rest.slice(0, Math.min(...stops)) : rest.slice(0, 400)
      for (const g of tag.matchAll(/group\/([a-z0-9-]+)/g)) add(m[1], `group/${g[1]}`)
    }

    /* Via cva: `const buttonVariants = cva("group/button …")`, then an element
       whose className calls `buttonVariants` and whose tag carries the slot. */
    /* The group class is not always the first token of the base string —
       sidebar's menu button opens with `peer/menu-button` — so the whole head
       of the base is searched rather than just its start. */
    for (const v of src.matchAll(/const\s+(\w+)\s*=\s*cva\(\s*["'`]([^"'`]{0,400})/g)) {
      const [, varName, base] = v
      const found = /(?:^|\s)group\/([a-z0-9-]+)/.exec(base)
      if (!found) continue
      const group = found[1]
      for (const use of src.matchAll(new RegExp(`\\b${varName}\\s*\\(`, "g"))) {
        // The slot is declared near the variant call, either as an attribute
        // on the tag around it or as `state: { slot: "x" }` just after it.
        const before = src.slice(Math.max(0, use.index - 400), use.index)
        const after = src.slice(use.index, use.index + 900)
        for (const re of [/data-slot="([a-z0-9-]+)"/, /\bslot:\s*"([a-z0-9-]+)"/]) {
          const hit = re.exec(before) ?? re.exec(after)
          if (hit) add(hit[1], `group/${group}`)
        }
      }
    }
  }
  return anchors
}
