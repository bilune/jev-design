/**
 * Generate a style and LOOK at it, one screenshot per brief.
 *
 * `probe.mjs` answers what the engine returned; this answers whether the
 * result is any good, which the numbers do not. It exists because a brief
 * scoring 78% shipped into a demo as a muddy brown that read as a mistake,
 * and nothing short of rendering it would have caught that.
 *
 * What it has been used to establish: a canvas either darker than about 0.25
 * or lighter than about 0.9 holds its contrast, and a saturated mid-tone one
 * washes out whatever the score says.
 *
 *   npx tsx scripts/demo/preview.mts "A submarine sonar station" "Brutalism"
 *
 * Writes scripts/demo/out/preview/<n>.png.
 */
import { chromium } from "playwright"

import type { DesignConfig } from "../../src/design/tokens.js"

/* The dev build hangs the engine's entry point off the window so a console,
   or this, can drive it without going through the panel. */
declare global {
  interface Window {
    applyDesignConfig: (config: DesignConfig) => void
  }
}
import { writeFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"

const briefs = process.argv.slice(2)
if (!briefs.length) {
  console.error('usage: tsx scripts/demo/preview.mts "<brief>" ["<brief>" ...]')
  process.exit(1)
}
const dir = join(import.meta.dirname, "out", "preview")
mkdirSync(dir, { recursive: true })

const b = await chromium.launch({ args: ["--window-size=1280,720", "--hide-scrollbars"] })
const c = await b.newContext({ viewport: null })
const p = await c.newPage()
await p.goto("http://localhost:3000", { waitUntil: "networkidle" })

for (const [i, brief] of briefs.entries()) {
  const r = await p.evaluate(async (brief) => {
    const res = await fetch("/api/design/generate", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ brief }),
    })
    const j = await res.json()
    window.applyDesignConfig(j.config)
    return { score: Math.round((j.critique?.matchesBrief ?? 0) * 100), canvas: j.config.scalars.canvas }
  }, brief)
  await p.waitForTimeout(1200)
  writeFileSync(join(dir, `${i}.png`), await p.screenshot())
  console.log(`${i}  ${String(r.score).padStart(3)}%  ${r.canvas.padEnd(24)}  ${brief}`)
}
await b.close()
