import { NextResponse } from "next/server"

import { generateDesign } from "@/design/jev/generate"

/**
 * POST { brief: string } → a full DesignConfig.
 *
 * Two requests to Jev and some arithmetic, about 1.3s. The key never leaves
 * the server: the SDK refuses to run in a browser unless you explicitly opt
 * in, and opting in would ship the credential to every visitor.
 */
export async function POST(request: Request) {
  if (!process.env.TYPESAFE_API_KEY) {
    return NextResponse.json(
      { error: "TYPESAFE_API_KEY is not set on the server." },
      { status: 503 }
    )
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
