import type { Metadata, Viewport } from "next"

import "./globals.css"

import { fontClassNames } from "./fonts"

import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/toast"
import { DesignProvider } from "@/design/design-provider"
import { IconFamilyProvider } from "@/components/icons"

export const metadata: Metadata = {
  title: "Nodo · Control Tower",
  description:
    "Freight operations console, a demo of a runtime design system over shadcn/ui",
}

/* `viewport-fit=cover` lets the shell reach under the notch; the safe-area
   insets in the stylesheet are what keep content out from under it. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fontClassNames} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <DesignProvider>
          <IconFamilyProvider>
            <TooltipProvider>
              {children}
              <Toaster />
            </TooltipProvider>
          </IconFamilyProvider>
        </DesignProvider>
      </body>
    </html>
  )
}
