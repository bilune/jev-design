"use client"

import * as React from "react"
import { CalendarIcon, ShieldCheckIcon } from "@/components/icons"

import { toast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

const customers = [
  "Great Lakes Glass",
  "Southside Distribution",
  "Prairie Textiles",
  "Northern Pharma",
  "High Valley Cellars",
  "Delta Agriculture",
]

export function NewShipmentDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [pickupDate, setPickupDate] = React.useState<Date | undefined>(new Date())
  const [weight, setWeight] = React.useState([400])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New shipment</DialogTitle>
          <DialogDescription>
            This creates a pickup order and puts it on the current shift’s
            manifest.
          </DialogDescription>
        </DialogHeader>

        {/* The negative margin offsets the padding that keeps the focus ring
            from being clipped by the scroll container. */}
        <div className="-mx-1 max-h-[60vh] overflow-y-auto px-1">
          <FieldGroup>
            <FieldSet>
              <FieldLegend>Shipment details</FieldLegend>

              <Field>
                <FieldLabel htmlFor="customer">Customer</FieldLabel>
                <Combobox items={customers}>
                  <ComboboxInput id="customer" placeholder="Search customers…" />
                  <ComboboxContent>
                    <ComboboxEmpty>No matches.</ComboboxEmpty>
                    <ComboboxList>
                      {(item: string) => (
                        <ComboboxItem key={item} value={item}>
                          {item}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </Field>

              <Field>
                <FieldLabel htmlFor="ref">Internal reference</FieldLabel>
                <Input id="ref" placeholder="e.g. PO-2291" />
                <FieldDescription>
                  Shows on the packing slip and on the customer’s invoice.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="origin">Origin</FieldLabel>
                <Select
                  defaultValue="chicago"
                  items={[
                    { value: "chicago", label: "Elk Grove Village yard" },
                    { value: "dallas", label: "Dallas hub" },
                    { value: "memphis", label: "Memphis hub" },
                  ]}
                >
                  <SelectTrigger id="origin" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chicago">Elk Grove Village yard</SelectItem>
                    <SelectItem value="dallas">Dallas hub</SelectItem>
                    <SelectItem value="memphis">Memphis hub</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="destination">Destination</FieldLabel>
                <NativeSelect id="destination" className="w-full">
                  <NativeSelectOption value="indianapolis">Indianapolis, IN</NativeSelectOption>
                  <NativeSelectOption value="boston">Boston, MA</NativeSelectOption>
                  <NativeSelectOption value="phoenix">Phoenix, AZ</NativeSelectOption>
                  <NativeSelectOption value="atlanta">Atlanta, GA</NativeSelectOption>
                </NativeSelect>
              </Field>

              <Field>
                <FieldLabel>Pickup date</FieldLabel>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button variant="outline" className="w-full justify-between">
                        {pickupDate?.toLocaleDateString("en-US") ?? "Pick a date"}
                        <CalendarIcon />
                      </Button>
                    }
                  />
                  <PopoverContent align="start" className="w-auto">
                    <Calendar mode="single" selected={pickupDate} onSelect={setPickupDate} />
                  </PopoverContent>
                </Popover>
              </Field>

              <Field>
                <FieldLabel htmlFor="value">Declared value</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>$</InputGroupAddon>
                  <InputGroupInput id="value" placeholder="0" inputMode="numeric" />
                  <InputGroupAddon align="inline-end">USD</InputGroupAddon>
                </InputGroup>
              </Field>

              <Field>
                <FieldLabel>
                  <span className="ui-row w-full justify-between">
                    Estimated weight
                    <span className="ui-meta">
                      {weight[0].toLocaleString("en-US")} lb
                    </span>
                  </span>
                </FieldLabel>
                <Slider
                  value={weight}
                  onValueChange={(v) => setWeight(Array.isArray(v) ? v : [v])}
                  min={0}
                  max={2600}
                  step={25}
                />
              </Field>
            </FieldSet>

            <FieldSeparator />

            <FieldSet>
              <FieldLegend>Service</FieldLegend>

              <Field>
                <FieldLabel>Priority</FieldLabel>
                <RadioGroup defaultValue="medium" className="ui-row flex-wrap">
                  {[
                    ["high", "High"],
                    ["medium", "Medium"],
                    ["low", "Low"],
                  ].map(([v, l]) => (
                    <FieldLabel key={v} htmlFor={`p-${v}`} className="ui-row-tight">
                      <RadioGroupItem id={`p-${v}`} value={v} />
                      {l}
                    </FieldLabel>
                  ))}
                </RadioGroup>
              </Field>

              <Field orientation="horizontal">
                <FieldLabel htmlFor="insurance">Extended insurance</FieldLabel>
                <Switch id="insurance" defaultChecked />
              </Field>

              <Field orientation="horizontal">
                <FieldLabel htmlFor="reefer">Needs cold chain</FieldLabel>
                <Switch id="reefer" />
              </Field>

              <Field orientation="horizontal">
                <FieldLabel htmlFor="signature" className="ui-row-tight">
                  <Checkbox id="signature" defaultChecked />
                  Require recipient signature
                </FieldLabel>
              </Field>

              <Field>
                <FieldLabel htmlFor="notes">Notes</FieldLabel>
                <Textarea
                  id="notes"
                  rows={3}
                  placeholder="Instructions for the driver…"
                />
              </Field>

              <Field>
                <FieldLabel>Authorization code</FieldLabel>
                {/* The group scrolls rather than shrinking its slots: six boxes
                    at a generous control height overflow a 375px viewport, and
                    a slot narrower than a finger is worse than a swipe. */}
                <InputOTP maxLength={6} containerClassName="ui-scroll-x max-w-full">
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <FieldDescription>
                  The supervisor issues it for high-value shipments.
                </FieldDescription>
              </Field>
            </FieldSet>
          </FieldGroup>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false)
              toast.add({
                title: "Shipment created",
                description: "NDO-4829 is on the shift manifest.",
              })
            }}
          >
            <ShieldCheckIcon />
            Create shipment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
