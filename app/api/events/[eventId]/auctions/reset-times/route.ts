import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.NEON_DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params

    console.log("[v0] Reset auction times - Event ID:", eventId)

    // First, get the event's start and end times
    const eventResult = await sql`
      SELECT start_date, end_date 
      FROM events 
      WHERE id = ${eventId}
    `

    console.log("[v0] Event query result:", eventResult)

    if (eventResult.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    const event = eventResult[0]
    console.log("[v0] Event times - start:", event.start_date, "end:", event.end_date)

    if (!event.start_date || !event.end_date) {
      return NextResponse.json({ error: "Event does not have start and end dates configured" }, { status: 400 })
    }

    // Update all auction items for this event ONLY
    const updateResult = await sql`
      UPDATE auctions 
      SET 
        start_time = ${event.start_date},
        end_time = ${event.end_date},
        updated_at = NOW()
      WHERE event_id = ${eventId}
      RETURNING id, title
    `

    console.log("[v0] Updated auctions for event", eventId, "- Count:", updateResult.length)
    console.log("[v0] First 3 updated items:", updateResult.slice(0, 3))

    return NextResponse.json({
      success: true,
      message: `Successfully reset times for ${updateResult.length} auction items to event start/end times`,
      updatedCount: updateResult.length,
      eventId: eventId,
    })
  } catch (error) {
    console.error("[v0] Failed to reset auction times:", error)
    return NextResponse.json({ error: "Failed to reset auction times" }, { status: 500 })
  }
}
