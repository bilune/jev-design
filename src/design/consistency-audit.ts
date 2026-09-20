"use client"

/**
 * Runtime audit — development only.
 *
 * The build gate proves every component is classified. It cannot prove the
 * result actually looks right: whether a rule won the cascade, whether two
 * rendered controls line up, whether a nested corner relates to its container.
 * That needs measuring real boxes, which is what this does.
 *
 * Two things keep it trustworthy:
 *
 *  - It only audits rows that DECLARE they hold controls (`.ui-controls`,
 *    `.ui-toolbar`, `.ui-actions`). `.ui-row` promises a gap, not equal
 *    dimensions, so comparing its children produced false alarms.
 *  - It checks against the CONTRACT, not only between siblings. Two equally
 *    wrong controls used to pass, and a lone control was never checked at all.
 */

import { factorFor, isSquare } from "@/design/scale"

type Issue = {
  kind: string
  message: string
  nodes: Element[]
}

const CONTROL_ROWS = ".ui-controls, .ui-toolbar, .ui-actions"

/** The structural flags the provider writes onto <html>. */
const TOKEN_ATTRIBUTES = [
  "data-ui-density",
  "data-ui-borders",
  "data-ui-surface",
  "data-ui-icon-side",
  "data-ui-actions-align",
  "data-ui-label-placement",
  "data-ui-indicator-side",
  "data-ui-label-case",
  "data-ui-title-align",
  "data-ui-nav-side",
  "data-ui-motion",
  "data-ui-mode",
]

/** Rows whose members are expected to share one height. */
const UNIFORM_ROWS = ".ui-controls, .ui-toolbar"

/* ── Measuring ───────────────────────────────────────────────────────────── */

/** Some components wrap the box that actually paints. Measure that one. */
const VISUAL_TARGET: Record<string, string> = {
  "native-select-wrapper": "[data-slot='native-select']",
  "input-group": "",
}

function visualBox(el: Element): Element {
  const slot = (el as HTMLElement).dataset.slot ?? ""
  const inner = VISUAL_TARGET[slot]
  if (inner) return el.querySelector(inner) ?? el
  return el
}

function participates(el: Element) {
  const node = el as HTMLElement
  if (!node.dataset.slot) return false
  if (node.hasAttribute("data-ui-free")) return false
  const cs = getComputedStyle(node)
  if (cs.display === "none" || cs.visibility === "hidden") return false
  if (cs.position === "fixed" || cs.position === "absolute") return false
  return node.getBoundingClientRect().height > 4
}

type Measure = {
  el: Element
  slot: string
  size: string
  height: number
  corners: [string, string, string, string]
}

function measure(el: Element): Measure {
  const box = visualBox(el)
  const cs = getComputedStyle(box)
  return {
    el,
    slot: (el as HTMLElement).dataset.slot ?? "?",
    // Read from the box we measure: a wrapper and its inner control can carry
    // different size metadata.
    size:
      (box as HTMLElement).dataset.size ?? (el as HTMLElement).dataset.size ?? "default",
    height: box.getBoundingClientRect().height,
    // All four, so a joined group's right-hand corners are not missed.
    corners: [
      cs.borderTopLeftRadius,
      cs.borderTopRightRadius,
      cs.borderBottomRightRadius,
      cs.borderBottomLeftRadius,
    ],
  }
}

/* ── Contract values ─────────────────────────────────────────────────────── */

const px = (value: string) => parseFloat(value) || 0

/** A small tolerance: sub-pixel layout should not raise an alarm. */
const TOLERANCE = 1.0
const differs = (a: number, b: number) => Math.abs(a - b) > TOLERANCE

/**
 * Resolves a token to real pixels.
 *
 * `getPropertyValue` hands back the unresolved expression — a token defined as
 * `calc(2.25rem * (0.85 + 0.15 * var(--ui-density-k)))` comes out as that
 * string, and parsing it yields nothing. So we let the browser do the math on
 * a throwaway element and measure the result.
 */
/**
 * The probe is inserted and removed inside `body`, which the observer watches.
 * Without this flag every audit would schedule the next one and the loop would
 * never settle.
 */
let measuring = false

