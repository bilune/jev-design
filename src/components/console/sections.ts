import {
  BoxesIcon,
  CalendarDaysIcon,
  GaugeIcon,
  TriangleAlertIcon,
  TruckIcon,
} from "@/components/icons"

/**
 * The five places this console goes.
 *
 * They used to be written twice: once as tabs in the console and once as nav
 * items in the sidebar, in a different order, with no relation between the two
 * lists. On a desktop that reads as redundancy; on a phone it was two separate
 * navigations to the same five screens, both parked at the top of the viewport
 * and costing 124px of an 844px screen between them.
 *
 * One list now. The tabs render it on a wide screen, the bottom bar renders it
 * on a phone, and the header reads the current entry to say where you are.
 */
/* The labels are not abbreviated for the bar. The first draft shortened them
   to fit — and "Ships" in a freight console reads as vessels, which is a
   different thing from shipments. They measure 62px at the default scale in a
   78px slot, so there was nothing to buy with the ambiguity. */
export const sections = [
  { value: "overview", label: "Overview", icon: GaugeIcon },
  { value: "shipments", label: "Shipments", icon: BoxesIcon },
  { value: "incidents", label: "Incidents", icon: TriangleAlertIcon },
  { value: "fleet", label: "Fleet", icon: TruckIcon },
  { value: "schedule", label: "Schedule", icon: CalendarDaysIcon },
] as const

export type SectionValue = (typeof sections)[number]["value"]

export const sectionLabel = (value: string) =>
  sections.find((s) => s.value === value)?.label ?? ""
