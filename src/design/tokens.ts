/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  DESIGN ENGINE — the single point of control
 * ─────────────────────────────────────────────────────────────────────────────
 *  Everything visual and structural about the UI comes from here.
 *
 *  - `scalars`  → injected as CSS custom properties (--ui-*) on <html>.
 *  - `flags`    → injected as data-attributes on <html>, read by `system.css`
 *                 to decide structure (which side icons sit on, how action
 *                 groups align, where labels go, and so on).
 *
 *  No component hardcodes shape, density or direction: they all read from here
 *  through `src/design/system.css`, which targets shadcn's `data-slot`s.
 */

export type DesignScalars = {
  /* ── Shape ─────────────────────────────────────────────────────────────── */
  /** Corner radius of controls: button, input, select, badge, tabs… */
  radiusControl: string
  /** Corner radius of surfaces: card, dialog, popover, sheet, table… */
  radiusSurface: string
  /** Width of every border in the system. */
  borderWidth: string
  /** Shadow on surfaces. For brutalism: a hard offset with no blur. */
  shadowSurface: string
  /** Shadow on floating elements (dialog, popover, dropdown). */
  shadowOverlay: string

  /* ── Rhythm and density ────────────────────────────────────────────────── */
  /** The base unit. All spacing derives from it. */
  space: string
  /** Space between sibling blocks on the page (sections, cards). */
  gapSection: string
  /** Space between elements inside one block. */
  gapStack: string
  /** Space between inline controls (buttons, chips, toolbars). */
  gapInline: string
  /** Padding inside surfaces (card, dialog, sheet, popover). */
  padSurface: string
  /** Height of interactive controls. */
  controlHeight: string
  /** Horizontal padding inside controls. */
  controlPadX: string
  /** Space between a label and its control inside a field. */
  gapField: string

  /* ── Typography ────────────────────────────────────────────────────────── */
  fontSans: string
  fontMono: string
  /** The face used for headings. Separating it from body text is what lets a
   *  style have a voice of its own and not merely a different shape. */
  fontDisplay: string
  fontSizeBase: string
  /** The type scale: a multiplier over the derived sizes. */
  fontScale: string
  trackingTitle: string
  trackingLabel: string
  /** Tracking on body text. A HUD opens up the body as well, not only the
   *  labels. */
  trackingBody: string
  weightTitle: string
  weightLabel: string
  weightControl: string

  /* ── Colour (oklch) ────────────────────────────────────────────────────── */
  accent: string
  accentForeground: string
  /** The page's ground. `mode` used to decide it; now `mode` follows this
   *  value, because "dark" is a consequence of the canvas and not a parallel
   *  choice. */
  canvas: string
  /** The colour of text over that canvas. */
  ink: string
  /** The colour of borders and of the hard shadow. Without it brutalism
   *  inherits a pale grey and loses the graphic edge that defines it. */
  edge: string
  /** Hue angles for the data series, space separated. Empty means derive them
   *  by rotating the accent, which is what a hand-written preset does; a
   *  generated style brings them from the model's distribution. */
  seriesHues: string
  /** How much of the accent mixes into a surface's fill.
   *  0 = neutral surfaces, 1 = maximum tint. */
  surfaceTint: string

  /* ── Motion ────────────────────────────────────────────────────────────── */
  duration: string
  easing: string
}

