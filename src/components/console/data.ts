export type Status = "in-transit" | "delayed" | "delivered" | "pending"

export type Shipment = {
  id: string
  customer: string
  origin: string
  destination: string
  driver: string
  driverInitials: string
  status: Status
  eta: string
  progress: number
  value: number
  packages: number
  priority: "high" | "medium" | "low"
}

export const statusLabel: Record<Status, string> = {
  "in-transit": "In transit",
  delayed: "Delayed",
  delivered: "Delivered",
  pending: "Pending",
}

export const shipments: Shipment[] = [
  { id: "NDO-4821", customer: "Great Lakes Glass", origin: "Chicago, IL", destination: "Indianapolis, IN", driver: "M. Duarte", driverInitials: "MD", status: "in-transit", eta: "Today 6:40 PM", progress: 72, value: 184300, packages: 12, priority: "high" },
  { id: "NDO-4822", customer: "Southside Distribution", origin: "Newark, NJ", destination: "Boston, MA", driver: "J. Ferreyra", driverInitials: "JF", status: "delayed", eta: "Tomorrow 9:15 AM", progress: 38, value: 92750, packages: 4, priority: "high" },
  { id: "NDO-4823", customer: "Prairie Textiles", origin: "Dallas, TX", destination: "Phoenix, AZ", driver: "L. Ocampo", driverInitials: "LO", status: "delivered", eta: "Delivered 11:02 AM", progress: 100, value: 341900, packages: 28, priority: "medium" },
  { id: "NDO-4824", customer: "Northern Pharma", origin: "Memphis, TN", destination: "Nashville, TN", driver: "R. Quiroga", driverInitials: "RQ", status: "in-transit", eta: "Today 9:05 PM", progress: 54, value: 67400, packages: 6, priority: "high" },
  { id: "NDO-4825", customer: "High Valley Cellars", origin: "Portland, OR", destination: "Denver, CO", driver: "S. Iriarte", driverInitials: "SI", status: "pending", eta: "Unassigned", progress: 0, value: 512000, packages: 44, priority: "medium" },
  { id: "NDO-4826", customer: "Westside Metalworks", origin: "Salt Lake City, UT", destination: "Denver, CO", driver: "P. Vensentini", driverInitials: "PV", status: "in-transit", eta: "Today 4:20 PM", progress: 88, value: 129600, packages: 9, priority: "low" },
  { id: "NDO-4827", customer: "Delta Agriculture", origin: "Houston, TX", destination: "Atlanta, GA", driver: "C. Bianchi", driverInitials: "CB", status: "delayed", eta: "Tomorrow 2:00 PM", progress: 21, value: 288400, packages: 31, priority: "medium" },
  { id: "NDO-4828", customer: "Harbor Publishing", origin: "Seattle, WA", destination: "Sacramento, CA", driver: "M. Duarte", driverInitials: "MD", status: "delivered", eta: "Delivered 8:47 AM", progress: 100, value: 45200, packages: 3, priority: "low" },
]

export const throughput = [
  { hour: "6 AM", deliveries: 12, incidents: 1 },
  { hour: "8 AM", deliveries: 34, incidents: 2 },
  { hour: "10 AM", deliveries: 58, incidents: 3 },
  { hour: "12 PM", deliveries: 71, incidents: 2 },
  { hour: "2 PM", deliveries: 64, incidents: 5 },
  { hour: "4 PM", deliveries: 88, incidents: 4 },
  { hour: "6 PM", deliveries: 97, incidents: 2 },
  { hour: "8 PM", deliveries: 61, incidents: 1 },
]

export const lanes = [
  { lane: "Midwest", load: 82 },
  { lane: "Northeast", load: 64 },
  { lane: "Southeast", load: 47 },
  { lane: "Mountain", load: 35 },
  { lane: "Pacific", load: 28 },
]

export const fleet = [
  { unit: "TR-118", driver: "M. Duarte", initials: "MD", territory: "Chicago to Indianapolis", load: 86, status: "On route", fuel: 62 },
  { unit: "TR-204", driver: "J. Ferreyra", initials: "JF", territory: "Northeast corridor", load: 54, status: "Delayed", fuel: 24 },
  { unit: "TR-330", driver: "L. Ocampo", initials: "LO", territory: "Dallas to Phoenix", load: 91, status: "On route", fuel: 78 },
  { unit: "TR-412", driver: "R. Quiroga", initials: "RQ", territory: "Tennessee Valley", load: 33, status: "At yard", fuel: 95 },
]

export const incidents = [
  {
    id: "INC-091",
    title: "Customs hold at the Laredo inland port",
    severity: "high" as const,
    shipments: ["NDO-4827"],
    detail:
      "Paperwork for three pallets was flagged for review. The broker is working it, but the release window runs 48 hours and puts the committed delivery to Delta Agriculture at risk.",
  },
  {
    id: "INC-088",
    title: "Cold chain break on TR-204",
    severity: "high" as const,
    shipments: ["NDO-4822"],
    detail:
      "The recorder logged 48 °F for 40 minutes. The load moved to a backup unit and a claim is open with the refrigeration vendor.",
  },
  {
    id: "INC-084",
    title: "Incomplete recipient address",
    severity: "medium" as const,
    shipments: ["NDO-4825"],
    detail:
      "The address is missing a suite number. Customer care reached out to High Valley Cellars and is waiting on confirmation to reschedule the pickup.",
  },
]

export const schedule = [
  { time: "8:00 AM", title: "Consolidation at the Elk Grove yard", kind: "Operations" },
  { time: "10:30 AM", title: "Incident review with the customs broker", kind: "Meeting" },
  { time: "1:00 PM", title: "Mountain convoy departure", kind: "Operations" },
  { time: "4:45 PM", title: "Daily billing cutoff", kind: "Administration" },
  { time: "7:00 PM", title: "Shift close and handoff", kind: "Operations" },
]

export const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n)

export const notifications = [
  { id: 1, text: "TR-204 reported a 45 min delay", time: "6 min ago" },
  { id: 2, text: "NDO-4823 delivered and signed", time: "22 min ago" },
  { id: 3, text: "New incident at the inland port", time: "1 h ago" },
]
