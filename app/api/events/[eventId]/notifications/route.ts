import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    const notifications = await sql`
      SELECT n.* FROM notifications n
      JOIN auctions a ON n.auction_id = a.id
      WHERE n.user_id = ${userId} AND a.event_id = ${eventId}
      ORDER BY n.created_at DESC
      LIMIT 50
    `

    return NextResponse.json({ notifications })
  } catch (error: any) {
    console.error("[v0] Error fetching notifications:", error)

    if (error.message?.includes("relation") && error.message?.includes("does not exist")) {
      return NextResponse.json({ notifications: [] })
    }

    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
  }
}
