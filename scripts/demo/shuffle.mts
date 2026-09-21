/**
 * The same engine, with the model taken out: styles assembled from random
 * answers, one every fraction of a second.
 *
 * The product film shows six briefs answered well. This one shows the room
 * they were answered in: one still per style, cut together, so what you watch
 * is a hundred settled interfaces and never the app arriving at one. Every style here is built by `assemble()` — the exact
 * function the real pipeline calls — from answers a random number generator
 * produced instead of Jev. Nothing is hand-picked, nothing is filtered, and no
 * request leaves the machine, so a run costs nothing and takes as long as the
 * film is long.
 *
 * What that buys is a claim the product film cannot make on its own: the six
 * good answers were not six special cases wired in. They are six points in
 * this.
 *
 * It also shows the honest shape of the space. Random answers are not
 * tasteful ones: a run will throw up mid-grey pages, clashing accents and
 * combinations no designer would sign. That contrast IS the point — picking
 * well out of this is the work, and a sweep that only produced handsome pages
 * would be evidence the space is small.
 *
 * Run it with the dev server up (the engine's entry point is exposed there):
 *   npm run demo:shuffle
 *   DEMO_FORMAT=4x3 DEMO_STYLES=140 DEMO_HOLD=0.3 npm run demo:shuffle
 *
 * Out: scripts/demo/out/shuffle.mp4.
 */
import type { DesignConfig } from "@/design/tokens"
import { assemble } from "@/design/jev/generate"

import { slides, wait } from "./capture.mjs"
import { randomAnswers, rng } from "./style-space.js"

/* The dev build hangs the engine's entry point off the window so a console,
   or this, can drive it without going through the panel. */
declare global {
  interface Window {
    applyDesignConfig: (config: DesignConfig) => void
  }
}

const COUNT = Number(process.env.DEMO_STYLES ?? 100)
/**
 * How long each style stays on screen.
 *
 * Shot as stills and cut together, so this is the whole of it: the restyle,
 * the reflow and the engine's own transitions all happen between frames and
 * none of them are in the film. Filmed live the same beat could not go below
 * about 0.5s, because a transition on its slowest rung runs 260ms and the
 * page was still arriving when the next style replaced it. Cutting removes
 * that floor, and what is left is only how long the eye needs.
 *
 * The count then follows from the length: under a minute for a feed, so 100
 * of these at 0.4s is 40 seconds.
 */
const HOLD = Number(process.env.DEMO_HOLD ?? 0.4)
/** How long to let a restyle settle before the shutter. Twice the engine's
 *  slowest transition, so nothing is caught mid-move. */
const SETTLE = 0.55
/** A seed keeps a run repeatable, so a good sweep can be filmed twice. */
const rand = rng(Number(process.env.DEMO_SEED ?? 7))

async function main() {
  await slides("shuffle", HOLD, async (page, shoot) => {
    await page.waitForSelector(".ui-fab")

    for (let i = 0; i < COUNT; i++) {
      const config = assemble(randomAnswers(rand))
      await page.evaluate((c) => window.applyDesignConfig(c), config)
      await wait(SETTLE)
      await shoot()
      console.log(
        `[${String(i + 1).padStart(3)}/${COUNT}] ${config.flags.mode.padEnd(5)} ` +
          `${config.scalars.canvas.padEnd(24)} ${config.scalars.accent}`
      )
    }
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
