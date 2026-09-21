import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"

import "./globals.css"

import { fontClassNames } from "./fonts"

import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/toast"
import { bootScript } from "@/design/boot"
import { declarations } from "@/design/declarations"
import { DesignProvider } from "@/design/design-provider"
import { defaultConfig } from "@/design/tokens"
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
  /* The default style, rendered into the first HTML rather than applied by an
     effect after hydration. Without it the first frame carries no flags and
     no custom properties at all: the charts paint grey and every rule keyed
     on a flag is inert until the provider mounts. */
  const { style, data, dark } = declarations(defaultConfig)

  return (
    <html
      lang="en"
      className={`${fontClassNames} h-full antialiased${dark ? " dark" : ""}`}
      style={style as React.CSSProperties}
      {...data}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        {/* Before anything else in the body, so a returning visitor's own
            style is in place for the first paint too. */}
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
        <DesignProvider>
          <IconFamilyProvider>
            <TooltipProvider>
              {children}
              <Toaster />
              <Analytics />
            </TooltipProvider>
          </IconFamilyProvider>
        </DesignProvider>
      </body>
    </html>
  )
}
