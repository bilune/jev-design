"use client"

import * as React from "react"

import { clampChroma, semantic, SEMANTIC_HUES } from "@/design/jev/generate"
import { TIER_FACTOR } from "@/design/scale"
import {
  getServerSnapshot,
  getSnapshot,
  setDesignState,
  subscribe,
} from "@/design/design-store"
import {
  defaultConfig,
  defaultPreset,
  presets,
  type DesignConfig,
  type DesignFlags,
  type DesignScalars,
  type PresetName,
} from "@/design/tokens"

const kebab = (s: string) => s.replace(/([A-Z])/g, "-$1").toLowerCase()

type DesignContextValue = {
  config: DesignConfig
  preset: PresetName | "custom"
  applyPreset: (name: PresetName) => void
  setScalar: <K extends keyof DesignScalars>(
    key: K,
    value: DesignScalars[K]
  ) => void
  setFlag: <K extends keyof DesignFlags>(key: K, value: DesignFlags[K]) => void
  /** Swap the entire configuration at once, for a generated style. */
  applyConfig: (config: DesignConfig) => void
  reset: () => void
}

const DesignContext = React.createContext<DesignContextValue | null>(null)

/**
 * Translates the config into CSS custom properties and data-attributes on
 * <html>. It is the only place in the project that writes global styles.
 */
function paint(config: DesignConfig) {
  const root = document.documentElement

  for (const [key, value] of Object.entries(config.scalars)) {
    root.style.setProperty(`--ui-${kebab(key)}`, String(value))
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

  root.style.setProperty("--background", config.scalars.canvas)
  root.style.setProperty("--foreground", config.scalars.ink)
  root.style.setProperty("--card", panel(7, 0))
  root.style.setProperty("--card-foreground", config.scalars.ink)
  root.style.setProperty("--popover", panel(9, 6))
  root.style.setProperty("--popover-foreground", config.scalars.ink)
  root.style.setProperty("--muted", lift(dark ? 14 : 4))
  root.style.setProperty("--muted-foreground", lift(dark ? 62 : 55))
  root.style.setProperty("--secondary", lift(dark ? 12 : 5))
  root.style.setProperty("--secondary-foreground", config.scalars.ink)
  root.style.setProperty("--accent", lift(dark ? 14 : 6))
  root.style.setProperty("--accent-foreground", config.scalars.ink)
  root.style.setProperty("--input", lift(dark ? 18 : 8))
  root.style.setProperty("--sidebar", dark ? lift(4) : lift(2))
  root.style.setProperty("--sidebar-foreground", config.scalars.ink)
  root.style.setProperty("--sidebar-accent", lift(dark ? 12 : 6))
  root.style.setProperty("--sidebar-accent-foreground", config.scalars.ink)

  // The engine's accent and edge feed shadcn's own color tokens, so a
  // component that reads `--border` or `--primary` still follows the system.
  root.style.setProperty("--border", config.scalars.edge)
  root.style.setProperty("--sidebar-border", config.scalars.edge)
  root.style.setProperty("--primary", config.scalars.accent)
  root.style.setProperty("--primary-foreground", config.scalars.accentForeground)
  root.style.setProperty("--ring", config.scalars.accent)
  root.style.setProperty("--sidebar-primary", config.scalars.accent)
  root.style.setProperty(
    "--sidebar-primary-foreground",
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
    root.style.setProperty(`--ui-${name}`, value)
  }
  root.style.setProperty("--destructive", `var(--ui-danger)`)
  root.style.setProperty("--destructive-foreground", config.scalars.canvas)

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
    root.style.setProperty(
      `--chart-${i + 1}`,
      `oklch(${L.toFixed(3)} ${clampChroma(L, c, H).toFixed(3)} ${H})`
    )
  }


  // The size scale is declared in `scale.ts` and published here, so the CSS
  // and the audit read the same numbers.
  for (const [tier, factor] of Object.entries(TIER_FACTOR)) {
    root.style.setProperty(`--ui-scale-${tier}`, String(factor))
  }

  for (const [key, value] of Object.entries(config.flags)) {
    root.dataset[`ui${key[0].toUpperCase()}${key.slice(1)}`] = String(value)
  }

  root.classList.toggle("dark", config.flags.mode === "dark")
  root.style.colorScheme = config.flags.mode
}

export function DesignProvider({ children }: { children: React.ReactNode }) {
  const { config, preset } = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )

  // In development, keep checking that what the engine promises is what the
  // screen actually shows — on every token change AND on every UI change.
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "development") return
    let stop: (() => void) | undefined
    import("@/design/consistency-audit")
      .then((m) => {
        stop = m.watchConsistency()
      })
      .catch((error) => {
        // A guardrail that fails silently is worse than no guardrail: it looks
        // like everything is fine.
        console.error("[design] the consistency audit failed to load", error)
      })
    return () => stop?.()
  }, [])

  React.useEffect(() => {
    paint(config)

    /* Tell the window it changed, because for anything that measures, it did.
     *
     * The silhouette flags move a panel from two thirds of the page to a half
     * without the window moving at all. Recharts sizes its surface from its
     * container and does not pick that up: the container correctly became
     * 364px wide and the svg stayed at 585, overflowing its card by 180px until
     * something unrelated triggered a resize.
     *
     * Twice: once on the next frame, and once shortly after. One frame is
     * enough when only a token changed, and not when the silhouette did — a
     * panel going from two thirds of the page to a half takes more than one
     * layout pass to settle, and the sweep caught charts still holding their
     * old width after the first notice. The engine cannot know when every
     * library it does not control has finished measuring; it can afford to say
     * so twice. */
    const tell = () => window.dispatchEvent(new Event("resize"))
    const frame = requestAnimationFrame(tell)
    const settle = setTimeout(tell, 180)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(settle)
    }
  }, [config])

  // A development handle, so a generated style can be applied and audited from
  // a script without going through the panel. The audit is only worth running
  // against styles nobody hand-checked first.
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "development") return
    ;(window as unknown as { applyDesignConfig?: (c: DesignConfig) => void })
      .applyDesignConfig = (next) =>
      setDesignState({ config: structuredClone(next), preset: "custom" })
  }, [])

  const value = React.useMemo<DesignContextValue>(
    () => ({
      config,
      preset,
      applyPreset: (name) => {
        setDesignState({
          config: structuredClone(presets[name].config) as DesignConfig,
          preset: name,
        })
      },
      setScalar: (key, val) => {
        setDesignState({
          config: { ...config, scalars: { ...config.scalars, [key]: val } },
          preset: "custom",
        })
      },
      setFlag: (key, val) => {
        setDesignState({
          config: { ...config, flags: { ...config.flags, [key]: val } },
          preset: "custom",
        })
      },
      applyConfig: (next) => {
        setDesignState({ config: structuredClone(next), preset: "custom" })
      },
      reset: () => {
        setDesignState({
          config: structuredClone(defaultConfig) as DesignConfig,
          preset: defaultPreset,
        })
      },
    }),
    [config, preset]
  )

  return (
    <DesignContext.Provider value={value}>{children}</DesignContext.Provider>
  )
}

export function useDesign() {
  const ctx = React.useContext(DesignContext)
  if (!ctx) throw new Error("useDesign must be called inside <DesignProvider>")
  return ctx
}
