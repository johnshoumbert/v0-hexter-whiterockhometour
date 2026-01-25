import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export const dynamic = "force-dynamic"

// Check SendGrid status for a specific message ID
export async function POST(request: Request) {
  try {
    // Check admin authentication
    const session = await getSession()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { messageId } = await request.json()

    if (!messageId) {
      return NextResponse.json({ error: "Message ID required" }, { status: 400 })
    }

    // Check if SendGrid API key is configured
    if (!process.env.SENDGRID_API_KEY) {
      return NextResponse.json({ error: "SendGrid not configured" }, { status: 500 })
    }

    // Query SendGrid Activity API
    const response = await fetch(`https://api.sendgrid.com/v3/messages?query=msg_id="${messageId}"&limit=1`, {
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`SendGrid API error: ${response.statusText}`)
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      status: data.messages?.[0] || null,
    })
  } catch (error: any) {
    console.error("[v0] Error checking SendGrid status:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
