import { checkRateLimit } from "@vercel/firewall"
import { NextResponse } from "next/server"

import { generateDesign } from "@/design/jev/generate"
import { routeName } from "@/design/jev/client"

import { callerAddress, take } from "./rate-limit"

/**
 * POST { brief: string } → a full DesignConfig.
 *
 * Four requests to Jev and some arithmetic, one to two and a half seconds.
 * The key never leaves the server: the SDK refuses to run in a browser unless
 * you explicitly opt in, and opting in would ship the credential to every
 * visitor.
 *
 * Two routes reach the model, `direct` and `gateway`, chosen by `JEV_ROUTE`
 * and resolved in `src/design/jev/client.ts`. The limit below is applied here,
 * above that choice, because it is protecting a spend that exists either way.
 */
export async function POST(request: Request) {
  const keyed = routeName() === "gateway" ? "AI_GATEWAY_API_KEY" : "TYPESAFE_API_KEY"
  if (!process.env[keyed]) {
    return NextResponse.json({ error: `${keyed} is not set on the server.` }, { status: 503 })
  }

  let brief: unknown
  try {
    brief = (await request.json())?.brief
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 })
  }

  if (typeof brief !== "string" || brief.trim().length < 3) {
    return NextResponse.json(
      { error: "Describe the style in a few words." },
      { status: 400 }
    )
  }

  /* Counted here rather than at the top of the handler, so a malformed or
     too-short brief does not spend somebody's allowance. What the limit
     protects is the model spend, and nothing above this line reaches it.

     Two counters, deliberately. The WAF's is the one that holds: it is kept
     regionally, so it survives a caller being spread across instances, which
     is exactly how the in-process counter was measured to fail. The in-process
     one stays because `checkRateLimit` has nothing to consult outside Vercel,
     which would otherwise leave `npm run dev` with no limit at all. */
  const { rateLimited } = await checkRateLimit("design-generate", { request })
  if (rateLimited) {
    return NextResponse.json(
      { error: "That is a lot of styles in a short time. Try again shortly." },
      { status: 429, headers: { "retry-after": "60" } }
    )
  }

  const verdict = take(callerAddress(request))
  if (!verdict.ok) {
    return NextResponse.json(
      {
        error:
          verdict.reason === "ip"
            ? "That is a lot of styles in a short time. Try again shortly."
            : "The demo is busy right now. Try again shortly.",
      },
      { status: 429, headers: { "retry-after": String(verdict.retryAfter) } }
    )
  }

  try {
    const result = await generateDesign(brief.trim().slice(0, 600), {
      critique: true,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("[design] generation failed", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed." },
      { status: 502 }
    )
  }
}
