"use client"

import * as React from "react"
import { IconContext as PhosphorContext } from "@phosphor-icons/react"

import { useDesign } from "@/design/design-provider"
import type { DesignFlags } from "@/design/tokens"

import { registry, type Glyph } from "./registry"

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  ICONS — the last thing the engine did not reach
 * ─────────────────────────────────────────────────────────────────────────────
 *  Every file in the project imported its icons from `lucide-react` by name.
 *  This module exports the same names, so swapping the whole icon set is a
 *  change of import specifier and nothing else: no JSX was touched, and no
 *  component knows which family it is drawing in.
 *
 *  A family is a FLAG, not a scalar, because there is nothing between a stroke
 *  and a bitmap.
 *
 *  What IS continuous — how heavy the drawing is — is DERIVED from the system's
 *  line weight and never asked. That resolves a conflict rather than saving a
 *  question: Phosphor carries its own weight axis, and the CSS rule that gives
 *  lucide its stroke would have overridden it, flattening thin, regular and
 *  bold into one. So lucide takes the stroke from CSS, Phosphor takes a weight
 *  computed from the same token, and the pixel set takes neither because it is
 *  drawn in filled squares. One line weight, three ways of obeying it.
 */

type Source = "lucide" | "phosphor" | "pixel"
type PhosphorWeight = "thin" | "light" | "regular" | "bold" | "fill" | "duotone"

const FAMILIES: Record<DesignFlags["iconFamily"], Source> = {
  stroke: "lucide",
  rounded: "phosphor",
  solid: "phosphor",
  pixel: "pixel",
  /* `none` still needs a drawing: an icon with no label beside it is the only
     thing telling you what the control does, so it stays. What goes is the
     icon that repeats a word — and that is decided in CSS, by whether there is
     a word next to it, not here. */
  none: "lucide",
}

/** The same line weight the borders use, expressed as a Phosphor weight. */
function phosphorWeight(family: DesignFlags["iconFamily"], borderWidth: string): PhosphorWeight {
  if (family === "solid") return "fill"
  const px = parseFloat(borderWidth) || 1
  if (px < 1.3) return "thin"
  if (px < 1.8) return "light"
  if (px < 2.5) return "regular"
  return "bold"
}

/**
 * Phosphor reads its weight from context, so the whole tree changes from one
 * place. Wrapping at the root rather than per icon also means the weight is not
 * recomputed 60 times per render.
 */
export function IconFamilyProvider({ children }: { children: React.ReactNode }) {
  const { config } = useDesign()
  const weight = phosphorWeight(config.flags.iconFamily, config.scalars.borderWidth)
  const value = React.useMemo(() => ({ weight, size: "1em" }) as never, [weight])
  return <PhosphorContext.Provider value={value}>{children}</PhosphorContext.Provider>
}

/**
 * Not every idea exists in every set. When a family has no glyph for a name the
 * icon falls back to the stroke set rather than disappearing: a missing glyph
 * is a broken screen, and a slightly foreign one is only a blemish.
 */
function resolve(name: keyof typeof registry, source: Source): Glyph {
  const row = registry[name] as Partial<Record<Source, Glyph>>
  return row[source] ?? row.lucide!
}

function make(name: keyof typeof registry) {
  const Component = (props: React.SVGProps<SVGSVGElement>) => {
    const { config } = useDesign()
    // `createElement` rather than binding the result to a capitalised variable
    // and rendering it: this only SELECTS an existing component, but the JSX
    // form is indistinguishable from defining one during render, which is a
    // real bug elsewhere and is linted as such.
    return React.createElement(resolve(name, FAMILIES[config.flags.iconFamily]), props)
  }
  Component.displayName = String(name)
  return Component
}

const icons = Object.fromEntries(
  (Object.keys(registry) as (keyof typeof registry)[]).map((n) => [n, make(n)])
) as Record<keyof typeof registry, React.ComponentType<React.SVGProps<SVGSVGElement>>>

/* The exported surface mirrors lucide's, name for name, so the import
   specifier is the only thing that had to change anywhere. */