function resolvePx(expression: string) {
  measuring = true
  const probe = document.createElement("div")
  probe.dataset.uiProbe = "true"
  probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;height:${expression}`
  document.body.appendChild(probe)
  const value = probe.getBoundingClientRect().height
  probe.remove()
  measuring = false
  return value
}

function contract() {
  const controlHeight = resolvePx("var(--ui-control-height-x)")
  return {
    controlHeight,
    /** Height for a size, from the shared scale — never retyped here. */
    sizeHeight: (size: string) => controlHeight * factorFor(size),
  }
}

/* ── Checks ──────────────────────────────────────────────────────────────── */

function auditRow(row: Element, c: ReturnType<typeof contract>, issues: Issue[]) {
  const members = Array.from(row.children).filter(participates).map(measure)
  if (!members.length) return

  const uniform = row.matches(UNIFORM_ROWS)

  // 1. Against the contract — catches a lone control and two equally wrong ones.
  for (const m of members) {
    const expected = c.sizeHeight(m.size)
    if (differs(m.height, expected)) {
      issues.push({
        kind: "height off contract",
        message:
          `${m.slot}${m.size !== "default" ? `[${m.size}]` : ""} — expected ` +
          `${expected.toFixed(1)}px for its size, measured ${m.height.toFixed(1)}px`,
        nodes: [m.el],
      })
    }
  }

  // 2. Shape — a square control must actually be square.
  for (const m of members) {
    if (!isSquare(m.size)) continue
    const box = visualBox(m.el).getBoundingClientRect()
    if (differs(box.width, box.height)) {
      issues.push({
        kind: "square control is not square",
        message: `${m.slot}[${m.size}] — ${box.width.toFixed(1)}×${box.height.toFixed(1)}px`,
        nodes: [m.el],
      })
    }
  }

  // 3. Fit — a row can agree perfectly and still clip what is inside it.
  for (const m of members) {
    for (const issue of fitIssues(m.el)) issues.push(issue)
  }

  // Everything above is per-control and has to run for a lone control too: a
  // single icon button can be the wrong shape, and a single control can clip
  // its own text. Only the comparisons below need a second member.
  if (members.length < 2) return

  // 4. Between siblings — a uniform row must not mix size TIERS. `default` and
  //    `icon` are different names for the same height, and mixing them is fine.
  if (uniform) {
    const tiers = new Set(members.map((m) => factorFor(m.size)))
    if (tiers.size > 1) {
      issues.push({
        kind: "mixed size tiers in a uniform row",
        message: members.map((m) => `${m.slot}=${m.size}`).join("  "),
        nodes: members.map((m) => m.el),
      })
    }
    const heights = members.map((m) => m.height)
    if (differs(Math.max(...heights), Math.min(...heights))) {
      issues.push({
        kind: "heights disagree",
        message: members.map((m) => `${m.slot}=${m.height.toFixed(1)}px`).join("  "),
        nodes: members.map((m) => m.el),
      })
    }
  }

  // 5. Shape between siblings — every corner, compared as numbers so a
  //    sub-pixel difference is not reported as a disagreement.
  if (uniform) {
    for (let corner = 0; corner < 4; corner++) {
      const values = members.map((m) => px(m.corners[corner]))
      if (differs(Math.max(...values), Math.min(...values))) {
        issues.push({
          kind: "corners disagree",
          message: members
            .map((m) => `${m.slot}=${m.corners[corner]}`)
            .join("  "),
          nodes: members.map((m) => m.el),
        })
        break
      }
    }
  }
}

/** Containers whose own box says nothing about whether their members fit. */
const SHELLS = new Set([
  "tabs-list",
  "toggle-group",
  "button-group",
  "input-group",
  "input-otp-group",
])

/**
 * Vertical overflow HEURISTIC — deliberately not called an invariant.
 *
 * Measured as real overflow rather than estimated from `line-height`, which
 * reads `normal` on most controls and would parse to nothing. For a group, the
 * shell's own box says nothing useful — its members are what can clip — so the
 * check descends into them.
 *
 * What it does not establish:
 *  - a member can fit its own contents while overflowing its shell, and that
 *    containment is not checked here;
 *  - an element that paints deliberate decoration outside its box — an
 *    `::after` underline, say — is SKIPPED ENTIRELY, so real content overflow
 *    on that same element is hidden too. The decoration's contribution is not
 *    subtracted; the element is simply not checked.
 *
 * Treat a hit as a signal worth measuring by hand, not as proof of clipping.
 */
/** Whether the element paints something deliberately outside its own box. */
function hasOutsideDecoration(el: HTMLElement) {
  for (const pseudo of ["::after", "::before"]) {
    const cs = getComputedStyle(el, pseudo)
    if (cs.content === "none") continue
    if (cs.position !== "absolute") continue
    const bottom = parseFloat(cs.bottom)
    const top = parseFloat(cs.top)
    if (bottom < 0 || top < 0) return true
  }
  return false
}

function fitIssues(el: Element): Issue[] {
  const slot = (el as HTMLElement).dataset.slot ?? ""
  if (SHELLS.has(slot)) {
    return Array.from(el.children)
      .filter((child) => (child as HTMLElement).dataset.slot)
      .flatMap((child) => fitIssues(child))
  }

  const box = visualBox(el) as HTMLElement
  const clipped = box.scrollHeight - box.clientHeight
  if (clipped <= TOLERANCE) return []
  // Decoration drawn outside the box — an underline on `::after`, a focus
  // flourish — is overflow the user never sees as clipped text.
  if (hasOutsideDecoration(box)) return []
  return [
    {
      kind: "possible vertical overflow",
      message:
        `${slot || box.tagName.toLowerCase()} — ${box.clientHeight}px of room ` +
        `for ${box.scrollHeight}px of content`,
      nodes: [el],
    },
  ]
}

/**
 * Nested corners: the child radius must relate to the container's real
 * geometry. Computed from the boxes themselves, never by reading the token the
 * implementation uses — otherwise a broken formula and its own oracle would
 * share the same mistake and the check would pass.
 */
/** Which child of a container counts as a member for the nesting check. */
const NESTED_MEMBERS: Record<string, string> = {
  "tabs-list": "[data-slot='tabs-trigger']",
  "toggle-group": "[data-slot='toggle-group-item']",
  "button-group": "[data-slot='button']",
  "dropdown-menu-content": "[data-slot='dropdown-menu-item']",
  "context-menu-content": "[data-slot='context-menu-item']",
  "menubar-content": "[data-slot='menubar-item']",
  "select-content": "[data-slot='select-item']",
  "combobox-content": "[data-slot='combobox-item']",
  // Deliberately NOT the OTP group: its cells draw the outside corners of the
  // assembly, they are not inset inside a rounded container. Judging them by
  // the inset rule would demand square cells to satisfy the wrong contract.
}

function auditNesting(issues: Issue[]) {
  const containers = document.querySelectorAll<HTMLElement>(
    Object.keys(NESTED_MEMBERS)
      .map((slot) => `[data-slot='${slot}']`)
      .join(", ")
  )
  for (const container of containers) {
    const cs = getComputedStyle(container)
    const outer = px(cs.borderTopLeftRadius)
    const inset = px(cs.paddingTop) + px(cs.borderTopWidth)
    const expected = Math.max(0, outer - inset)

    // A member, not the first descendant: a menu opens with a label, and a
    // label is not an option.
    const child = container.querySelector<HTMLElement>(NESTED_MEMBERS[
      container.dataset.slot ?? ""
    ] ?? "[data-slot]")
    if (!child || child.hasAttribute("data-ui-free")) continue
    const actual = px(getComputedStyle(child).borderTopLeftRadius)
    if (differs(actual, expected)) {
      issues.push({
        kind: "nested corner off",
        message:
          `${child.dataset.slot} inside ${container.dataset.slot} — container ${outer}px ` +
          `minus ${inset}px inset expects ${expected.toFixed(1)}px, measured ${actual.toFixed(1)}px`,
        nodes: [child, container],
      })
    }
  }
}

/* ── Reporting ───────────────────────────────────────────────────────────── */

/* ── Containment ─────────────────────────────────────────────────────────────
   The checks above compare controls to their contract. These ask a different
   question: does what the engine produced still fit where it was put?

   Type and space scale from the tokens, and a token knows nothing about the box
   it lands in. Pushed far enough, a comfortable padding eats a narrow card, a
   figure splits across two lines, and a row of tabs walks out of its container.
   Each of those was a real defect found by eye, so each has a check now.
   ────────────────────────────────────────────────────────────────────────── */

/** Anything that must read as one unbroken line. */
const SINGLE_LINE = "[data-ui-title-role='metric'], [data-ui-title-role='display']"

function lineCount(el: Element) {
  const cs = getComputedStyle(el)
  const lineHeight =
    px(cs.lineHeight) || px(cs.fontSize) * 1.25 || 1
  return Math.round(el.getBoundingClientRect().height / lineHeight)
}

/** A figure broken across lines stops being a figure. */
function auditSingleLine(issues: Issue[]) {
  for (const el of document.querySelectorAll(SINGLE_LINE)) {
    if ((el as HTMLElement).hasAttribute("data-ui-free")) continue
    const lines = lineCount(el)
    if (lines > 1) {
      issues.push({
        kind: "figure wraps",
        message:
          `${(el as HTMLElement).dataset.uiTitleRole} "${el.textContent?.trim().slice(0, 24)}" ` +
          `takes ${lines} lines — it has ${Math.round(el.getBoundingClientRect().width)}px to read in`,
        nodes: [el],
      })
    }
  }
}

/**
 * Nothing the engine sizes may walk out of the box it was placed in.
 *
 * Two shapes of failure, and both matter: a container that spills because it
 * neither scrolls nor clips, and one that clips — where the content is not
 * spilling, it is simply GONE. A month grid quietly missing Monday and Sunday
 * looks tidy and is wrong.
 */
function auditHorizontalFit(issues: Issue[]) {
  const containers = document.querySelectorAll<HTMLElement>(
    "[data-slot='tabs-list'], [data-slot='toggle-group'], [data-slot='button-group']," +
      "[data-slot='card-content'], [data-slot='card-header'], [data-slot='table-container']," +
      ".ui-toolbar, .ui-controls, .ui-actions"
  )
  for (const container of containers) {
    if (container.hasAttribute("data-ui-free")) continue
    const spill = container.scrollWidth - container.clientWidth
    if (spill <= TOLERANCE) continue

    const cs = getComputedStyle(container)
    const scrolls = cs.overflowX === "auto" || cs.overflowX === "scroll"
    if (scrolls) continue

    const clips = cs.overflowX === "hidden" || cs.overflowX === "clip"
    const name = container.dataset.slot ?? container.className.split(" ")[0]
    issues.push({
      kind: clips ? "content cut off" : "content wider than its container",
      message:
        `${name} — ${container.scrollWidth}px of content in ${container.clientWidth}px, ` +
        (clips
          ? `and it is clipped, so ${spill.toFixed(0)}px of it is not reachable`
          : `and it neither scrolls nor clips`),
      nodes: [container],
    })
  }
}

/** One section of a surface must not paint over the next. */
function auditSectionOverlap(issues: Issue[]) {
  for (const card of document.querySelectorAll<HTMLElement>("[data-slot='card']")) {
    const sections = ["card-header", "card-content", "card-footer"]
      .map((slot) => card.querySelector<HTMLElement>(`:scope > [data-slot='${slot}']`))
      .filter((el): el is HTMLElement => !!el)

    for (let i = 0; i < sections.length - 1; i++) {
      const above = sections[i].getBoundingClientRect()
      const below = sections[i + 1].getBoundingClientRect()
      if (above.bottom > below.top + TOLERANCE) {
        issues.push({
          kind: "sections overlap",
          message:
            `${sections[i].dataset.slot} ends at ${above.bottom.toFixed(0)}px, ` +
            `past where ${sections[i + 1].dataset.slot} starts (${below.top.toFixed(0)}px)`,
          nodes: [sections[i], sections[i + 1]],
        })
      }
    }
  }
}

/* ── Type scale ──────────────────────────────────────────────────────────── */

/**
 * Every piece of text must sit on the ladder.
 *
 * The test is not "is this size one of the rungs": at the default base one of
 * the rungs is 14px, which is also Tailwind's own literal `text-sm`, so a
 * frozen element passes by coincidence. That is how this defect survived
 * unnoticed until a style raised the base and the navigation stayed behind
 * while the dashboard grew.
 *
 * So the test is the property that actually matters: text that belongs to the
 * system MOVES when the system moves. The base is doubled, every text box is
 * measured again, and anything that did not follow is reported. Both reads
 * happen in one task, so the browser never paints the perturbed state.
 */
function auditTypeScale(issues: Issue[]) {
  const root = document.documentElement
  const held = root.style.getPropertyValue("--ui-font-size-base")

  const sizes = () => {
    const out = new Map<Element, number>()
    for (const el of document.querySelectorAll("body *")) {
      if (!(el as HTMLElement).offsetParent) continue
      /* Only elements holding their own text: an ancestor's size is inherited,
         and reporting it too would name the same defect several times. */
      const owns = Array.from(el.childNodes).some(
        (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim(),
      )
      if (!owns) continue
      /* Chart libraries measure a label by rendering it far off-screen. It is
         `offsetParent`-visible and holds text, but it is not interface. */
      if (el.getBoundingClientRect().bottom < -1000) continue
      /* Initials inside an avatar are a glyph in a fixed mark, not page text.
         They are sized against the avatar's own box — which comes from the
         control height — and that is the point: when they followed the page's
         type scale instead, a generous style put two capitals of 16.8px inside
         a 32px circle and they sat against the ring. This check would report
         them as frozen for doing the right thing, and an audit that reports
         eight non-defects on every run is an audit nobody reads. */
      if (
        el.getAttribute("data-slot") === "avatar-fallback" ||
        el.getAttribute("data-slot") === "avatar-group-count"
      )
        continue
      out.set(el, px(getComputedStyle(el).fontSize))
    }
    return out
  }

  root.style.setProperty("--ui-font-size-base", "0.875rem")
  const before = sizes()
  root.style.setProperty("--ui-font-size-base", "1.75rem")
  const after = sizes()
  if (held) root.style.setProperty("--ui-font-size-base", held)
  else root.style.removeProperty("--ui-font-size-base")

  const frozen: Element[] = []
  for (const [el, small] of before) {
    const large = after.get(el)
    if (large === undefined) continue
    /* `font-size: 0` is the system's own way of hiding an icon, not text. */
    if (small === 0) continue
    if (large > small * 1.2) continue
    frozen.push(el)
  }

  /* Grouped into one issue: a leak is almost always one rule reaching many
     elements, and 30 separate lines would bury the other checks. */
  if (frozen.length) {
    const names = Array.from(
      new Set(frozen.map((el) => (el as HTMLElement).dataset.slot ?? el.tagName.toLowerCase())),
    )
    issues.push({
      kind: "type scale",
      message:
        frozen.length === 1
          ? `one text element does not follow the base size, so it keeps a fixed ` +
            `size while the rest of the interface scales: ${names.join(", ")}`
          : `${frozen.length} text elements do not follow the base size, so they ` +
            `keep a fixed size while the rest of the interface scales: ${names.join(", ")}`,
      nodes: frozen,
    })
  }
}

export function collectIssues(): Issue[] {
  const issues: Issue[] = []
  const c = contract()
  if (!c.controlHeight) {
    return [
      {
        kind: "audit unavailable",
        message:
          "could not resolve --ui-control-height-x, so nothing can be checked",
        nodes: [],
      },
    ]
  }
  document.querySelectorAll(CONTROL_ROWS).forEach((row) => auditRow(row, c, issues))
  auditNesting(issues)
  auditSingleLine(issues)
  auditHorizontalFit(issues)
  auditSectionOverlap(issues)
  auditTypeScale(issues)
  return issues
}

export function runConsistencyAudit() {
  const issues = collectIssues()
  if (!issues.length) return issues

  // Same cause repeated across a list reads as one problem, not twenty.
  const grouped = new Map<string, Issue[]>()
  for (const issue of issues) {
    const key = `${issue.kind}::${issue.message}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(issue)
  }

  console.groupCollapsed(
    `%c[design] ${grouped.size} audit finding(s)`,
    "color:#e07a00;font-weight:600"
  )
  for (const [, group] of grouped) {
    const first = group[0]
    const times = group.length > 1 ? ` (×${group.length})` : ""
    console.warn(`${first.kind}${times} — ${first.message}`)
    console.log(first.nodes)
  }
  console.info(
    "Enroll the component in the right family (src/design/families.css), " +
      "or mark it data-ui-free if it is meant to measure differently."
  )
  console.groupEnd()
  return issues
}

