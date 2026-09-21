/**
 * A ceiling on how much of this endpoint one visitor, or the whole internet,
 * can spend.
 *
 * Every call to it runs four requests to the model against a key that belongs
 * to whoever deployed this, so an open endpoint is an open wallet. The demo is
 * meant to be tried, which rules out a login, and the cheapest thing that
 * still bounds the bill is a window per caller plus a ceiling for everyone.
 *
 * ── What this is worth, precisely ─────────────────────────────────────────
 * The counters live in the instance's memory. On Vercel's Fluid Compute one
 * instance serves many concurrent requests and is reused between them, so in
 * practice a burst from one address lands on one instance and is caught. It is
 * NOT a guarantee: traffic spread across regions, or a cold start, gets a
 * fresh set of counters, and an attacker rotating addresses is not stopped by
 * a per-address rule at all. That is what the global ceiling is for, and it
 * has the same caveat.
 *
 * So: this turns "someone can drain the account overnight" into "someone can
 * spend a bounded amount per instance". A hard limit needs shared state, which
 * means a store, which is a dependency this demo does not otherwise have. If
 * this ever stops being a demo, that is the upgrade.
 */

/** Per address: how many generations, over how long a window. */
const PER_IP = Number(process.env.RATE_LIMIT_PER_IP ?? 8)
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 10 * 60 * 1000)
/** Across everyone, over the same window. A ceiling on the whole bill. */
const GLOBAL = Number(process.env.RATE_LIMIT_GLOBAL ?? 240)

/** Timestamps of recent calls, newest last, keyed by address. */
const hits = new Map<string, number[]>()

/**
 * The caller's address, as the platform reports it.
 *
 * `x-forwarded-for` is a list and the client is the first entry; the rest are
 * proxies. Behind Vercel the header is set by the platform, so it cannot be
 * spoofed by the caller. Read it anywhere else and it can be, which is worth
 * knowing before this code is copied somewhere with a different front door.
 */
export function callerAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return request.headers.get("x-real-ip") ?? "unknown"
}

export type Verdict = { ok: true } | { ok: false; retryAfter: number; reason: "ip" | "global" }

export function take(address: string, now = Date.now()): Verdict {
  const since = now - WINDOW_MS
  let total = 0

  /* One pass: drop what has aged out, count what is left, and take the size
     of the whole map while we are here. Sweeping on every call also keeps the
     map from growing without bound, which a long-lived instance would
     otherwise do one entry per address. */
  for (const [key, times] of hits) {
    const live = times.filter((t) => t > since)
    if (live.length === 0) hits.delete(key)
    else hits.set(key, live)
    total += live.length
  }

  const mine = hits.get(address) ?? []

  if (mine.length >= PER_IP) {
    return { ok: false, reason: "ip", retryAfter: retryIn(mine[0], now) }
  }
  if (total >= GLOBAL) {
    /* Everyone waits for the oldest call in the window to age out. */
    const oldest = Math.min(...[...hits.values()].map((t) => t[0]))
    return { ok: false, reason: "global", retryAfter: retryIn(oldest, now) }
  }

  hits.set(address, [...mine, now])
  return { ok: true }
}

const retryIn = (oldest: number, now: number) =>
  Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000))

/** For tests: forget everything. */
export const reset = () => hits.clear()

export const limits = () => ({ perIp: PER_IP, windowMs: WINDOW_MS, global: GLOBAL })
