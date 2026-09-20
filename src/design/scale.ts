/**
 * The size scale, declared once.
 *
 * Sizes map to a **tier**, and the tier carries the factor. Both the CSS and
 * the audit read the tier, so changing a factor moves the rendered height and
 * the expectation together. Declaring `xs` here while the CSS only knew about
 * `sm` would let the oracle drift from the implementation — which is the whole
 * failure this file exists to prevent.
 *
 * The provider publishes the factors as `--ui-scale-<tier>`.
 */

export const TIER_FACTOR = {
  compact: 0.86,
  base: 1,
  roomy: 1.14,
} as const

export type Tier = keyof typeof TIER_FACTOR

/** Which tier each control size belongs to. */
export const SIZE_TIER: Record<string, Tier> = {
  xs: "compact",
  sm: "compact",
  "icon-xs": "compact",
  "icon-sm": "compact",
  default: "base",
  icon: "base",
  lg: "roomy",
  "icon-lg": "roomy",
}

/** Sizes that make the control square: width follows height. */
export const SQUARE_SIZES = new Set([
  "icon",
  "icon-xs",
  "icon-sm",
  "icon-lg",
])

export const tierFor = (size: string | undefined): Tier =>
  SIZE_TIER[size ?? "default"] ?? "base"

export const factorFor = (size: string | undefined) =>
  TIER_FACTOR[tierFor(size)]

export const isSquare = (size: string | undefined) =>
  SQUARE_SIZES.has(size ?? "default")

/** The sizes in each tier, for generating selectors. */
export const SIZES_IN_TIER = (tier: Tier) =>
  Object.keys(SIZE_TIER).filter((size) => SIZE_TIER[size] === tier)
