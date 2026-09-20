#!/usr/bin/env node
/**
 * Prints the flag space as JSON, for pasting into the stress sweep.
 *
 * Read from the type rather than typed out, so a flag added tomorrow is swept
 * tomorrow without anyone remembering to add it.
 */
import { readFileSync } from "node:fs"

const src = readFileSync("src/design/tokens.ts", "utf8")
const block = src.slice(
  src.indexOf("export type DesignFlags"),
  src.indexOf("export type DesignConfig")
)

const flags = {}
for (const m of block.matchAll(/^ {2}(\w+):\s*("(?:[^"]|"\s*\|\s*")*")\s*$/gm)) {
  flags[m[1]] = [...m[2].matchAll(/"([^"]+)"/g)].map((x) => x[1])
}

const total = Object.values(flags).reduce((n, v) => n * v.length, 1)
console.log(JSON.stringify(flags, null, 2))
console.error(`\n${Object.keys(flags).length} flags · ${total.toLocaleString("en-US")} combinations`)
