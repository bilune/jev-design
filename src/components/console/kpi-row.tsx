"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  ClockIcon,
  PackageCheckIcon,
  TriangleAlertIcon,
  WalletIcon,
} from "@/components/icons"

import { useChartRadius, useChartStyle } from "@/design/use-design-value"
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
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { lanes, throughput } from "./data"

const kpis = [
  {
    label: "Deliveries today",
    value: "487",
    delta: "+12.4%",
    up: true,
    icon: PackageCheckIcon,
    hint: "Against the same shift last week",
    foot: "vs. last week",
    progress: 78,
  },
  {
    label: "On-time rate",
    value: "93.1%",
    delta: "+2.0 pp",
    up: true,
    icon: ClockIcon,
    hint: "Shipments delivered inside the committed window",
    foot: "Within window",
    progress: 93,
  },
  {
    label: "Open incidents",
    value: "3",
    delta: "−1",
    up: false,
    icon: TriangleAlertIcon,
    hint: "Two high-severity cases still unresolved",
    foot: "2 high severity",
    progress: 24,
  },
  {
    label: "Revenue",
    value: "$1.66M",
    delta: "+8.7%",
    up: true,
    icon: WalletIcon,
    hint: "Running total for the current shift",
    foot: "Shift to date",
    progress: 62,
  },
]

const chartConfig = {
  deliveries: { label: "Deliveries", color: "var(--chart-1)" },
  incidents: { label: "Incidents", color: "var(--chart-3)" },
  load: { label: "Load", color: "var(--chart-1)" },
} satisfies ChartConfig

export function KpiRow() {
  return (
    <div className="ui-figures">
      {kpis.map((k) => (
        <Card key={k.label}>
          <CardHeader>
            <CardDescription>{k.label}</CardDescription>
            <CardTitle data-ui-title-role="metric">
              {k.value}
            </CardTitle>
            <CardAction>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Badge variant={k.up ? "secondary" : "outline"}>
                      {k.up ? <ArrowUpRightIcon /> : <ArrowDownRightIcon />}
                      {k.delta}
                    </Badge>
                  }
                />
                <TooltipContent>{k.hint}</TooltipContent>
              </Tooltip>
            </CardAction>
          </CardHeader>
          <CardContent>
            <Progress value={k.progress} />
          </CardContent>
          <CardFooter className="mt-auto">
            <span className="ui-muted ui-row-tight min-w-0">
              <k.icon className="size-3.5 shrink-0" />
              <span className="truncate">{k.foot}</span>
            </span>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

export function ChartsRow() {
  const radius = useChartRadius()
  const chart = useChartStyle()

  return (
    <div className="ui-panels">
      <Card data-ui-panel="major">
        <CardHeader>
          <CardTitle>Shift throughput</CardTitle>
          <CardDescription>
            Completed deliveries and opened incidents, by hour.
          </CardDescription>
          <CardAction>
            <Button variant="ghost" size="sm">
              View detail
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          <ChartContainer config={chartConfig} className="aspect-auto h-full min-h-64 w-full">
            <AreaChart data={throughput} margin={{ left: 4, right: 16, top: 8, bottom: 0 }}>
              {/* Diagonal ruling, for styles that fill an area the way a printed
                  chart does. One pattern per series, because a pattern carries
                  its own colour and cannot inherit the series'. */}
              {chart.gradient ? (
                <defs>
                  {(["deliveries", "incidents"] as const).map((k) => (
                    <linearGradient key={k} id={`hatch-${k}-grad`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={`var(--color-${k})`} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={`var(--color-${k})`} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
              ) : null}
              {chart.hatched ? (
                <defs>
                  {(["deliveries", "incidents"] as const).map((k) => (
                    <pattern
                      key={k}
                      id={`hatch-${k}`}
                      width="6"
                      height="6"
                      patternUnits="userSpaceOnUse"
                      patternTransform="rotate(45)"
                    >
                      <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="6"
                        stroke={`var(--color-${k})`}
                        strokeWidth={chart.strokeWidth}
                        opacity={0.55}
                      />
                    </pattern>
                  ))}
                </defs>
              ) : null}
              {chart.grid ? (
                <CartesianGrid vertical={false} strokeDasharray={chart.grid.strokeDasharray} />
              ) : null}
              <XAxis dataKey="hour" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} width={32} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {/* The entry animation is off on every mark. Recharts animates a
                  clip rectangle from zero to the plot width, and it reads that
                  width at mount — when the container has not been measured yet
                  the animation captures a zero, never recovers, and the chart
                  renders complete geometry clipped to nothing. A stray resize
                  event fixes it, which is exactly the kind of bug that hides
                  until the bundle grows.

                  It is also a geometry animation, which this system says
                  elsewhere it does not do. Turning it off follows our own rule
                  rather than working around a race. */}
              {(["deliveries", "incidents"] as const).map((k) => (
                <Area
                  key={k}
                  isAnimationActive={false}
                  dataKey={k}
                  type={chart.curve}
                  stroke={`var(--color-${k})`}
                  strokeWidth={chart.strokeWidth}
                  dot={chart.marker}
                  {...chart.fillFor(`var(--color-${k})`, `hatch-${k}`)}
                />
              ))}
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Load by lane</CardTitle>
          <CardDescription>Utilization against available capacity.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          <ChartContainer config={chartConfig} className="aspect-auto h-full min-h-64 w-full">
            <BarChart data={lanes} layout="vertical" margin={{ left: 8 }}>
              {chart.grid ? (
                <CartesianGrid horizontal={false} strokeDasharray={chart.grid.strokeDasharray} />
              ) : null}
              <XAxis type="number" hide />
              <YAxis
                dataKey="lane"
                type="category"
                tickLine={false}
                axisLine={false}
                width={72}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar isAnimationActive={false} dataKey="load" fill="var(--color-load)" radius={radius} barSize={18} />
            </BarChart>
          </ChartContainer>
        </CardContent>
        <CardFooter>
          <span className="ui-muted">Updated 3 minutes ago</span>
        </CardFooter>
      </Card>
    </div>
  )
}

export function MiniTrend() {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-16 w-full">
      <LineChart data={throughput}>
        <Line
          isAnimationActive={false}
          dataKey="deliveries"
          type="monotone"
          stroke="var(--color-deliveries)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  )
}
