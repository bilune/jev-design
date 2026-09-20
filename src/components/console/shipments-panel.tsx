"use client"

import * as React from "react"
import {
  ArrowUpDownIcon,
  CopyIcon,
  DownloadIcon,
  EllipsisVerticalIcon,
  FilterIcon,
  LayoutGridIcon,
  ListIcon,
  ArrowRightIcon,
  EyeIcon,
  MapPinIcon,
  RefreshCwIcon,
  PhoneIcon,
  SearchIcon,
  TrashIcon,
  TruckIcon,
} from "@/components/icons"

import { toast } from "@/components/ui/toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

import { money, shipments, statusLabel, type Shipment, type Status } from "./data"

import { useIsMobile } from "@/hooks/use-mobile"

const statusVariant: Record<Status, "default" | "secondary" | "outline" | "destructive"> = {
  "in-transit": "default",
  delayed: "destructive",
  delivered: "secondary",
  pending: "outline",
}

export function ShipmentsPanel() {
  const isMobile = useIsMobile()
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState<string>("all")
  const [view, setView] = React.useState<string | null>(null)
  const [selection, setSelection] = React.useState<string[]>([])
  const [detail, setDetail] = React.useState<Shipment | null>(null)
  const [toCancel, setToCancel] = React.useState<Shipment | null>(null)
  const [loading, setLoading] = React.useState(false)

  /* Nine columns do not fit a phone, and a table that only scrolls sideways
     hides the status and the ETA behind a swipe. The cards carry the same
     fields in one column, so that is what a phone opens on. The choice is
     still the reader's: once they pick a view it holds, which is why the
     state starts null rather than at a literal. */
  const resolvedView = view ?? (isMobile ? "cards" : "table")

  const filtered = shipments.filter(
    (s) =>
      (status === "all" || s.status === status) &&
      (s.id.toLowerCase().includes(query.toLowerCase()) ||
        s.customer.toLowerCase().includes(query.toLowerCase()))
  )

  const allSelected = filtered.length > 0 && selection.length === filtered.length

  function exportManifest() {
    setLoading(true)
    window.setTimeout(() => {
      setLoading(false)
      toast.add({
        title: "Manifest exported",
        description: `${filtered.length} shipments ready to download.`,
      })
    }, 900)
  }

  return (
    <div className="ui-section">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      {/* One wrapping group, not two side by side. As two, the left group was
          full-width on a phone and the right one could only land on a line of
          its own — three rows of toolbar before a single shipment appeared.
          In one group the filter takes the first line and everything still
          standing shares the second. `md:ml-auto` on the trailing controls
          reproduces the old `justify-between` at widths that fit one line, and
          it is confined to those widths because an auto margin consumes free
          space and would force a wrap on the ones that do not. */}
      <div className="ui-toolbar flex-wrap">
          {/* "Filter" and not "Search", which is what it always did: it narrows
              the rows already on screen, it does not reach the system. The two
              were indistinguishable on a phone once the header search became a
              row — two fields 62px apart, both offering to search, doing
              different jobs. Naming them apart costs nothing and beats hiding
              one of them on this section only. */}
          <InputGroup className="w-full shrink-0 md:w-64">
            <InputGroupInput
              placeholder="Filter these shipments…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
          </InputGroup>

          <Select
            value={status}
            onValueChange={(v) => setStatus(String(v))}
            items={[
              { value: "all", label: "All statuses" },
              { value: "in-transit", label: "In transit" },
              { value: "delayed", label: "Delayed" },
              { value: "delivered", label: "Delivered" },
              { value: "pending", label: "Pending" },
            ]}
          >
            <SelectTrigger className="w-auto min-w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="in-transit">In transit</SelectItem>
              <SelectItem value="delayed">Delayed</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" className="max-md:hidden">
                  <FilterIcon />
                  Columns
                </Button>
              }
            />
            <DropdownMenuContent align="start">
              {/* Grouped for the same reason as the account menu: the label is
                  a `Menu.GroupLabel` and throws outside a `Menu.Group`. */}
              <DropdownMenuGroup>
                <DropdownMenuLabel>Show</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {["Customer", "Lane", "Driver", "ETA", "Progress", "Value"].map((c) => (
                  <DropdownMenuCheckboxItem key={c} defaultChecked>
                    {c}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

        <div className="ui-controls md:ml-auto">
          <ToggleGroup
            className="max-md:hidden"
            value={[resolvedView]}
            onValueChange={(v) => {
              const next = Array.isArray(v) ? v[0] : v
              if (next) setView(String(next))
            }}
          >
            <ToggleGroupItem value="table" aria-label="Table">
              <ListIcon />
            </ToggleGroupItem>
            <ToggleGroupItem value="cards" aria-label="Cards">
              <LayoutGridIcon />
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Two renderings of Sort, not one hidden sibling.
              `Export` was hidden inside the group with `display: none`, and a
              hidden element still matches `:last-child` — so the group kept
              styling Sort as a middle button and drew it with a square right
              edge and a stray 1px separator beside it. A group of one is not a
              group, so on a phone Sort is simply a button. */}
          <Button variant="outline" className="md:hidden">
            <ArrowUpDownIcon />
            Sort
          </Button>

          <ButtonGroup className="max-md:hidden">
            <Button variant="outline">
              <ArrowUpDownIcon />
              Sort
            </Button>
            <ButtonGroupSeparator />
            <Button variant="outline" onClick={exportManifest}>
              <DownloadIcon />
              Export
            </Button>
          </ButtonGroup>

          {/* Everything a phone does not need in the open, behind one control.
              Three rows of toolbar for a list is most of what a 390px screen
              shows above the fold, and two of those controls do not even apply:
              `Columns` governs a table the phone opens on cards instead of, and
              `Export` downloads a CSV, which is not what anyone does standing
              in a yard. They stay reachable; they stop taking a row. */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" aria-label="More" className="md:hidden">
                  <EllipsisVerticalIcon />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>View</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={resolvedView === "cards"}
                  onCheckedChange={() => setView("cards")}
                >
                  Cards
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={resolvedView === "table"}
                  onCheckedChange={() => setView("table")}
                >
                  Table
                </DropdownMenuCheckboxItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exportManifest}>
                <DownloadIcon />
                Export manifest
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Active selection ────────────────────────────────────────────── */}
      {selection.length > 0 ? (
        <div className="ui-surface ui-row flex-wrap justify-between gap-(--ui-gap-inline-x) p-(--ui-gap-inline-x)">
          <span className="ui-row">
            <Badge>{selection.length}</Badge>
            <span className="ui-muted">shipments selected</span>
          </span>
          <div className="ui-actions flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => setSelection([])}>
              Clear
            </Button>
            <Button variant="outline" size="sm">
              <TruckIcon />
              Reassign unit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setToCancel(filtered[0])}
            >
              <TrashIcon />
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {/* ── Table view ──────────────────────────────────────────────────── */}
      {resolvedView === "table" ? (
        <div className="ui-surface overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(c) =>
                      setSelection(c ? filtered.map((s) => s.id) : [])
                    }
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Shipment</TableHead>
                <TableHead>Lane</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead className="w-40">Progress</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : filtered.map((s) => (
                    <ContextMenu key={s.id}>
                      <ContextMenuTrigger
                        render={
                          <TableRow
                            data-state={
                              selection.includes(s.id) ? "selected" : undefined
                            }
                            className="cursor-pointer"
                            onClick={() => setDetail(s)}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selection.includes(s.id)}
                                onCheckedChange={(c) =>
                                  setSelection((prev) =>
                                    c
                                      ? [...prev, s.id]
                                      : prev.filter((id) => id !== s.id)
                                  )
                                }
                                aria-label={`Select ${s.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="ui-stack-tight">
                                <span className="ui-mono font-medium">{s.id}</span>
                                <span className="ui-muted">{s.customer}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="ui-row-tight whitespace-nowrap">
                                <MapPinIcon className="size-3.5 shrink-0 text-muted-foreground" />
                                {s.origin}
                                <ArrowRightIcon className="size-3 shrink-0 text-muted-foreground" />
                                {s.destination}
                              </span>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <HoverCard>
                                <HoverCardTrigger
                                  render={
                                    <button type="button" className="ui-row">
                                      <Avatar size="sm">
                                        <AvatarFallback>
                                          {s.driverInitials}
                                        </AvatarFallback>
                                      </Avatar>
                                      {s.driver}
                                    </button>
                                  }
                                />
                                <HoverCardContent className="w-72">
                                  <Item>
                                    <ItemMedia>
                                      <Avatar size="lg">
                                        <AvatarFallback>{s.driverInitials}</AvatarFallback>
                                      </Avatar>
                                    </ItemMedia>
                                    <ItemContent>
                                      <ItemTitle>{s.driver}</ItemTitle>
                                      <ItemDescription>
                                        {s.origin} territory · 6 stops today
                                      </ItemDescription>
                                    </ItemContent>
                                  </Item>
                                  <Separator className="my-2" />
                                  <Button variant="outline" size="sm" className="w-full">
                                    <PhoneIcon />
                                    Call
                                  </Button>
                                </HoverCardContent>
                              </HoverCard>
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusVariant[s.status]}>
                                {statusLabel[s.status]}
                              </Badge>
                            </TableCell>
                            <TableCell className="ui-mono text-muted-foreground">
                              {s.eta}
                            </TableCell>
                            <TableCell>
                              <Progress value={s.progress} className="w-full min-w-24" />
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {money(s.value)}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <Button variant="ghost" size="icon-sm">
                                      <EllipsisVerticalIcon />
                                    </Button>
                                  }
                                />
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setDetail(s)}>
                                    <EyeIcon />
                                    View detail
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <CopyIcon />
                                    Copy number
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => setToCancel(s)}
                                  >
                                    <TrashIcon />
                                    Cancel shipment
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        }
                      />
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => setDetail(s)}>
                          <EyeIcon />
                          Open detail
                        </ContextMenuItem>
                        <ContextMenuItem>
                          <RefreshCwIcon />
                          Reassign unit
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          variant="destructive"
                          onClick={() => setToCancel(s)}
                        >
                          <TrashIcon />
                          Cancel shipment
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="ui-grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <Item key={s.id} className="cursor-pointer" onClick={() => setDetail(s)}>
              <ItemMedia>
                <Avatar>
                  <AvatarFallback>{s.driverInitials}</AvatarFallback>
                </Avatar>
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="ui-mono">{s.id}</ItemTitle>
                {/* Customer and lane are two lines, not one wrapping row. As
                    one row the arrow wrapped on its own and a city ended up
                    orphaned above its own lane. */}
                <ItemDescription className="ui-stack-tight">
                  <span className="truncate">{s.customer}</span>
                  <span className="ui-row-tight min-w-0">
                    <span className="truncate">{s.origin}</span>
                    <ArrowRightIcon className="size-3 shrink-0" />
                    <span className="truncate">{s.destination}</span>
                  </span>
                </ItemDescription>
                <Progress value={s.progress} className="mt-2" />
              </ItemContent>
              <Badge variant={statusVariant[s.status]}>{statusLabel[s.status]}</Badge>
            </Item>
          ))}
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      <div className="ui-row flex-wrap justify-between gap-(--ui-gap-inline-x)">
        <span className="ui-muted">
          Showing {filtered.length} of {shipments.length} shipments
        </span>
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>
                1
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">2</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {/* ── Detail panel ────────────────────────────────────────────────── */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="max-sm:!w-full sm:!max-w-[30rem]">
          <SheetHeader>
            <SheetTitle className="ui-mono">{detail?.id}</SheetTitle>
            <SheetDescription className="ui-row-tight flex-wrap">
              {detail?.customer}
              <span className="text-muted-foreground/60">·</span>
              {detail?.origin}
              <ArrowRightIcon className="size-3 shrink-0" />
              {detail?.destination}
            </SheetDescription>
          </SheetHeader>

          <div className="ui-stack overflow-y-auto px-(--ui-pad-surface-x)">
            <div className="ui-grid grid-cols-2 gap-(--ui-gap-inline-x)">
              {[
                ["Status", detail ? statusLabel[detail.status] : ""],
                ["ETA", detail?.eta ?? ""],
                ["Packages", String(detail?.packages ?? "")],
                ["Declared value", detail ? money(detail.value) : ""],
              ].map(([k, v]) => (
                <div key={k} className="ui-datum">
                  <span className="ui-label text-muted-foreground">{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
            </div>

            <Separator />

            <div className="ui-stack">
              <span className="ui-label">Tracking</span>
              <ol className="ui-timeline">
                {[
                  ["Picked up at the yard", "Today 7:12 AM", true],
                  ["In transit to hub", "Today 9:40 AM", true],
                  ["Regional hub", "Today 1:05 PM", true],
                  ["Last mile", "In progress", false],
                ].map(([k, v, done], i, arr) => (
                  <li key={String(k)} className="ui-timeline-item">
                    <span className="ui-timeline-mark">
                      <span
                        className="ui-timeline-dot"
                        data-done={done ? "true" : "false"}
                      />
                      {i < arr.length - 1 ? (
                        <span className="ui-timeline-line" />
                      ) : null}
                    </span>
                    <span className="ui-stack-tight">
                      <span className="text-(length:--ui-text-sm)">{k}</span>
                      <span className="ui-muted">{v}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <Separator />

            <div className="ui-stack">
              <span className="ui-label">Assigned crew</span>
              <AvatarGroup className="gap-(--ui-gap-tight-x) space-x-0">
                <Avatar>
                  <AvatarFallback>{detail?.driverInitials}</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback>LB</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback>NR</AvatarFallback>
                </Avatar>
                <AvatarGroupCount>+2</AvatarGroupCount>
              </AvatarGroup>
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                toast.add({ title: "Unit reassigned", description: detail?.id })
                setDetail(null)
              }}
            >
              <TruckIcon />
              Reassign unit
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Destructive confirmation ────────────────────────────────────── */}
      <AlertDialog open={!!toCancel} onOpenChange={(o) => !o && setToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {toCancel?.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              The shipment leaves the manifest and the customer is notified.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                toast.add({
                  title: "Shipment cancelled",
                  description: `${toCancel?.id} left the manifest.`,
                })
                setToCancel(null)
              }}
            >
              Yes, cancel it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
