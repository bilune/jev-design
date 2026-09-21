/**
 * Where the engine sends its questions.
 *
 * Two routes, one interface. By default the TypeSafe SDK talks to
 * `api.typesafe.ai` directly. With `JEV_ROUTE=gateway` the same questions go
 * through Vercel's AI Gateway instead, which bills through the Vercel account
 * and puts the calls in its observability rather than TypeSafe's.
 *
 * The engine does not know which one it is using, and must not: every
 * measurement in `scripts/jev/` was taken against the model, not against a
 * transport, and a route that changed the answers would invalidate all of
 * them. What the adapter below is allowed to do is rename fields. Anything
 * that would change a question's content belongs in the catalog.
 *
 * ── How close the two are ─────────────────────────────────────────────────
 * Closer than it looks. Both speak the same question shape: a `choice` carries
 * `instructions` and a map of options, a `score` carries an ordered list of
 * levels. Exactly two things differ, and they are both spelling:
 *
 *   TypeSafe            AI Gateway
 *   type: "noul"        type: "boolean"
 *   answer.noul         answer.probability
 *   usage.input_tokens  usage.inputTokens
 *   answer.confidence   (absent; derived from the distribution)
 *
 * That last one is the only place the adapter is doing more than renaming.
 * TypeSafe reports a confidence alongside a choice or a score; the gateway
 * returns the distribution and no summary of it. The engine reads confidence
 * in two consequential places — whether a hue is committed enough to rotate
 * the data series off it, and the per-question confidence the bench reports —
 * so it is reconstructed as the probability mass on the answer that won. For
 * a choice that is exactly what confidence means. For a score it is an
 * approximation, because an expected score sits between levels and the mass
 * is spread over them.
 *
 * ── What is and is not verified ───────────────────────────────────────────
 * The direct route is what every number in this repo was measured on. The
 * gateway route is written from the two SDKs' own types, which agree field for
 * field, but it has not been run against the live gateway, because doing that
 * needs an `AI_GATEWAY_API_KEY` this machine does not have. Treat it as
 * plausible and unproven until someone runs it once.
 */
import { TypeSafeClient } from "@typesafe-ai/sdk"

/** The only part of the SDK the engine actually uses. */
export type JevClient = {
  /* `never` on the way in, because the two SDKs type their payloads
     differently and the call sites already cast. Method parameters are
     bivariant, so the real client satisfies this while the adapter below can
     accept the shape it actually gets. */
  systemOne(request: { state: never; questions: never }): Promise<{
    answers: Record<string, unknown>
    usage: { input_tokens: number }
  }>
}

type GatewayAnswer =
  | { type: "choice"; choice: string; probabilities?: Record<string, number> }
  | { type: "score"; score: number; probabilities?: Record<string, number> }
  | { type: "boolean"; probability: number }

export const routeName = () =>
  process.env.JEV_ROUTE === "gateway" ? "gateway" : "direct"

export function jevClient(): JevClient {
  return routeName() === "gateway" ? gatewayClient() : (new TypeSafeClient({ timeout: 30000 }) as JevClient)
}

/**
 * The same questions, asked through `experimental_evaluate`.
 *
 * The import is dynamic so that the AI SDK is only loaded when this route is
 * selected. It is a large dependency to pull into a request that is not going
 * to use it.
 */
function gatewayClient(): JevClient {
  return {
    async systemOne({ state, questions }: { state: unknown; questions: unknown }) {
      const { experimental_evaluate: evaluate } = await import("ai")

      const asked = Object.fromEntries(
        Object.entries(questions as Record<string, unknown>).map(([id, q]) => {
          const question = q as { type: string } & Record<string, unknown>
          return [id, question.type === "noul" ? { ...question, type: "boolean" } : question]
        })
      )

      const result = await evaluate({
        model: process.env.JEV_GATEWAY_MODEL ?? "typesafe-ai/jev",
        state: state as never,
        questions: asked as never,
        /* The briefs are the user's words. Nothing needs to be kept. */
        providerOptions: { gateway: { zeroDataRetention: true } },
      })

      const answers = Object.fromEntries(
        Object.entries(result.answers as Record<string, GatewayAnswer>).map(([id, a]) => {
          if (a.type === "boolean") return [id, { type: "noul", noul: a.probability }]
          if (a.type === "choice") {
            return [id, { ...a, confidence: a.probabilities?.[a.choice] ?? 1 }]
          }
          const mass = Object.values(a.probabilities ?? {})
          return [id, { ...a, confidence: mass.length ? Math.max(...mass) : 1 }]
        })
      )

      return { answers, usage: { input_tokens: result.usage.inputTokens ?? 0 } }
    },
  }
}
