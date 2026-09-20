#!/usr/bin/env tsx
/**
 * Generates the icon registry.
 *
 * Every file in the project imports its icons from `lucide-react` by name, so
 * the whole set can be swapped by interposing a module that exports the same
 * names. Nothing in the JSX changes; only the import specifier does.
 *
 * This script finds the names actually imported, resolves each one in the other
 * families, and writes the registry. Anything it cannot resolve is reported
 * rather than silently dropped, because an icon that quietly falls back to
 * another family is a style that quietly stops being one thing.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs"
import * as ph from "@phosphor-icons/react"
import * as lu from "lucide-react"

const DIRS = ["src/components/console", "src/components/ui", "src/app"]

const used = new Set<string>()
for (const d of DIRS) {
  for (const f of readdirSync(d)) {
    if (!/\.tsx?$/.test(f)) continue
    const src = readFileSync(`${d}/${f}`, "utf8")
    // Both specifiers: `lucide-react` before the swap, `@/components/icons`
    // after it, so the generator keeps working once its own output is in use.
    for (const m of src.matchAll(
      /import\s*\{([^}]*)\}\s*from\s*"(?:lucide-react|@\/components\/icons)"/g
    )) {
      for (const n of m[1].split(",")) {
        const t = n.trim().split(" as ")[0].trim()
        if (t) used.add(t)
      }
    }
  }
}

const base = (n: string) => n.replace(/Icon$/, "")

/**
 * The shim module exports more than icons — `IconFamilyProvider` lives there
 * too — and an import list cannot tell them apart. Lucide can: a name it does
 * not export is not an icon. Without this the provider was collected as one,
 * written into the generated lucide import, and the module stopped compiling.
 */
const isIcon = (n: string) => base(n) in lu
for (const n of [...used]) if (!isIcon(n)) used.delete(n)

/** Where the names diverge, a person has to say what the equivalent is. */
const PHOSPHOR: Record<string, string> = {
  Activity: "Pulse", ArrowUpDown: "ArrowsDownUp", Boxes: "Stack",
  CalendarDays: "CalendarDots", ChevronDown: "CaretDown", ChevronLeft: "CaretLeft",
  ChevronRight: "CaretRight", ChevronUp: "CaretUp", CircleAlert: "WarningCircle",
  CircleCheck: "CheckCircle", CornerDownLeft: "ArrowElbowDownLeft",
  EllipsisVertical: "DotsThreeVertical", Filter: "Funnel", Fuel: "GasPump",
  Inbox: "Tray", LayoutDashboard: "SquaresFour", LayoutGrid: "GridFour",
  LifeBuoy: "Lifebuoy", Loader2: "CircleNotch", LogOut: "SignOut",
  Map: "MapTrifold", MoreHorizontal: "DotsThree", OctagonX: "Prohibit",
  PackageCheck: "Package", PackagePlus: "Package", PanelLeft: "SidebarSimple",
  RadioTower: "Broadcast", RefreshCw: "ArrowsClockwise",
  RotateCcw: "ArrowCounterClockwise", Search: "MagnifyingGlass",
  Paintbrush: "PaintBrush",
  Settings: "GearSix", Sparkles: "Sparkle", TriangleAlert: "Warning",
}

/**
 * The pixel set is the smallest and the most opinionated, so its aliases are
 * the ones that need judgement. Where it has no equivalent at all the entry is
 * left out and the icon keeps its default family: a missing glyph is worse than
 * a slightly inconsistent one.
 */
const PIXEL: Record<string, string> = {
  Activity: "SpeedFast", ArrowUpDown: "SortVertical", Boxes: "Archive",
  CalendarDays: "Calendar", CircleAlert: "SquareAlert", CircleCheck: "CheckDouble",
  CornerDownLeft: "ArrowLeftBox", EllipsisVertical: "MoreVertical",
  Fuel: "BatteryMedium", Gauge: "SpeedMedium", Info: "CircleInfo",
  LayoutDashboard: "Layout", LayoutGrid: "Grid2x22", LifeBuoy: "Radio",
  List: "Bulletlist", Loader2: "Loader", LogOut: "Logout",
  OctagonX: "Close", PackageCheck: "Archive", PackagePlus: "Archive",
  Paintbrush: "Brush", Palette: "Brush", PanelLeft: "Layout", Paperclip: "Attachment",
  RadioTower: "CellularSignal3", RefreshCw: "Reload", RotateCcw: "Undo",
  Settings: "Gear", Sparkles: "Zap", TriangleAlert: "WarningDiamond",
  ArrowUpRight: "ArrowUp", ArrowDownRight: "ArrowDown",
  SlidersHorizontal: "Sliders", ShieldCheck: "Shield",
}

