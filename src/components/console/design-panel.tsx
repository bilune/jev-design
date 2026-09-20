"use client"

import { PaintbrushIcon, RotateCcwIcon } from "@/components/icons"

import { useDesign } from "@/design/design-provider"
import { StyleBrief } from "@/components/console/style-brief"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

/**
 * One brief, one button, and what came back.
 *
 * This panel used to carry four tabs of hand controls: named presets, sliders
 * for every scalar, toggle groups for the flags, a palette of accent swatches.
 * They are gone. The engine reaches a space of fifty million styles from a
 * sentence, and a dozen sliders can reach a handful of them badly — keeping
 * both meant the panel advertised the weaker of the two as the main way in.
 *
 * `reset` stays in the footer because a generated style is a one-way door
 * otherwise: it is the only way back to the default without reloading the page.
 * Everything else a person would want to change, they change by describing it.
 *
 * The trigger floats (see `.ui-fab`). It must be rendered OUTSIDE the header:
 * the header carries `backdrop-blur`, and a backdrop filter makes an element a
 * containing block for its fixed descendants, which would pin the trigger to
 * the header instead of to the viewport.
 */
export function DesignPanel() {
  const { reset } = useDesign()

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button className="ui-fab">
            <PaintbrushIcon />
            Design
          </Button>
        }
      />

      <SheetContent className="max-sm:!w-full sm:!max-w-[27rem]">
        <SheetHeader>
          <SheetTitle>Design system</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-(--ui-pad-surface-x) pb-(--ui-gap-stack-x)">
            <StyleBrief />
          </div>
        </ScrollArea>

        <SheetFooter>
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcwIcon />
            Reset
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