export type DesignFlags = {
  /** Which side the icon sits on inside buttons, menu items and triggers. */
  iconSide: "leading" | "trailing"
  /** How action groups align (dialog, card and form footers). */
  actionsAlign: "start" | "end" | "stretch" | "between"
  /** Label above the control, or beside it in two columns. */
  labelPlacement: "top" | "start"
  /** Which side the main navigation sits on. */
  navSide: "left" | "right"
  /** Which side the check or indicator sits on in menus, selects and radios. */
  indicatorSide: "start" | "end"
  /** Global density: rescales spaces and heights over the scalars. */
  density: "compact" | "cozy" | "comfortable"
  /** `full` = everything bordered; `quiet` = separators only; `none` = none. */
  borders: "full" | "quiet" | "none" | "brackets" | "ticks"
  /** Surfaces with a fill of their own, or transparent over the ground. */
  surface: "raised" | "flat" | "outline"
  /** Uppercase plus tracking on labels and table headers. */
  labelCase: "none" | "upper" | "smallCaps"
  /** How the text in a surface title aligns. */
  titleAlign: "start" | "center"
  /** Animations and transitions. */
  motion: "on" | "off"
  /** Colour mode. */
  mode: "light" | "dark"
  /** What shape a corner has. The radius says how much; this says what kind. */
  cornerStyle: "round" | "bevel" | "notch" | "squircle" | "diagonal"
  /** How the rows of a table are separated. */
  tableStyle: "ruled" | "striped" | "bare" | "boxed"
  /** How a separator is drawn: the rule. */
  ruleStyle: "hairline" | "double" | "dotted" | "groove" | "fade" | "ornament" | "none"
  /** The finish of a surface fill, beyond its colour. */
  surfaceFinish: "flat" | "highlight" | "gradient" | "glass" | "emissive"
  /** How figures are drawn. */
  figures: "tabular" | "lining" | "oldstyle"
  /** The width of the side navigation. */
  navWidth: "narrow" | "regular" | "wide"
  /** How the headline figures are laid out. */
  figureLayout: "row" | "grid" | "lead"
  /** How the width is split between the panels of a row. */
  panelSplit: "majorMinor" | "equal" | "minorMajor" | "stacked"
  /** How far the content column stretches. */
  measure: "full" | "wide" | "reading"
  /** What moves on its own, with nobody touching it. None of it animates
   *  geometry: it is opacity, light and a background position. */
  ambient: "none" | "blink" | "breathe" | "sweep"
  /** How degraded the signal looks: 0 clean, 3 about to be lost. Vignetting,
   *  chromatic aberration and noise are one physical phenomenon, so they are
   *  asked for as an intensity and not as separate options. */
  signal: "0" | "1" | "2" | "3"
  /** The texture of the page ground. */
  pageTexture: "none" | "grid" | "dots" | "scanlines" | "grain"
  /** What sits under a figure: a bar, a segmented gauge, a flush rule, or
   *  nothing. */
  figureMark: "bar" | "segments" | "rule" | "none"
  /** How a change reads: a badge, bare text, or the arrow alone. */
  deltaStyle: "badge" | "text" | "arrow"
  /** How a chart line travels from one point to the next. */
  chartPath: "smooth" | "straight" | "stepped"
  /** How the area under that line is treated. */
  chartFill: "tint" | "gradient" | "solid" | "hatched" | "none"
  /** The icon family. It is a flag and not a scalar because there is nothing
   *  in between a stroke and a bitmap. The continuous part, the stroke weight,
   *  already comes from the system's border width and is not asked again. */
  iconFamily: "stroke" | "rounded" | "solid" | "pixel" | "none"
}

export type DesignConfig = { scalars: DesignScalars; flags: DesignFlags }

/* ─────────────────────────────────────────────────────────────────────────────
 *  PRESETS
 *  Each preset is an entire UI. Going from `minimal` to `brutalist` does not
 *  touch a single component: it rewrites these values.
 * ────────────────────────────────────────────────────────────────────────── */

