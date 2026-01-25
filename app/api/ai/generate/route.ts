import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    let prompt = ""

    switch (type) {
      case "organization":
        prompt = `Write a short, friendly description (2-3 sentences) for a school or PTA organization called "${data.name}" that focuses on community, students, and support. Make it warm and inviting.`
        break
      case "auction":
        prompt = `Write a compelling description (2-3 sentences) for a fundraising auction called "${data.name}" for ${data.organizationName}. Make it sound engaging, community-driven, and exciting. Emphasize the impact on students and the school community.`
        break
      case "item":
        prompt = `Generate a brief, enthusiastic description (2-3 sentences) for an auction item called "${data.name}", donated by ${data.donor}. Make it sound appealing and valuable for bidders. Highlight what makes it special.`
        break
      default:
        return NextResponse.json({ error: "Invalid generation type" }, { status: 400 })
    }

    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      prompt,
    })

    return NextResponse.json({ text })
  } catch (error) {
    console.error("[v0] Error generating AI content:", error)
    return NextResponse.json({ error: "Failed to generate content" }, { status: 500 })
  }
}
