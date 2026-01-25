import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ eventId: string; id: string }> }) {
  try {
    const { eventId, id } = await params

    await sql`
      UPDATE notifications n
      SET read = true
      FROM auctions a
      WHERE n.id = ${id} 
        AND n.auction_id = a.id 
        AND a.event_id = ${eventId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating notification:", error)
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ eventId: string; id: string }> }) {
  try {
    const { eventId, id } = await params

    await sql`
      DELETE FROM notifications n
      USING auctions a
      WHERE n.id = ${id} 
        AND n.auction_id = a.id 
        AND a.event_id = ${eventId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting notification:", error)
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 })
  }
}