export const presets = {
  minimal: {
    label: "Minimal",
    description: "Air, faint borders, everything rounded and quiet.",
    config: {
      scalars: {
        radiusControl: "0.625rem",
        radiusSurface: "0.875rem",
        borderWidth: "1px",
        shadowSurface: "0 1px 2px 0 oklch(0 0 0 / 0.04)",
        shadowOverlay: "0 12px 32px -8px oklch(0 0 0 / 0.16)",
        space: "0.25rem",
        gapSection: "1.5rem",
        gapStack: "1rem",
        gapInline: "0.5rem",
        padSurface: "1.5rem",
        controlHeight: "2.25rem",
        controlPadX: "0.875rem",
        gapField: "0.5rem",
        fontSans: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
        fontMono: "var(--font-geist-mono), ui-monospace, monospace",
        fontDisplay: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
        fontSizeBase: "0.875rem",
        fontScale: "1",
        trackingTitle: "-0.015em",
        trackingLabel: "0em",
        trackingBody: "0em",
        weightTitle: "600",
        weightLabel: "500",
        weightControl: "500",
        accent: "oklch(0.55 0.21 265)",
        accentForeground: "oklch(0.99 0 0)",
        canvas: "oklch(1 0 0)",
        ink: "oklch(0.145 0 0)",
        edge: "oklch(0.92 0 0)",
        seriesHues: "",
        surfaceTint: "0.35",
        duration: "180ms",
        easing: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
      flags: {
        iconSide: "leading",
        actionsAlign: "end",
        labelPlacement: "top",
        navSide: "left",
        indicatorSide: "start",
        density: "cozy",
        borders: "quiet",
        surface: "flat",
        labelCase: "none",
        titleAlign: "start",
        motion: "on",
        mode: "light",
        cornerStyle: "round",
        tableStyle: "ruled",
        ruleStyle: "hairline",
        surfaceFinish: "flat",
        figures: "tabular",
        navWidth: "regular",
        figureLayout: "row",
        panelSplit: "majorMinor",
        measure: "full",
        ambient: "none",
        signal: "0",
        pageTexture: "none",
        figureMark: "bar",
        deltaStyle: "badge",
        chartPath: "smooth",
        chartFill: "tint",
        iconFamily: "stroke",
      },
    },
  },

  brutalist: {
    label: "Brutalist",
    description: "No radius, thick borders, a hard shadow, everything uppercase.",
    config: {
      scalars: {
        radiusControl: "0rem",
        radiusSurface: "0rem",
        borderWidth: "2px",
        shadowSurface: "4px 4px 0 0 var(--ui-edge)",
        shadowOverlay: "6px 6px 0 0 var(--ui-edge)",
        space: "0.25rem",
        gapSection: "1.25rem",
        gapStack: "0.75rem",
        gapInline: "0.5rem",
        padSurface: "1.25rem",
        controlHeight: "2.5rem",
        controlPadX: "1rem",
        gapField: "0.375rem",
        fontSans: "var(--font-geist-mono), ui-monospace, monospace",
        fontMono: "var(--font-geist-mono), ui-monospace, monospace",
        fontDisplay: "var(--font-geist-mono), ui-monospace, monospace",
        fontSizeBase: "0.8125rem",
        fontScale: "1",
        trackingTitle: "0.02em",
        trackingLabel: "0.12em",
        trackingBody: "0em",
        weightTitle: "700",
        weightLabel: "700",
        weightControl: "700",
        accent: "oklch(0.72 0.19 60)",
        accentForeground: "oklch(0.15 0 0)",
        canvas: "oklch(0.98 0 0)",
        ink: "oklch(0.14 0 0)",
        edge: "oklch(0.18 0 0)",
        seriesHues: "",
        surfaceTint: "0",
        duration: "0ms",
        easing: "linear",
      },
      flags: {
        iconSide: "trailing",
        actionsAlign: "start",
        labelPlacement: "top",
        navSide: "left",
        indicatorSide: "end",
        density: "compact",
        borders: "full",
        surface: "outline",
        labelCase: "upper",
        titleAlign: "start",
        motion: "off",
        mode: "light",
        cornerStyle: "round",
        tableStyle: "boxed",
        ruleStyle: "hairline",
        surfaceFinish: "flat",
        figures: "tabular",
        navWidth: "regular",
        figureLayout: "row",
        panelSplit: "majorMinor",
        measure: "full",
        ambient: "none",
        signal: "0",
        pageTexture: "grid",
        figureMark: "segments",
        deltaStyle: "text",
        chartPath: "straight",
        chartFill: "solid",
        iconFamily: "stroke",
      },
    },
  },

  editorial: {
    label: "Editorial",
    description: "Dense but warm: labels beside the control, titles centred.",
    config: {
      scalars: {
        radiusControl: "0.25rem",
        radiusSurface: "0.375rem",
        borderWidth: "1px",
        shadowSurface: "none",
        shadowOverlay: "0 8px 24px -6px oklch(0 0 0 / 0.2)",
        space: "0.25rem",
        gapSection: "2rem",
        gapStack: "1.25rem",
        gapInline: "0.75rem",
        padSurface: "2rem",
        controlHeight: "2.5rem",
        controlPadX: "1rem",
        gapField: "0.625rem",
        fontSans: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
        fontMono: "var(--font-geist-mono), ui-monospace, monospace",
        fontDisplay: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
        fontSizeBase: "0.9375rem",
        fontScale: "1.05",
        trackingTitle: "-0.02em",
        trackingLabel: "0.06em",
        trackingBody: "0em",
        weightTitle: "600",
        weightLabel: "600",
        weightControl: "500",
        accent: "oklch(0.52 0.13 160)",
        accentForeground: "oklch(0.99 0 0)",
        canvas: "oklch(0.995 0.003 160)",
        ink: "oklch(0.18 0.01 160)",
        edge: "oklch(0.88 0.01 160)",
        seriesHues: "",
        surfaceTint: "0.6",
        duration: "260ms",
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      flags: {
        iconSide: "leading",
        actionsAlign: "between",
        labelPlacement: "start",
        navSide: "left",
        indicatorSide: "start",
        density: "comfortable",
        borders: "quiet",
        surface: "flat",
        labelCase: "upper",
        titleAlign: "center",
        motion: "on",
        mode: "light",
        cornerStyle: "round",
        tableStyle: "striped",
        ruleStyle: "double",
        surfaceFinish: "gradient",
        figures: "oldstyle",
        navWidth: "wide",
        figureLayout: "grid",
        panelSplit: "equal",
        measure: "reading",
        ambient: "none",
        signal: "0",
        pageTexture: "grain",
        figureMark: "rule",
        deltaStyle: "text",
        chartPath: "smooth",
        chartFill: "none",
        iconFamily: "rounded",
      },
    },
  },

  terminal: {
    label: "Terminal",
    description: "Monospaced, dark, compact, navigation on the right.",
    config: {
      scalars: {
        radiusControl: "0.125rem",
        radiusSurface: "0.125rem",
        borderWidth: "1px",
        shadowSurface: "none",
        shadowOverlay: "0 0 0 1px var(--ui-edge)",
        space: "0.25rem",
        gapSection: "0.75rem",
        gapStack: "0.5rem",
        gapInline: "0.375rem",
        padSurface: "0.875rem",
        controlHeight: "2rem",
        controlPadX: "0.625rem",
        gapField: "0.25rem",
        fontSans: "var(--font-geist-mono), ui-monospace, monospace",
        fontMono: "var(--font-geist-mono), ui-monospace, monospace",
        fontDisplay: "var(--font-geist-mono), ui-monospace, monospace",
        fontSizeBase: "0.8125rem",
        fontScale: "0.95",
        trackingTitle: "0em",
        trackingLabel: "0.08em",
        trackingBody: "0em",
        weightTitle: "600",
        weightLabel: "500",
        weightControl: "500",
        accent: "oklch(0.78 0.19 145)",
        accentForeground: "oklch(0.16 0 0)",
        canvas: "oklch(0.16 0.01 145)",
        ink: "oklch(0.93 0.02 145)",
        edge: "oklch(0.35 0.02 145)",
        seriesHues: "",
        surfaceTint: "0.2",
        duration: "90ms",
        easing: "linear",
      },
      flags: {
        iconSide: "leading",
        actionsAlign: "start",
        labelPlacement: "start",
        navSide: "right",
        indicatorSide: "start",
        density: "compact",
        borders: "full",
        surface: "raised",
        labelCase: "upper",
        titleAlign: "start",
        motion: "on",
        mode: "dark",
        cornerStyle: "bevel",
        tableStyle: "bare",
        ruleStyle: "dotted",
        surfaceFinish: "highlight",
        figures: "tabular",
        navWidth: "narrow",
        figureLayout: "row",
        panelSplit: "majorMinor",
        measure: "full",
        ambient: "blink",
        signal: "2",
        pageTexture: "scanlines",
        figureMark: "segments",
        deltaStyle: "arrow",
        chartPath: "stepped",
        chartFill: "tint",
        iconFamily: "pixel",
      },
    },
  },
} satisfies Record<
  string,
  { label: string; description: string; config: DesignConfig }
>

export type PresetName = keyof typeof presets

export const defaultPreset: PresetName = "minimal"
export const defaultConfig: DesignConfig = presets[defaultPreset].config

/** Density multipliers applied on top of the spacing scalars. */
export const densityScale: Record<DesignFlags["density"], number> = {
  compact: 0.75,
  cozy: 1,
  comfortable: 1.3,
}
