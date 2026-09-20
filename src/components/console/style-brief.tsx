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

  async function generate(text: string) {
    if (!text.trim() || pending) return
    setPending(true)
    setError(null)
    try {
      const res = await fetch("/api/design/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brief: text }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error ?? "Could not generate the style.")
      applyConfig(body.config)
      setLast({ ...body, brief: text })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate the style.")
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
          onChange={(e) => setBrief(e.target.value)}
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
        />
      </Field>

      <div className="ui-actions">
        <Button onClick={() => generate(brief)} disabled={pending || !brief.trim()}>
          <SparklesIcon />
          {pending ? "Resolving…" : "Apply style"}
          {!pending && brief.trim() ? <CornerDownLeftIcon /> : null}
        </Button>
      </div>

      {pending ? (
        <div className="ui-stack-tight">
          <Skeleton className="h-(--ui-control-h) w-full" />
          <Skeleton className="h-(--ui-control-h) w-3/5" />
        </div>
      ) : null}

      {error ? (
        <p className="ui-row-tight ui-meta text-destructive">
          <TriangleAlertIcon className="size-4" />
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