const phHas = (n: string) => n in ph
const pxHas = (n: string) => existsSync(`node_modules/pixelarticons/react/${n}.js`)

const rows: { name: string; phosphor: string | null; pixel: string | null }[] = []
for (const raw of [...used].sort()) {
  const b = base(raw)
  const p = PHOSPHOR[b] ?? b
  const x = PIXEL[b] ?? b
  rows.push({ name: raw, phosphor: phHas(p) ? p : null, pixel: pxHas(x) ? x : null })
}

const missPh = rows.filter((r) => !r.phosphor).map((r) => base(r.name))
const missPx = rows.filter((r) => !r.pixel).map((r) => base(r.name))
console.log(`${rows.length} icons in use`)
console.log(`phosphor: ${rows.length - missPh.length} resolved, ${missPh.length} missing`)
if (missPh.length) console.log(`  ${missPh.join(", ")}`)
console.log(`pixel:    ${rows.length - missPx.length} resolved, ${missPx.length} missing`)
if (missPx.length) console.log(`  ${missPx.join(", ")}`)

if (process.argv.includes("--write")) {
  const uniq = (a: string[]) => [...new Set(a)]
  const out = `/* GENERATED by scripts/icons/build-registry.mts — do not edit by hand. */
import type { ComponentType, SVGProps } from "react"

import {
${rows.map((r) => `  ${base(r.name)} as Lu${base(r.name)},`).join("\n")}
} from "lucide-react"
import {
${uniq(rows.map((r) => r.phosphor ?? "").filter(Boolean)).map((n) => `  ${n} as Ph${n},`).join("\n")}
} from "@phosphor-icons/react"
${uniq(rows.map((r) => r.pixel ?? "").filter(Boolean)).map((n) => `import { ${n} as Px${n} } from "pixelarticons/react/${n}"`).join("\n")}

export type Glyph = ComponentType<SVGProps<SVGSVGElement>>

/** One row per icon: the same idea, drawn by three different hands. */
export const registry = {
${rows
  .map(
    (r) =>
      `  ${base(r.name)}: { lucide: Lu${base(r.name)} as Glyph` +
      (r.phosphor ? `, phosphor: Ph${r.phosphor} as unknown as Glyph` : "") +
      (r.pixel ? `, pixel: Px${r.pixel} as Glyph` : "") +
      ` },`
  )
  .join("\n")}
} satisfies Record<string, { lucide: Glyph; phosphor?: Glyph; pixel?: Glyph }>

export const iconNames = Object.keys(registry) as (keyof typeof registry)[]
`
  writeFileSync("src/components/icons/registry.ts", out)
  console.log("\nwritten to src/components/icons/registry.ts")

  // The shim's export list has to mirror the registry exactly. Typed by hand it
  // did not: two names that no icon uses slipped in and the module failed to
  // compile. It is generated between markers instead.
  const shimPath = "src/components/icons/index.tsx"
  const shim = readFileSync(shimPath, "utf8")
  // lucide exports every icon under two names, bare and `…Icon` suffixed, and
  // the codebase uses both. The shim has to mirror both or the swap is partial.
  const names = rows.map((r) => base(r.name)).sort()
  const lines: string[] = []
  for (let i = 0; i < names.length; i += 6) lines.push("  " + names.slice(i, i + 6).join(", ") + ",")
  const aliases = names.map((n) => `export const ${n}Icon = icons.${n}`).join("\n")
  const block = `export const {\n${lines.join("\n")}\n} = icons\n\n${aliases}`
  const START = "/* GENERATED EXPORTS — start */"
  const END = "/* GENERATED EXPORTS — end */"
  const a = shim.indexOf(START)
  const b = shim.indexOf(END)
  if (a === -1 || b === -1) throw new Error("the shim is missing its generated-exports markers")
  writeFileSync(shimPath, shim.slice(0, a + START.length) + "\n" + block + "\n" + shim.slice(b))
  console.log(`exports regenerated in ${shimPath} (${names.length} names)`)
}
