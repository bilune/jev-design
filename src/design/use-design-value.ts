"use client"

import { useDesign } from "@/design/design-provider"

/**
 * A bridge for libraries that need a number and do not read CSS (Recharts,
 * canvas, generated SVG). It translates a system token into pixels, so those
 * cases do not end up with values of their own outside the central control.
 */
function toPx(raw: string, factor = 1) {
  const n = parseFloat(raw) || 0
  return Math.round((raw.includes("rem") ? n * 16 : n) * factor)
}

/** Corner radius in pixels for chart marks (bars, areas, dots). */
export function useChartRadius() {
  const { config } = useDesign()
  return toPx(config.scalars.radiusControl, 0.55)
}

/** The system border width, in pixels. */
export function useBorderWidth() {
  const { config } = useDesign()
  return toPx(config.scalars.borderWidth)
}

/**
 * Everything a chart needs, from two answers and four the style already gave.
 *
 * The two asked for are the path and the fill. The rest is derived, which is
 * the same rule the rest of the engine follows: a grid that ignores `borders`
 * or a plot line that ignores the border weight is a chart that has opted out
 * of the style it is sitting in.
 */
export function useChartStyle() {
  const { config } = useDesign()
  const { chartPath, chartFill, borders, density } = config.flags

  /** Recharts' own names for the three paths. */
  const curve = ({ smooth: "monotone", straight: "linear", stepped: "stepAfter" } as const)[chartPath]

  /* The grid follows `borders`, because a grid IS a border: a style that draws
     no boxes has no business ruling the plot area. */
  const grid =
    borders === "none"
      ? null
      : borders === "full"
        ? { strokeDasharray: "0", opacity: 1 }
        : { strokeDasharray: "3 3", opacity: 1 }

  /* Markers follow the path, not a separate question. A stepped readout marks
     its samples with squares, a drafted line marks them with points, and a
     flowing curve is not marking anything — it is claiming the values are
     continuous. A compact style drops them either way: there is no room. */
  const marker =
    density === "compact" || chartPath === "smooth"
      ? false
      : { r: chartPath === "stepped" ? 2.5 : 2, strokeWidth: 0 }

  const strokeWidth = Math.max(1, toPx(config.scalars.borderWidth) * 1.2)

  /** `hatched` needs a pattern in <defs>; the rest are plain fills. */
  const fillFor = (colour: string, patternId: string) => {
    if (chartFill === "none") return { fill: "none", fillOpacity: 0 }
    if (chartFill === "hatched") return { fill: `url(#${patternId})`, fillOpacity: 1 }
    if (chartFill === "gradient") return { fill: `url(#${patternId}-grad)`, fillOpacity: 1 }
    if (chartFill === "solid") return { fill: colour, fillOpacity: 0.85 }
    return { fill: colour, fillOpacity: 0.15 }
  }

  return {
    curve,
    grid,
    marker,
    strokeWidth,
    fillFor,
    hatched: chartFill === "hatched",
    gradient: chartFill === "gradient",
  }
}
