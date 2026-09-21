"use client"

import * as React from "react"
import { SparklesIcon, CornerDownLeftIcon, TriangleAlertIcon } from "@/components/icons"

import { useDesign } from "@/design/design-provider"
import type { DesignConfig } from "@/design/tokens"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"

type Result = {
  config: DesignConfig
  usage: { ms: number; calls: number; usd: number; inputTokens: number }
  critique?: { coherent: number; matchesBrief: number }
  brief: string
}

export function StyleBrief() {
  const { applyConfig } = useDesign()
  const [brief, setBrief] = React.useState("")
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [last, setLast] = React.useState<Result | null>(null)
  /** Seconds until the field may be used again, when the server said so. */
  const [waiting, setWaiting] = useCountdown()

  /**
   * What went wrong, in words, from a response that may not be ours.
   *
   * Three different things answer this endpoint and only one of them is the
   * route. The rate limit is enforced at the edge, so its 429 is written by
   * the platform and its body is `{ error: { message } }` rather than the
   * route's `{ error }`. Reading the field without checking cost the first
   * version of this an `[object Object]` on screen. And a body is not
   * guaranteed to be JSON at all: a platform error page is HTML, and parsing
   * it throws a SyntaxError whose message would be shown to the visitor.
   */
  async function explain(res: Response): Promise<string> {
    let said: string | undefined
    if (res.headers.get("content-type")?.includes("json")) {
      const body = await res.json().catch(() => null)
      const field = body?.error
      said = typeof field === "string" ? field : field?.message
    }

    if (res.status === 429) {
      /* The platform's own words for this are "Too Many Requests", which
         reads as a scolding for something the visitor did not do. The demo
         is capped because each style costs money, so say that instead. */
      return "The demo has a cap on how many styles it generates. Try again in a few minutes."
    }
    if (res.status === 503) return said ?? "This deployment has no API key configured."
    return said ?? "Could not generate the style."
  }

  async function generate(text: string) {
    if (!text.trim() || pending || waiting) return
    setPending(true)
    setError(null)
    try {
      const res = await fetch("/api/design/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brief: text }),
      })
      if (!res.ok) {
        /* Only the route sends this header; the edge does not, so the
           countdown appears for one of the two and not the other. Better a
           countdown that is sometimes absent than one that is invented. */
        const after = Number(res.headers.get("retry-after"))
        if (res.status === 429 && after > 0) setWaiting(Math.ceil(after))
        setError(await explain(res))
        return
      }
      const body = await res.json()
      applyConfig(body.config)
      setLast({ ...body, brief: text })
    } catch {
      /* Reaching here means the request never completed: offline, DNS, a
         dropped connection. There is no response to read. */
      setError("Could not reach the server. Check your connection and try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="ui-stack">
      <Field>
        <FieldLabel htmlFor="style-brief">Describe the style</FieldLabel>
        <Textarea
          id="style-brief"
          value={brief}
          onChange={(e) => {
            setBrief(e.target.value)
            /* An error is about the brief that was sent, not the one being
               written. Leaving it up makes the next edit look rejected. */
            if (error) setError(null)
          }}
          onKeyDown={(e) => {
            /* Enter sends, Shift+Enter opens a line.
             *
             * It was Cmd+Enter, which is the convention for a field you write
             * paragraphs into. A brief is one sentence: sending is the common
             * case, so it gets the bare key and the newline keeps the modifier.
             * The corner-arrow on the button already promised this.
             *
             * `isComposing` guards the Enter that closes an IME candidate list,
             * which would otherwise submit a half-typed word. */
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              generate(brief)
            }
          }}
          placeholder="A nuclear reactor control board during an alarm"
          rows={3}
          disabled={pending}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "style-brief-error" : undefined}
        />
      </Field>

      <div className="ui-actions">
        <Button
          onClick={() => generate(brief)}
          disabled={pending || waiting !== null || !brief.trim()}
        >
          <SparklesIcon />
          {pending ? "Resolving…" : waiting !== null ? `Wait ${waiting}s` : "Apply style"}
          {!pending && waiting === null && brief.trim() ? <CornerDownLeftIcon /> : null}
        </Button>
      </div>

      {pending ? (
        <div className="ui-stack-tight">
          <Skeleton className="h-(--ui-control-h) w-full" />
          <Skeleton className="h-(--ui-control-h) w-3/5" />
        </div>
      ) : null}

      {error ? (
        <p id="style-brief-error" role="status" className="ui-row-tight ui-meta text-destructive">
          <TriangleAlertIcon className="size-4 shrink-0" />
          {error}
        </p>
      ) : null}

      {last && !pending ? (
        <div className="ui-datum">
          {/* The readout stacks rather than sitting in one row: at a spacious
              density the meta line alone is three lines wide, and a
              space-between row would pin the badges against a wall of text. */}
          <span className="ui-row-tight flex-wrap justify-between">
            <span className="ui-meta">
              {last.usage.calls} calls · {last.usage.ms} ms ·{" "}
              USD {last.usage.usd.toFixed(5)}
            </span>
            {last.critique ? (
              <span className="ui-row-tight">
                <Badge variant={last.critique.matchesBrief > 0.6 ? "default" : "secondary"}>
                  on brief {Math.round(last.critique.matchesBrief * 100)}%
                </Badge>
                <Badge variant={last.critique.coherent > 0.6 ? "default" : "secondary"}>
                  coherent {Math.round(last.critique.coherent * 100)}%
                </Badge>
              </span>
            ) : null}
          </span>
        </div>
      ) : null}
    </div>
  )
}

/**
 * A countdown in seconds, or null when there is nothing to wait for.
 *
 * Each second schedules the next one, so the only state write happens inside
 * a timer callback. Writing it from the effect body instead, or reading the
 * clock while rendering, are both things the compiler's lint rejects, and
 * both were how the first two versions of this were written.
 */
function useCountdown() {
  const [left, setLeft] = React.useState<number | null>(null)

  React.useEffect(() => {
    if (left === null) return
    const id = setTimeout(() => setLeft(left > 1 ? left - 1 : null), 1000)
    return () => clearTimeout(id)
  }, [left])

  return [left, setLeft] as const
}
