import { readFileSync } from 'node:fs'
import postcss from 'postcss'
import selectorParser from 'postcss-selector-parser'

/**
 * Exercises the selector parser against the cases that used to slip past it.
 * It reads the function out of the registry rather than importing it, so the
 * test cannot accidentally run against a stale copy.
 *
 * Run with: node scripts/__tests__/parser.test.mjs
 */
const src = readFileSync(new URL('../design-registry.mjs', import.meta.url), 'utf8')
const fnSrc = src.slice(src.indexOf('function subjectSlotsOf'), src.indexOf('export function governedSlots'))
const subjectSlotsOf = new Function('selectorParser', `${fnSrc}; return subjectSlotsOf`)(selectorParser)

const cases = [
  ['newline as a combinator', '[data-slot="ancestor"]\n[data-slot="member"]', ['member']],
  ['spaces around the attribute operator', '[data-slot = "member"]', ['member']],
  ['spaces inside the brackets', '[ data-slot="member" ]', ['member']],
  ['unsupported operator', '[data-slot^="member"]', 'THROW'],
  ['nth-child of is a condition', '[data-slot="wrap"] > :nth-child(1 of [data-slot="cond"])', []],
  ['has is a condition', '[data-slot="outer"]:has([data-slot="cond"])', ['outer']],
  ['where with a descendant', ':where([data-slot="a"] [data-slot="b"])[data-slot]', ['b']],
  ['not is a condition', '[data-slot="x"]:not([data-slot="y"] *)', ['x']],
]
let fail=0
for (const [name, sel, expected] of cases) {
  let got
  try {
    const out=new Set()
    selectorParser(s=>{ for(const one of s.nodes) subjectSlotsOf(one, out) }).processSync(sel)
    got=[...out].sort()
  } catch(e) { got='THROW' }
  const ok = expected==='THROW' ? got==='THROW' : JSON.stringify(got)===JSON.stringify([...expected].sort())
  if(!ok) fail++
  console.log(`${ok?'OK  ':'FAIL'} ${name}: esperado ${JSON.stringify(expected)} obtuvo ${JSON.stringify(got)}`)
}
process.exit(fail?1:0)
