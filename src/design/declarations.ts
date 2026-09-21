/**
 * The config as a set of declarations, without touching the DOM.
 *
 * This is pure so that the same values can be written twice: by the provider
 * onto <html> at runtime, and by the server into the first HTML it sends. The
 * second one is what stops the page arriving unstyled. Measured before it
 * existed, the first frame carried zero flags and zero custom properties, so
 * the charts painted grey and every structural rule keyed on a flag was
 * simply not in effect until hydration.
 *
 * Nothing here may read `document`, `window` or the clock. It runs on the
 * server.
 */
import { clampChroma, semantic, SEMANTIC_HUES } from "@/design/jev/generate"
import { TIER_FACTOR } from "@/design/scale"
import type { DesignConfig } from "@/design/tokens"

const kebab = (s: string) => s.replace(/([A-Z])/g, "-$1").toLowerCase()

export type Declarations = {
  /** Custom properties and `color-scheme`, keyed as CSS writes them. */
  style: Record<string, string>
  /** `data-ui-*` attributes, keyed as HTML writes them. */
  data: Record<string, string>
  dark: boolean
}

export function declarations(config: DesignConfig): Declarations {
  const style: Record<string, string> = {}
  const data: Record<string, string> = {}
  const set = (key: string, value: string) => {
    style[key] = value
  }

  for (const [key, value] of Object.entries(config.scalars)) {
    set(`--ui-${kebab(key)}`, String(value))
  }

  // Canvas and ink drive the whole neutral ramp. Before this, `mode` picked
  // between two hard-coded palettes and a style could only ever be white or
  // near-black; every intermediate paper, bone, sand or graphite was
  // unreachable. Now one pair of colours generates the ramp, which means a
  // generated style cannot produce a card that has drifted off its own page.
  //
  // The mix percentages are asymmetric on purpose: on a light canvas a panel
  // is the page and the quiet fills sit below it, while on a dark canvas a
  // panel is lifted off the page. Mixing toward `ink` does both, because ink
  // is dark on light and light on dark.
  const dark = config.flags.mode === "dark"
  const lift = (pct: number) =>
    `color-mix(in oklch, ${config.scalars.canvas}, ${config.scalars.ink} ${pct}%)`

  // A panel on a COLOURED page cannot simply be the page.
  //
  // The rule above holds because white on white was never actually flat: a
  // shadow and a hairline did the separating, and both of those read against
  // white. Green on the same green has neither, and the first coloured page
  // this engine produced came out as one uniform field with the panels lost
  // in it. So a panel steps toward paper — lighter and less saturated at once,
  // which is what mixing toward white does — by as much colour as the page is
  // carrying. A neutral page carries none and this resolves to the page
  // itself, exactly as before.
  const pageChroma = Number(/oklch\(\s*[\d.]+\s+([\d.]+)/.exec(config.scalars.canvas)?.[1] ?? 0)
  const towardPaper = (pct: number) =>
    `color-mix(in oklch, ${config.scalars.canvas}, white ${pct}%)`
  const panel = (darkPct: number, lightPct: number) =>
    dark ? lift(darkPct) : pageChroma > 0.02 ? towardPaper(Math.min(60, pageChroma * 300 + lightPct)) : config.scalars.canvas

  set("--background", config.scalars.canvas)
  set("--foreground", config.scalars.ink)
  set("--card", panel(7, 0))
  set("--card-foreground", config.scalars.ink)
  set("--popover", panel(9, 6))
  set("--popover-foreground", config.scalars.ink)
  set("--muted", lift(dark ? 14 : 4))
  set("--muted-foreground", lift(dark ? 62 : 55))
  set("--secondary", lift(dark ? 12 : 5))
  set("--secondary-foreground", config.scalars.ink)
  set("--accent", lift(dark ? 14 : 6))
  set("--accent-foreground", config.scalars.ink)
  set("--input", lift(dark ? 18 : 8))
  set("--sidebar", dark ? lift(4) : lift(2))
  set("--sidebar-foreground", config.scalars.ink)
  set("--sidebar-accent", lift(dark ? 12 : 6))
  set("--sidebar-accent-foreground", config.scalars.ink)

  // The engine's accent and edge feed shadcn's own color tokens, so a
  // component that reads `--border` or `--primary` still follows the system.
  set("--border", config.scalars.edge)
  set("--sidebar-border", config.scalars.edge)
  set("--primary", config.scalars.accent)
  set("--primary-foreground", config.scalars.accentForeground)
  set("--ring", config.scalars.accent)
  set("--sidebar-primary", config.scalars.accent)
  set("--sidebar-primary-foreground",
    config.scalars.accentForeground
  )
  // Danger, warning and success take the style's saturation and its contrast
  // against its own canvas, keeping only their hue, which carries the meaning.
  // Before this they were a fixed red and a hard-coded emerald, identical in
  // every style the engine produced.
  const canvasL = Number(/oklch\(\s*([\d.]+)/.exec(config.scalars.canvas)?.[1] ?? (dark ? 0.15 : 1))
  const accentChroma = Number(/oklch\(\s*[\d.]+\s+([\d.]+)/.exec(config.scalars.accent)?.[1] ?? 0.15)
  for (const [name, hue] of Object.entries(SEMANTIC_HUES)) {
    const value = semantic(hue, accentChroma, canvasL, dark)
    set(`--ui-${name}`, value)
  }
  set("--destructive", `var(--ui-danger)`)
  set("--destructive-foreground", config.scalars.canvas)

  // Charts were the one part of the console the engine did not reach: a style
  // could repaint every control and every surface and leave five hard-coded
  // greys in the middle of the page. The series are derived from the accent by
  // rotating its hue, so a gold style plots in golds and a cyan one in cyans,
  // and the spacing between series stays the same in every style.
  //
  // This has to be published here rather than in `system.css`: the base sheet
  // declares `--chart-*` under `.dark`, which has the same specificity as
  // `:root` and comes later, so a stylesheet rule would lose. An inline style
  // on <html> does not.
  // The five series are computed here as plain oklch rather than with relative
  // colour syntax. `oklch(from … calc(l * 0.9) c 128)` computes correctly —
  // `getComputedStyle` reports the resolved colour — and then Chrome does not
  // PAINT it as an SVG fill, so the charts came back with valid geometry, valid
  // colours and nothing drawn. Parsing our own accent is safe: it is always
  // written by `okl()` in one shape.
  const accent = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/.exec(config.scalars.accent)
  const [aL, aC, aH] = accent ? accent.slice(1, 4).map(Number) : [0.55, 0.15, 0]

  // A generated style brings its own series hues, taken from the shape of the
  // model's answer: one that came back 52% amber, 23% orange and 11% crimson
  // plots in those three, in that order. When the model was sure there is only
  // one hue, and when a person wrote the preset by hand there is no
  // distribution at all — both fall back to spacing the series off the accent,
  // which is at least deliberate and evenly spread.
  const chosen = config.scalars.seriesHues.split(" ").filter(Boolean).map(Number)
  const LIFT = [1, 0.9, 1.1, 0.82, 1.05]
  const SPREAD: [number, number, number][] = [
    [1, 1, 0], [0.88, 1, 42], [1.08, 0.72, -48], [0.78, 0.9, 96], [1, 0.18, 0],
  ]
  for (let i = 0; i < 5; i++) {
    // The accent's chroma belongs to the accent's hue. Carrying 0.3 over to a
    // green puts it far outside sRGB, and a browser gamut-mapping that hard
    // does not come back with a green — the first version drew hue 128 as a
    // dark red. Only the first series, which IS the accent, keeps it whole.
    const safeC = Math.min(aC, 0.17)
    const [l, c, h] =
      chosen[i] !== undefined
        ? [aL * LIFT[i], i === 0 ? aC : safeC, chosen[i]]
        : [aL * SPREAD[i][0], aC * SPREAD[i][1], aH + SPREAD[i][2]]
    const L = Math.min(0.95, l)
    const H = ((h % 360) + 360) % 360
    set(`--chart-${i + 1}`,
      `oklch(${L.toFixed(3)} ${clampChroma(L, c, H).toFixed(3)} ${H})`
    )
  }


  // The size scale is declared in `scale.ts` and published here, so the CSS
  // and the audit read the same numbers.
  for (const [tier, factor] of Object.entries(TIER_FACTOR)) {
    set(`--ui-scale-${tier}`, String(factor))
  }

  for (const [key, value] of Object.entries(config.flags)) {
    data[`data-ui-${kebab(key)}`] = String(value)
  }

  set("color-scheme", config.flags.mode)

  return { style, data, dark: config.flags.mode === "dark" }
}
