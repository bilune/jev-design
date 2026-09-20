"use client"

import {
  ActivityIcon,
  BoxesIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  ClockIcon,
  DownloadIcon,
  InfoIcon,
  LayoutDashboardIcon,
  LifeBuoyIcon,
  LogOutIcon,
  MapIcon,
  RadioTowerIcon,
  RefreshCwIcon,
  SettingsIcon,
  TruckIcon,
  UserIcon,
  UsersIcon,
} from "@/components/icons"

import { useDesign } from "@/design/design-provider"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"

const nav = [
  { title: "Overview", icon: LayoutDashboardIcon, active: true },
  { title: "Shipments", icon: BoxesIcon, badge: "48" },
  { title: "Fleet", icon: TruckIcon },
  { title: "Incidents", icon: CircleAlertIcon, badge: "3" },
  { title: "Schedule", icon: CalendarDaysIcon },
]

export function AppSidebar() {
  const { config } = useDesign()

  return (
    <Sidebar side={config.flags.navSide} collapsible="icon">
      <SidebarHeader>
        <div className="ui-brand group-data-[collapsible=icon]:justify-center">
          <span className="ui-brand-mark">
            <RadioTowerIcon className="size-4" />
          </span>
          <span className="ui-stack-tight group-data-[collapsible=icon]:hidden">
            <span className="ui-title truncate text-(length:--ui-text-sm)">
              Nodo
            </span>
            <span className="ui-muted truncate">Control Tower</span>
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* The five sections are the bottom bar on a phone. Repeating them here
            would put the duplication back, moved from the top of the screen
            into the drawer. On a wide screen there is no bottom bar and this is
            the navigation, so it stays. */}
        <SidebarGroup className="max-md:hidden">
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton isActive={item.active} tooltip={item.title}>
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                  {item.badge ? (
                    <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Network</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible defaultOpen>
                <SidebarMenuItem>
                  <CollapsibleTrigger
                    render={
                      <SidebarMenuButton tooltip="Lanes">
                        <MapIcon />
                        <span>Lanes</span>
                        <ChevronRightIcon className="ml-auto transition-transform group-data-[panel-open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    }
                  />
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {["Midwest", "Northeast", "Southeast", "Mountain", "Pacific"].map((r) => (
                        <SidebarMenuSubItem key={r}>
                          <SidebarMenuSubButton>{r}</SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Team">
                  <UsersIcon />
                  <span>Team</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Telemetry">
                  <ActivityIcon />
                  <span>Telemetry</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {/* The shift commands only exist here on a phone. On a desktop they
            are the menu bar in the header, and putting them in both places
            would rebuild the duplication we just removed from the navigation,
            one row lower. */}
        <SidebarGroup className="md:hidden">
          <SidebarGroupLabel>Shift</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {[
                { title: "Open shift", icon: ClockIcon },
                { title: "Hand off to night shift", icon: RefreshCwIcon },
                { title: "Daily manifest (CSV)", icon: DownloadIcon },
              ].map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton tooltip={item.title}>
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="md:hidden">
          <SidebarGroupLabel>Help</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {[
                { title: "Operations handbook", icon: InfoIcon },
                { title: "Contact support", icon: LifeBuoyIcon },
              ].map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton tooltip={item.title}>
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />

        {/* The account was an avatar in the header's trailing edge. It is the
            control reached for least and it was taking one of four slots on a
            row that had two. A drawer footer is where a phone keeps it. */}
        <div className="ui-stack md:hidden">
          <div className="ui-row min-w-0">
            <Avatar size="sm">
              <AvatarFallback>GB</AvatarFallback>
            </Avatar>
            <span className="ui-stack-tight min-w-0">
              <span className="ui-title truncate text-(length:--ui-text-sm)">
                Gonzalo Bilune
              </span>
              <span className="ui-muted truncate">Shift supervisor</span>
            </span>
          </div>
          <SidebarMenu>
            {[
              { title: "Profile", icon: UserIcon },
              { title: "Preferences", icon: SettingsIcon },
              { title: "Sign out", icon: LogOutIcon },
            ].map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton tooltip={item.title}>
                  <item.icon />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          <SidebarSeparator />
        </div>
        <div className="ui-stack group-data-[collapsible=icon]:hidden">
          <Progress value={68}>
            <ProgressLabel className="text-(length:--ui-text-xs)">
              Capacity today
            </ProgressLabel>
            <ProgressValue className="text-(length:--ui-text-xs)" />
          </Progress>
          <Badge variant="outline" className="w-fit">
            <LifeBuoyIcon />
            24/7 support
          </Badge>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