/**
 * Watches for the UI actually changing — opening a menu, mounting a tab,
 * revealing a dialog — instead of only re-running when the tokens change.
 */
export function watchConsistency() {
  // An explicit "audit now", so the result can be inspected on demand instead
  // of waiting for something to change.
  ;(window as unknown as Record<string, unknown>).designAudit =
    runConsistencyAudit
  ;(window as unknown as Record<string, unknown>).designIssues = collectIssues

  let timer = 0
  const schedule = () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      // Measure settled layout, not an intermediate frame. Fonts change metrics
      // when they load, and a custom property declared on a container resolves
      // on its children only once the style pass after it has run — measuring
      // earlier reports a value the user never sees.
      void document.fonts?.ready
        .catch(() => undefined)
        .then(() =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() => runConsistencyAudit())
          )
        )
    }, 350)
  }

  const observer = new MutationObserver((records) => {
    if (measuring) return
    // Ignore our own probe, and anything that is only a token repaint on <html>.
    const real = records.some((r) =>
      [...r.addedNodes, ...r.removedNodes].some(
        (n) => !(n instanceof HTMLElement) || n.dataset.uiProbe !== "true"
      )
    )
    if (real) schedule()
  })
  observer.observe(document.body, { childList: true, subtree: true })
  window.addEventListener("resize", schedule)

  // Tokens live on <html> as attributes and inline styles, which the child-list
  // observer above cannot see, so they get their own trigger.
  const tokens = new MutationObserver(() => schedule())
  tokens.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["style", "class", ...TOKEN_ATTRIBUTES],
  })

  schedule()

  return () => {
    observer.disconnect()
    tokens.disconnect()
    window.removeEventListener("resize", schedule)
    window.clearTimeout(timer)
  }
}
