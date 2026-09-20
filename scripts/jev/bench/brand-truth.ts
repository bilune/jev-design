/**
 * What these products actually look like.
 *
 * The first version of this was a list of hue names typed from memory, and it
 * was wrong in ways that changed the results:
 *
 *   - `Linear` allowed violet, indigo and purple. Converting Linear's published
 *     accent gives H275, whose nearest catalog names are navy, indigo and blue.
 *     `violet` is 27° away and `blue` was excluded — so a run that answered
 *     `blue` was marked wrong when it was nearer the truth than the answer I
 *     had allowed.
 *   - `Slack` allowed indigo and violet. Aubergine is H327: magenta and purple.
 *   - `Nintendo` allowed "red", which is not a name in the catalog at all. A
 *     check that could never pass, sitting in a benchmark, passing unnoticed.
 *
 * So the hue expectations are no longer written. They are computed: a published
 * brand hex, converted to OKLCH, and every catalog name within `TOLERANCE`
 * degrees of it. Each hex carries its source. Where a brand genuinely has no
 * single accent, that is recorded rather than invented.
 *
 * The target is not any of these products as they ship today — it is the image
 * people carry of them. That image has a source that is not my memory: it is
 * what gets written about them. So the non-hue expectations are taken from
 * published descriptions, quoted in `SOURCES` below, and two of them turned out
 * to contradict what I had typed:
 *
 *   - `Vercel` went "dark", then "light" on design-blog descriptions, then no
 *     assertion at all on vercel.com's own markup, and it is DARK. Each of
 *     those three moves answered a different question from the one this file
 *     asks. The markup says the site ships a theme colour per preference and
 *     forces neither, which settles what vercel.com does and not what anyone
 *     pictures; the blogs describe a page that has not looked like that for
 *     years. The image is black, and the image is the target stated above.
 *
 *     Removing the check was the worst of the three, because it hid a real
 *     failure. See the note on the case itself.
 *   - `Vercel` was marked "sharp (roundness < 1)", which on this ladder means
 *     under two pixels. The same descriptions give "sharp 6px corner radii",
 *     which is rung two, not rung zero.
 *
 * Where a check is still a judgement rather than a quotation, it says so.
 */
import { hues, type HueKey } from "@/design/jev/catalog"

const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

/** sRGB hex → OKLCH hue angle. Ottosson's matrices. */
export function hueOf(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const r = lin(((n >> 16) & 255) / 255)
  const g = lin(((n >> 8) & 255) / 255)
  const b = lin((n & 255) / 255)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const h = (Math.atan2(B, A) * 180) / Math.PI
  return h < 0 ? h + 360 : h
}

/**
 * How far a named hue may sit from the brand's own. The catalog's names are
 * 10–20° apart, so 20° admits the nearest two or three and excludes the rest.
 */
export const TOLERANCE = 20

export function huesNear(hex: string): HueKey[] {
  const h = hueOf(hex)
  return (Object.keys(hues) as HueKey[]).filter((k) => {
    if (k === "neutral") return false
    const raw = Math.abs(hues[k].angle - h) % 360
    return (raw > 180 ? 360 - raw : raw) <= TOLERANCE
  })
}

/** Descriptions the expectations are taken from, so they can be argued with. */
export const SOURCES: Record<string, string> = {
  Linear:
    "\"a near-black canvas where content emerges from darkness\"; \"the signature Linear " +
    "lavender-blue (#5e6ad2) is used as the single chromatic accent\"; \"compact 8–12px " +
    "paddings\"; \"6px and 12px radii\"; \"dense, technical\" — getdesign.md/linear.app, " +
    "opendesigner.io, blog.logrocket.com",
  Vercel:
    "\"pure blacks and pure whites\"; \"a color palette predominantly of black and white " +
    "with minimal accent colors\"; \"sharp 6px corner radii on interactive elements\" — " +
    "setproduct.com, seedflip.co, open-design.ai. The CANVAS is not taken from those: " +
    "vercel.com declares theme-color #FAFAFA for a light preference and #000 for a dark " +
    "one and forces neither, so it has no canvas of its own to be right about.",
}

export const BRAND_HEX: Record<string, { hex: string; source: string }> = {
  Linear: { hex: "#5E6AD2", source: "Linear's published accent; described as 'lavender-blue' and as 'purple accent'" },
  Slack: { hex: "#4A154B", source: "Slack aubergine, the published brand colour" },
  Stripe: { hex: "#635BFF", source: "Stripe's published brand purple" },
  Spotify: { hex: "#1DB954", source: "Spotify green, the published brand colour" },
  Nintendo: { hex: "#E60012", source: "Nintendo red, the published brand colour" },
  Figma: { hex: "#A259FF", source: "one of five Figma brand colours; the brand is deliberately multicoloured" },
  "IBM Carbon": { hex: "#0F62FE", source: "Carbon Blue 60, the design system's interactive colour" },
  "Bloomberg terminal": { hex: "#FF9E00", source: "the amber of the terminal's own text" },
  "Apple settings": { hex: "#007AFF", source: "the system blue of Apple's platforms" },
}

