"use client"

import * as React from "react"
import {
  CalendarDaysIcon,
  CircleCheckIcon,
  FuelIcon,
  InboxIcon,
  PaperclipIcon,
  PlusIcon,
  TriangleAlertIcon,
  TruckIcon,
} from "@/components/icons"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item"
import { Progress } from "@/components/ui/progress"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useIsMobile } from "@/hooks/use-mobile"

import { fleet, incidents, schedule } from "./data"

/* ═══ INCIDENTS ═════════════════════════════════════════════════════════ */

export function IncidentsPanel() {
  return (
    <div className="ui-grid grid-cols-1 xl:grid-cols-3">
      <div className="ui-section xl:col-span-2">
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>Two high-severity incidents are still open</AlertTitle>
          <AlertDescription>
            They put committed deliveries for today at risk and need a call
            from the shift supervisor.
          </AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm">
              Escalate
            </Button>
          </AlertAction>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Open incidents</CardTitle>
            <CardDescription>
              Sorted by impact on today’s manifest.
            </CardDescription>
            <CardAction>
              <Button variant="outline" size="sm">
                <PlusIcon />
                Log one
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <Accordion defaultValue={["INC-091"]}>
              {incidents.map((i) => (
                <AccordionItem key={i.id} value={i.id}>
                  <AccordionTrigger>
                    <span className="ui-row">
                      <Badge
                        variant={i.severity === "high" ? "destructive" : "secondary"}
                      >
                        {i.severity}
                      </Badge>
                      <span className="ui-mono text-muted-foreground">{i.id}</span>
                      {i.title}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="ui-stack">
                      <p className="text-muted-foreground">{i.detail}</p>
                      <div className="ui-row flex-wrap">
                        <span className="ui-label text-muted-foreground">
                          Affected shipments
                        </span>
                        {i.shipments.map((e) => (
                          <Badge key={e} variant="outline" className="ui-mono">
                            {e}
                          </Badge>
                        ))}
                      </div>
                      <Textarea placeholder="Add a note to the case…" rows={2} />
                      <div className="ui-actions flex-wrap">
                        <Button variant="ghost" size="sm">
                          <PaperclipIcon />
                          Attach
                        </Button>
                        <Button size="sm">
                          <CircleCheckIcon />
                          Mark resolved
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer claims</CardTitle>
          <CardDescription>Inbox for the shift.</CardDescription>
        </CardHeader>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <InboxIcon />
              </EmptyMedia>
              <EmptyTitle>No claims pending</EmptyTitle>
              <EmptyDescription>
                Everything that came in this shift has already been answered by
                customer care.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" size="sm">
                View history
              </Button>
            </EmptyContent>
          </Empty>
        </CardContent>
        <CardFooter>
          <span className="ui-muted ui-row-tight">
            <Spinner className="size-3.5" />
            Syncing inbox…
          </span>
        </CardFooter>
      </Card>
    </div>
  )
}

/* ═══ FLEET ═════════════════════════════════════════════════════════════ */

export function FleetPanel() {
  /* The two halves resize against each other on a desktop and stack on a
     phone. A drag handle needs a pointer and 35% of a 375px viewport is 131px
     of panel, so below the breakpoint the group becomes an ordinary column
     and the handle goes away with it. */
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <div className="ui-section">
        <FleetUnits />
        <YardCameras />
      </div>
    )
  }

  return (
    <ResizablePanelGroup className="min-h-[32rem]">
      <ResizablePanel defaultSize={62} minSize={35}>
        <div className="ui-section pr-(--ui-gap-section-x)">
          <FleetUnits />
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={38} minSize={25}>
        <div className="ui-section pl-(--ui-gap-section-x)">
          <YardCameras />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

function FleetUnits() {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Units in service</CardTitle>
        <CardDescription>
          Live status of the fleet assigned to this shift.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ItemGroup>
          {fleet.map((u, i) => (
            <React.Fragment key={u.unit}>
              <Item>
                <ItemMedia>
                  <Avatar>
                    <AvatarFallback>{u.initials}</AvatarFallback>
                  </Avatar>
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="ui-row-tight">
                    <span className="ui-mono">{u.unit}</span>
                    <span className="text-muted-foreground/50">·</span>
                    {u.driver}
                  </ItemTitle>
                  <ItemDescription>{u.territory}</ItemDescription>
                  <div className="ui-row mt-(--ui-gap-hairline-x)">
                    <Progress value={u.load} className="w-40 max-w-full" />
                    <span className="ui-meta">{u.load}% load</span>
                  </div>
                </ItemContent>
                {/* The unit's badges wrap under the row rather than squeezing
                    the name: an item that runs out of width should lose the
                    line, not the reading. */}
                <ItemActions className="flex-wrap">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Badge variant={u.fuel < 30 ? "destructive" : "secondary"}>
                          <FuelIcon />
                          {u.fuel}%
                        </Badge>
                      }
                    />
                    <TooltipContent>Fuel remaining</TooltipContent>
                  </Tooltip>
                  <Badge variant={u.status === "Delayed" ? "destructive" : "outline"}>
                    {u.status}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </ItemActions>
              </Item>
              {i < fleet.length - 1 ? <ItemSeparator /> : null}
            </React.Fragment>
          ))}
        </ItemGroup>
      </CardContent>
    </Card>
  )
}

function YardCameras() {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Yard cameras</CardTitle>
        <CardDescription>Docks 1 to 4, Elk Grove Village.</CardDescription>
      </CardHeader>
      <CardContent>
        <Carousel>
          <CarouselContent>
            {["Dock 1", "Dock 2", "Dock 3", "Dock 4"].map((a) => (
              <CarouselItem key={a}>
                <AspectRatio
                  ratio={16 / 9}
                  className="ui-surface flex items-center justify-center bg-muted"
                >
                  <span className="ui-muted ui-row-tight">
                    <TruckIcon className="size-4" />
                    {a}
                  </span>
                </AspectRatio>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2" />
          <CarouselNext className="right-2" />
        </Carousel>
      </CardContent>
    </Card>
  )
}

/* ═══ SCHEDULE ══════════════════════════════════════════════════════════ */

export function SchedulePanel() {
  const [date, setDate] = React.useState<Date | undefined>(new Date())

  return (
    <div className="ui-grid grid-cols-1 xl:grid-cols-3">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Operations calendar</CardTitle>
          <CardDescription>Pick a day to see its plan.</CardDescription>
        </CardHeader>
        <CardContent>
          <Calendar mode="single" selected={date} onSelect={setDate} />
        </CardContent>
      </Card>

      <Card className="h-fit xl:col-span-2">
        <CardHeader>
          <CardTitle>Day plan</CardTitle>
          <CardDescription>
            <span className="ui-row">
              <CalendarDaysIcon className="size-3.5" />
              {date?.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </span>
          </CardDescription>
          <CardAction>
            <Button variant="outline" size="sm">
              <PlusIcon />
              Add milestone
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[26rem]">
            <ItemGroup>
              {schedule.map((a, i) => (
                <React.Fragment key={a.time}>
                  <Item>
                    <ItemMedia>
                      <span className="ui-meta w-16 shrink-0">
                        {a.time}
                      </span>
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{a.title}</ItemTitle>
                      <ItemDescription>{a.kind}</ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Button variant="ghost" size="sm">
                        Detail
                      </Button>
                    </ItemActions>
                  </Item>
                  {i < schedule.length - 1 ? <ItemSeparator /> : null}
                </React.Fragment>
              ))}
            </ItemGroup>
          </ScrollArea>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm">
            Export schedule
          </Button>
          <Button size="sm">Confirm plan</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
