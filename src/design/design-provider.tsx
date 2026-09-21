"use client"

import * as React from "react"

import { declarations } from "@/design/declarations"
import { PAINT_KEY } from "@/design/boot"
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
 * Writes the declarations onto <html>. The only place that touches global
 * styles at runtime; what to write is decided in `declarations.ts`, which the
 * server uses too.
 *
 * The computed map is also stored, so the boot script in the layout can
 * replay the last style before React exists. Storing the result rather than
 * recomputing it there keeps one implementation of the arithmetic.
 */
function paint(config: DesignConfig) {
  const root = document.documentElement
  const { style, data, dark } = declarations(config)

  for (const [key, value] of Object.entries(style)) root.style.setProperty(key, value)
  for (const [key, value] of Object.entries(data)) root.setAttribute(key, value)
  root.classList.toggle("dark", dark)

  try {
    window.localStorage.setItem(PAINT_KEY, JSON.stringify({ style, data, dark }))
  } catch {
    /* storage unavailable: the next first paint falls back to the default */
  }
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