/* GENERATED EXPORTS — start */
export const {
  Activity, ArrowDown, ArrowDownRight, ArrowRight, ArrowUpDown, ArrowUpRight,
  Bell, Boxes, Calendar, CalendarDays, Check, ChevronDown,
  ChevronLeft, ChevronRight, ChevronUp, CircleAlert, CircleCheck, Clock,
  Copy, CornerDownLeft, Download, EllipsisVertical, Eye, Filter,
  Fuel, Gauge, Inbox, Info, LayoutDashboard, LayoutGrid,
  LifeBuoy, List, Loader2, LogOut, Map, MapPin,
  Minus, MoreHorizontal, OctagonX, PackageCheck, PackagePlus, Paintbrush,
  PanelLeft, Paperclip, Phone, Plus, RadioTower, RefreshCw,
  RotateCcw, Search, Settings, ShieldCheck, Sparkles, Trash,
  TriangleAlert, Truck, User, Users, Wallet, X,
} = icons

export const ActivityIcon = icons.Activity
export const ArrowDownIcon = icons.ArrowDown
export const ArrowDownRightIcon = icons.ArrowDownRight
export const ArrowRightIcon = icons.ArrowRight
export const ArrowUpDownIcon = icons.ArrowUpDown
export const ArrowUpRightIcon = icons.ArrowUpRight
export const BellIcon = icons.Bell
export const BoxesIcon = icons.Boxes
export const CalendarIcon = icons.Calendar
export const CalendarDaysIcon = icons.CalendarDays
export const CheckIcon = icons.Check
export const ChevronDownIcon = icons.ChevronDown
export const ChevronLeftIcon = icons.ChevronLeft
export const ChevronRightIcon = icons.ChevronRight
export const ChevronUpIcon = icons.ChevronUp
export const CircleAlertIcon = icons.CircleAlert
export const CircleCheckIcon = icons.CircleCheck
export const ClockIcon = icons.Clock
export const CopyIcon = icons.Copy
export const CornerDownLeftIcon = icons.CornerDownLeft
export const DownloadIcon = icons.Download
export const EllipsisVerticalIcon = icons.EllipsisVertical
export const EyeIcon = icons.Eye
export const FilterIcon = icons.Filter
export const FuelIcon = icons.Fuel
export const GaugeIcon = icons.Gauge
export const InboxIcon = icons.Inbox
export const InfoIcon = icons.Info
export const LayoutDashboardIcon = icons.LayoutDashboard
export const LayoutGridIcon = icons.LayoutGrid
export const LifeBuoyIcon = icons.LifeBuoy
export const ListIcon = icons.List
export const Loader2Icon = icons.Loader2
export const LogOutIcon = icons.LogOut
export const MapIcon = icons.Map
export const MapPinIcon = icons.MapPin
export const MinusIcon = icons.Minus
export const MoreHorizontalIcon = icons.MoreHorizontal
export const OctagonXIcon = icons.OctagonX
export const PackageCheckIcon = icons.PackageCheck
export const PackagePlusIcon = icons.PackagePlus
export const PaintbrushIcon = icons.Paintbrush
export const PanelLeftIcon = icons.PanelLeft
export const PaperclipIcon = icons.Paperclip
export const PhoneIcon = icons.Phone
export const PlusIcon = icons.Plus
export const RadioTowerIcon = icons.RadioTower
export const RefreshCwIcon = icons.RefreshCw
export const RotateCcwIcon = icons.RotateCcw
export const SearchIcon = icons.Search
export const SettingsIcon = icons.Settings
export const ShieldCheckIcon = icons.ShieldCheck
export const SparklesIcon = icons.Sparkles
export const TrashIcon = icons.Trash
export const TriangleAlertIcon = icons.TriangleAlert
export const TruckIcon = icons.Truck
export const UserIcon = icons.User
export const UsersIcon = icons.Users
export const WalletIcon = icons.Wallet
export const XIcon = icons.X
/* GENERATED EXPORTS — end */
