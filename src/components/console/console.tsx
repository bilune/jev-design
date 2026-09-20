"use client"

import * as React from "react"

import { useDesign } from "@/design/design-provider"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { AppSidebar } from "./app-sidebar"
import { DesignPanel } from "./design-panel"
import { ChartsRow, KpiRow } from "./kpi-row"
import { NewShipmentDialog } from "./new-shipment-dialog"
import { FleetPanel, IncidentsPanel, SchedulePanel } from "./other-panels"
import { sections, type SectionValue } from "./sections"
import { ShipmentsPanel } from "./shipments-panel"
import { TabBar } from "./tab-bar"
import { TopBar } from "./top-bar"

export function Console() {
  const [newShipment, setNewShipment] = React.useState(false)
  const { config } = useDesign()

  /* The tabs are controlled now. They were not, and they did not need to be
     while one list drove them; the bottom bar is a second way into the same
     state, and the header reads it to name the section you are in. */
  const [section, setSection] = React.useState<SectionValue>("overview")

  // The sidebar goes before or after the content depending on which side it
  // shows on, so the space it reserves always lands on the correct side.
  const navAtStart = config.flags.navSide === "left"

  return (
    <SidebarProvider>
      <div className="ui-shell">
        {navAtStart ? <AppSidebar /> : null}
        <SidebarInset className="min-w-0">
          <TopBar section={section} onNewShipment={() => setNewShipment(true)} />

          <main className="ui-page">
            <Tabs
              value={section}
              onValueChange={(v) => setSection(v as SectionValue)}
            >
              {/* The strip is the wide-screen rendering of the section list.
                  On a phone the same list is the bottom bar, so this one goes:
                  two copies of one navigation is what we were removing. */}
              <TabsList className="ui-scroll-x max-md:hidden">
                {sections.map((s) => (
                  <TabsTrigger key={s.value} value={s.value}>
                    <s.icon />
                    {s.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="overview">
                <div className="ui-section">
                  <KpiRow />
                  <ChartsRow />
                </div>
              </TabsContent>

              <TabsContent value="shipments">
                <ShipmentsPanel />
              </TabsContent>

              <TabsContent value="incidents">
                <IncidentsPanel />
              </TabsContent>

              <TabsContent value="fleet">
                <FleetPanel />
              </TabsContent>

              <TabsContent value="schedule">
                <SchedulePanel />
              </TabsContent>
            </Tabs>
          </main>
        </SidebarInset>
        {navAtStart ? null : <AppSidebar />}
      </div>

      <NewShipmentDialog open={newShipment} onOpenChange={setNewShipment} />

      {/* The floating design trigger lives here and not in the header: the
          header has a backdrop filter, and that makes it the containing block
          for any fixed element inside it. */}
      <DesignPanel />

      <TabBar value={section} onValueChange={setSection} />
    </SidebarProvider>
  )
}