/** Brands with no accent to be right or wrong about. */
export const NO_ACCENT = new Set(["Vercel", "Notion", "Windows 95"])

export const DARK = new Set(["slate", "graphite", "charcoal", "midnight", "void"])
export const LIGHT = new Set(["paper", "bone", "newsprint", "sand", "chalk"])

type A = Record<string, string | number>
export type Check = { label: string; holds: (a: A) => boolean }

const hue = (brand: string, extra: HueKey[] = []): Check => {
  const allowed = [...new Set([...huesNear(BRAND_HEX[brand].hex), ...extra])]
  return {
    label: `hue ∈ {${allowed.join(", ")}}  (from ${BRAND_HEX[brand].hex}, ±${TOLERANCE}°${extra.length ? " + the words the sources use" : ""})`,
    holds: (a) => allowed.includes(String(a.hue) as HueKey),
  }
}
const canvas = (tone: "dark" | "light"): Check => ({
  label: `canvas is ${tone}`,
  holds: (a) => (tone === "dark" ? DARK : LIGHT).has(String(a.canvas)),
})
const judgement = (label: string, holds: (a: A) => boolean): Check => ({ label, holds })

/**
 * Twelve products. Hue checks are computed; the rest are stated judgements and
 * are labelled as such in the report.
 */
export const BRAND_TRUTH: Record<string, Check[]> = {
  // Sourced: near-black canvas, lavender-blue accent also called purple,
  // compact paddings, 6–12px radii.
  Linear: [
    canvas("dark"),
    hue("Linear", ["violet", "purple"]),
    judgement("density is compact", (a) => a.density === "compact"),
    judgement("rounded a little, not square and not a pill (6–12px)", (a) => Number(a.roundness) > 1 && Number(a.roundness) < 3.2),
  ],
  Slack: [hue("Slack")],
  Stripe: [canvas("light"), hue("Stripe"), judgement("clearly rounded (>1.5)", (a) => Number(a.roundness) > 1.5)],
  Spotify: [canvas("dark"), hue("Spotify"), judgement("clearly rounded (>2)", (a) => Number(a.roundness) > 2)],
  Nintendo: [hue("Nintendo"), judgement("very rounded (>3)", (a) => Number(a.roundness) > 3)],
  Figma: [canvas("light"), hue("Figma"), judgement("density is compact", (a) => a.density === "compact")],
  "IBM Carbon": [canvas("light"), hue("IBM Carbon"), judgement("square (<0.8)", (a) => Number(a.roundness) < 0.8)],
  "Apple settings": [canvas("light"), hue("Apple settings"), judgement("clearly rounded (>2)", (a) => Number(a.roundness) > 2)],
  "Bloomberg terminal": [
    canvas("dark"), hue("Bloomberg terminal"),
    judgement("body face is monospaced", (a) => a.bodyCategory === "mono"),
    judgement("density is compact", (a) => a.density === "compact"),
  ],
  Notion: [canvas("light"), judgement("almost no colour (<1.5)", (a) => Number(a.chroma) < 1.5), judgement("body face is sans", (a) => a.bodyCategory === "sans")],
  /**
   * `canvas("dark")` here is EXPECTED TO FAIL, and it stays for that reason.
   *
   * The recognition pass answers `interfaceIsDark` 0.56 for Vercel and 0.38 for
   * Linear — and Linear's own markup declares a single `#08090a` with no media
   * query, so that 0.38 is simply wrong. The model knows Spotify at 0.86 and a
   * Bloomberg terminal at 0.88; it does not carry the canvas of a developer
   * tool. Rewording the question to ask about the image people hold rather than
   * the product's interface was measured and made it worse: 6 of 12 against 8.
   *
   * The engine behaves correctly given that. `appearanceKnown` reports 0.33 for
   * Vercel — the pass is saying it cannot picture this one — and the 0.7 gate
   * then declines to assert a canvas rather than committing to a coin flip. The
   * white page that results is the catalog's default, not a claim.
   *
   * So this is a gap in what the model holds, not a defect in the pipeline, and
   * a benchmark that only asserts what already passes is measuring nothing.
   */
  Vercel: [
    canvas("dark"),
    judgement("no colour at all (<1)", (a) => Number(a.chroma) < 1),
    judgement("rounded a little, not square and not a pill (6px)", (a) => Number(a.roundness) > 1 && Number(a.roundness) < 3.2),
  ],
  "Windows 95": [
    judgement("almost no colour (<1.5)", (a) => Number(a.chroma) < 1.5),
    judgement("square (<0.8)", (a) => Number(a.roundness) < 0.8),
    judgement("everything is boxed", (a) => a.borders === "full"),
    judgement("density is compact", (a) => a.density === "compact"),
  ],
}
