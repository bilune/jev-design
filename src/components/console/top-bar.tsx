"use client"

import * as React from "react"
import {
  BellIcon,
  CheckIcon,
  ChevronDownIcon,
  LogOutIcon,
  PackagePlusIcon,
  SearchIcon,
  SettingsIcon,
  TruckIcon,
  UserIcon,
} from "@/components/icons"

import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { notifications, shipments } from "./data"
import { sectionLabel } from "./sections"

export function TopBar({
  section,
  onNewShipment,
}: {
  section: string
  onNewShipment: () => void
}) {
  const [cmdOpen, setCmdOpen] = React.useState(false)

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCmdOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  return (
    /* The header scrolls away on a phone and stays put on a desktop.
     *
     * Two reasons, and the second is the one that forced it. A phone already
     * has permanent chrome at the bottom — the section bar — and pinning a
     * second band at the top spends 92px of an 844px screen on something the
     * bar already answers. And the search row collided: on Shipments it sat
     * 62px above the panel's own "Search by ID or customer", two fields asking
     * for the same thing at two different levels. Letting the band go leaves
     * one of them on screen, which is the one you meant to use. */
    <header className="z-30 flex flex-col border-b border-border bg-background/85 backdrop-blur max-md:static md:sticky md:top-0">
      {/* The row wraps rather than clipping, at every width.

          It was tried at a breakpoint first, and a breakpoint cannot answer
          this: the row's contents are sized by the engine, not by the
          viewport. A generated style picks its own control height and its own
          navigation width, so the same 1024px screen fits these five controls
          under one style and overflows by 55px under another. Capping the
          control height would shrink the touch target, which is the wrong
          thing to give up, so the header grows a line when it has to and
          stays on one when it does not. */}
      <div className="ui-row flex-wrap justify-between px-(--ui-gap-section-x) py-(--ui-gap-inline-x)">
        {/* The trigger sits OUTSIDE the group that collapses. Inside it, being
            `shrink-0` was not enough: the group itself shrinks to zero and
            clips its own overflow, so the button kept its width and was cut
            off the row anyway. It is the only way to the navigation on a
            phone. The trail beside it can go; the door cannot. */}
        <SidebarTrigger className="shrink-0" />

        {/* `grow` here as well as on the actions group. With `justify-between`
            and the actions wrapped to a second line, this group was left alone
            on the first one and pushed to the far edge — the section name ended
            up in the top-right corner with the trigger stranded at the left.
            Two growing groups split the line instead: the name starts beside
            the trigger and the actions stay against the trailing edge. */}
        <div className="ui-row min-w-0 grow shrink overflow-hidden">
          {/* On a phone the header said nothing at all: the trail hides below
              `sm`, so the only words up here were a desktop menu bar. The
              section name is what a phone header is for, and the bottom bar is
              what changes it. Above `md` the trail takes over, because there
              the tab strip is already naming the section. */}
          <span className="ui-title truncate md:hidden">
            {sectionLabel(section)}
          </span>

          <Breadcrumb className="hidden min-w-0 md:block">
            <BreadcrumbList className="flex-nowrap whitespace-nowrap">
              <BreadcrumbItem className="hidden 2xl:inline-flex">
                <BreadcrumbLink href="#">Operations</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden 2xl:block" />
              <BreadcrumbItem className="hidden xl:inline-flex">
                <BreadcrumbLink href="#">Chicago</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden xl:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Control Tower</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* `grow` keeps the group against the trailing edge on one line and
            spanning the line when it wraps to its own. An auto margin reads the
            same and is not the same: it consumes the free space, which made the
            row wrap on a 1440px desktop that had room to spare.

            The group wraps internally too. `shrink-0` alone was not enough: an
            unshrinkable row measures at the width of all its children on one
            line, so it overflowed by 18px at 320 and by 104px at 768 without
            ever being given the chance to wrap. */}
        <div className="ui-row min-w-0 grow flex-wrap justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCmdOpen(true)}
            aria-label="Search"
            className="shrink-0 justify-between overflow-hidden px-(--ui-control-pad-x-x) max-md:hidden sm:w-52 2xl:w-64 text-muted-foreground"
          >
            <span className="ui-row min-w-0">
              <SearchIcon className="shrink-0" />
              {/* The label is what the button costs on a phone: the icon alone
                  says the same thing and gives the row back 9rem. */}
              <span className="hidden truncate lg:inline">Search shipment, unit…</span>
            </span>
            <KbdGroup className="hidden 2xl:flex">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </KbdGroup>
          </Button>

          {/* The label shows on a phone from 370px up, and the number is
              measured rather than chosen: without it the row spends 229px on
              the trigger, the section name, the bell and the gaps, and the
              words cost 139 more. Below that the row wraps and the header grows
              a third line, which is a worse trade on the smallest screen than
              an unlabelled plus beside a labelled bell.

              It stays hidden in the `md`–`lg` band too, which is the one where
              the sidebar has returned and the search and account are back
              beside it. */}
          <Button size="sm" onClick={onNewShipment} aria-label="New shipment">
            <PackagePlusIcon />
            <span className="hidden max-md:min-[370px]:inline lg:inline">
              New shipment
            </span>
          </Button>
          {/* The bell stays in the header at every width; the account does not.
              Four trailing controls did not fit a phone, but two do, and of the
              two the bell is the one that earns it: it carries an unread mark,
              and a mark nobody sees is a notification nobody gets. The account
              has nothing to announce and lives in the drawer.

              It sits AFTER the primary action, in the trailing corner. That
              corner is the hardest one for a thumb to reach on a phone held in
              one hand, so it goes to the control reached for least — and the
              action that is actually used moves inboard, where the hand is.
              The cost is that the loudest element no longer sits against the
              edge, which is the usual place for it. */}
          <Popover>
            <Tooltip>
              <TooltipTrigger
                render={
                  <PopoverTrigger
                    render={
                      <Button variant="ghost" size="icon-sm" className="relative">
                        <BellIcon />
                        <span className="ui-dot absolute top-1 right-1 bg-destructive" />
                      </Button>
                    }
                  />
                }
              />
              <TooltipContent>Notifications</TooltipContent>
            </Tooltip>
            <PopoverContent align="end" className="w-[min(20rem,calc(100vw-2rem))]">
              <div className="ui-stack">
                <div className="ui-row justify-between">
                  <span className="ui-title">Latest</span>
                  <Badge variant="secondary">{notifications.length}</Badge>
                </div>
                <Separator />
                {notifications.map((n) => (
                  <div key={n.id} className="ui-stack-tight">
                    <span className="text-(length:--ui-text-sm)">{n.text}</span>
                    <span className="ui-muted">{n.time}</span>
                  </div>
                ))}
                <Separator />
                <div className="ui-actions">
                  <Button variant="ghost" size="sm">
                    <CheckIcon />
                    Mark all as read
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>


          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Account"
                  className="ui-row-tight shrink-0 cursor-pointer bg-transparent outline-none max-md:hidden"
                >
                  <Avatar size="sm">
                    <AvatarFallback>GB</AvatarFallback>
                    <AvatarBadge className="bg-(--ui-success)" />
                  </Avatar>
                  <ChevronDownIcon className="size-3.5 text-muted-foreground" />
                </button>
              }
            />
            <DropdownMenuContent align="end" className="w-56">
              {/* The label is Base UI's `Menu.GroupLabel` and it throws if it
                  is not inside a `Menu.Group` — it names a group, so without
                  one there is nothing for it to name. It used to sit loose
                  above the group and took the whole app down on the first tap
                  of this menu. */}
              <DropdownMenuGroup>
                <DropdownMenuLabel>Gonzalo Bilune</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <UserIcon />
                  Profile
                  <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <SettingsIcon />
                  Preferences
                  <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <LogOutIcon />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* On a phone the search is a row, not an icon.

          As an icon it was one of four unlabelled controls crowded into the
          trailing edge, and it read as whatever you guessed it was. As a row it
          says what it searches and it is the width of a thumb's whole travel.
          It costs a line, and the line it costs is the one the desktop menu bar
          used to take.

          It opens the same palette the icon did. It is a button styled as a
          field rather than a real input, because typing happens in the palette
          and two places to type one query is one too many. */}
      <div className="px-(--ui-gap-section-x) pb-(--ui-gap-inline-x) md:hidden">
        <Button
          variant="outline"
          onClick={() => setCmdOpen(true)}
          className="ui-row w-full justify-start text-muted-foreground"
        >
          <SearchIcon className="shrink-0" />
          <span className="truncate">Search shipments, units or actions…</span>
        </Button>
      </div>

      {/* Same rule on the second row, and the menubar does not shrink. It was
          squeezed to 120px by the two status badges beside it, which cut "Help"
          off a menu: the badges are a readout and the menubar is a control, so
          the readout is what moves to the next line.

          The whole row is gone on a phone. A menu bar is a desktop idiom —
          nothing on a phone has one — and it was costing 40px of an 844px
          screen to render three words. Shift, View and Help now live in the
          navigation drawer, which is where a phone keeps commands that are not
          the primary action. */}
      <div className="ui-row flex-wrap justify-between px-(--ui-gap-section-x) pb-(--ui-gap-inline-x) max-md:hidden">
        <Menubar className="ui-scroll-x max-w-full shrink-0">
          <MenubarMenu>
            <MenubarTrigger>Shift</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                Open shift
                <MenubarShortcut>⌘O</MenubarShortcut>
              </MenubarItem>
              <MenubarItem>Hand off to night shift</MenubarItem>
              <MenubarSeparator />
              <MenubarSub>
                <MenubarSubTrigger>Export</MenubarSubTrigger>
                <MenubarSubContent>
                  <MenubarItem>Daily manifest (CSV)</MenubarItem>
                  <MenubarItem>Incident summary</MenubarItem>
                </MenubarSubContent>
              </MenubarSub>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
            <MenubarContent>
              <MenubarCheckboxItem checked>Show delivered</MenubarCheckboxItem>
              <MenubarCheckboxItem>Group by lane</MenubarCheckboxItem>
              <MenubarSeparator />
              <MenubarItem>Reset columns</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Help</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>Operations handbook</MenubarItem>
              <MenubarItem>Contact support</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>

        {/* The shift badges are status, not controls: on a phone the row they
            would share with the menubar is already full. */}
        <div className="ui-row ml-auto hidden lg:flex">
          <Badge variant="secondary" className="ui-mono">
            <TruckIcon />
            4 units on route
          </Badge>
          <Badge variant="outline" className="ui-mono">
            shift 2:00 PM – 10:00 PM
          </Badge>
        </div>
      </div>

      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <Command>
          <CommandInput placeholder="Search shipments, units or actions…" />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup heading="Shipments">
              {shipments.slice(0, 5).map((s) => (
                <CommandItem key={s.id} value={`${s.id} ${s.customer}`}>
                  <PackagePlusIcon />
                  <span className="ui-mono">{s.id}</span>
                  <span className="text-muted-foreground">{s.customer}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Actions">
              <CommandItem>
                <TruckIcon />
                Assign unit
                <CommandShortcut>⌘U</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <SettingsIcon />
                Open design system
                <CommandShortcut>⌘D</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </header>
  )
}
