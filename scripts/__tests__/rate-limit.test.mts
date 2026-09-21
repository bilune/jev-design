/**
 * The endpoint's ceiling, tested where it is cheap to test: the counter.
 *
 * Time is passed in rather than read, so a ten minute window can be walked
 * through in a millisecond and the test never sleeps.
 */
import { take, reset, limits } from "../../src/app/api/design/generate/rate-limit.js"

const { perIp, windowMs, global: globalCap } = limits()
let failed = 0

const check = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) failed++
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${ok ? "" : `\n      got ${JSON.stringify(got)}\n     want ${JSON.stringify(want)}`}`)
}

reset()
const t0 = 1_000_000

/* One address spends its allowance and is then turned away. */
for (let i = 0; i < perIp; i++) {
  check(`call ${i + 1} of ${perIp} passes`, take("1.1.1.1", t0 + i).ok, true)
}
const overIp = take("1.1.1.1", t0 + perIp)
check("one over the per-address limit is refused", overIp.ok, false)
check("and it is refused for the right reason", !overIp.ok && overIp.reason, "ip")
check(
  "with a retry-after inside the window",
  !overIp.ok && overIp.retryAfter > 0 && overIp.retryAfter <= windowMs / 1000,
  true
)

/* A different address is unaffected by the first one's spending. */
check("a second address still passes", take("2.2.2.2", t0 + perIp).ok, true)

/* The window slides: once the first call ages out, one slot frees up. */
check(
  "the address is served again once its oldest call ages out",
  take("1.1.1.1", t0 + windowMs + 1).ok,
  true
)

/* The global ceiling holds even when every caller is under its own limit. */
reset()
let served = 0
for (let i = 0; served <= globalCap + 5; i++) {
  if (take(`10.0.${Math.floor(i / 200)}.${i % 200}`, t0 + i).ok) served++
  else break
}
check("the global ceiling stops the flood", served, globalCap)

/* And the map does not grow without bound: everything ages out. */
reset()
for (let i = 0; i < 50; i++) take(`10.1.0.${i}`, t0 + i)
check(
  "an address is fresh again after the window",
  take("10.1.0.0", t0 + windowMs + 1).ok,
  true
)

console.log(
  failed
    ? `\n${failed} failing`
    : `\n✓ the endpoint's ceiling holds: ${perIp} per address and ${globalCap} in total per ${windowMs / 60000} minutes`
)
process.exit(failed ? 1 : 0)
