"use client"

import {
  defaultConfig,
  defaultPreset,
  presets,
  type DesignConfig,
  type PresetName,
} from "@/design/tokens"

export type DesignState = {
  config: DesignConfig
  preset: PresetName | "custom"
}

const STORAGE_KEY = "dynamic-ui:design"

/** What is served from the server and during hydration. */
const initial: DesignState = { config: defaultConfig, preset: defaultPreset }

function read(): DesignState {
  if (typeof window === "undefined") return initial
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return initial
    const saved = JSON.parse(raw) as DesignState
    if (saved?.config?.scalars && saved?.config?.flags) {
      // A configuration saved before a token existed must still get it, or the
      // engine would read an undefined value and paint with nothing.
      //
      // The gap is filled from the SAVED preset's defaults, not the global
      // ones: a stored Brutalist config missing `edge` would otherwise inherit
      // Minimal's pale edge and lose exactly the contrast that makes it
      // brutalist, while still calling itself Brutalist.
      const base =
        saved.preset && saved.preset !== "custom" && presets[saved.preset]
          ? presets[saved.preset].config
          : defaultConfig
      return {
        config: {
          scalars: { ...base.scalars, ...saved.config.scalars },
          flags: { ...base.flags, ...saved.config.flags },
        },
        preset: saved.preset ?? "custom",
      }
    }
  } catch {
    /* storage unavailable: carry on with the default */
  }
  return initial
}

// The state lives outside React. That way the read from storage happens
// neither during render (which would break hydration) nor in an effect that
// would trigger a cascading render: React takes it through
// useSyncExternalStore, which hydrates with the server value and then catches
// up on its own.
let state: DesignState = read()
const listeners = new Set<() => void>()

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSnapshot() {
  return state
}

export function getServerSnapshot() {
  return initial
}

export function setDesignState(next: DesignState) {
  state = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* noop */
  }
  for (const listener of listeners) listener()
}
