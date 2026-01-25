import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { useEventStore } from "@/stores/event-store"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params

    const polls = await sql`
      SELECT 
        p.*,
        COUNT(DISTINCT v.user_id) as total_votes
      FROM voting_polls p
      LEFT JOIN votes v ON v.poll_id = p.id
      WHERE p.event_id = ${eventId}
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `

    return NextResponse.json({ polls })
  } catch (error) {
    console.error("[v0] Error fetching voting polls:", error)
    return NextResponse.json({ error: "Failed to fetch voting polls" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    console.log("[v0] Creating poll for event:", eventId)

    const body = await request.json()
    console.log("[v0] Poll data:", body)

    const { title, description, is_active, start_date, end_date } = body

    if (!title || title.trim() === "") {
      console.error("[v0] Poll title is required")
      return NextResponse.json({ error: "Poll title is required" }, { status: 400 })
    }

    const [poll] = await sql`
      INSERT INTO voting_polls (event_id, title, description, is_active, start_date, end_date)
      VALUES (${eventId}, ${title}, ${description || null}, ${is_active || false}, ${start_date || null}, ${end_date || null})
      RETURNING *
    `

    console.log("[v0] Poll created successfully:", poll.id)

    useEventStore.getState().invalidateCache()

    return NextResponse.json({ poll })
  } catch (error) {
    console.error("[v0] Error creating voting poll:", error)
    return NextResponse.json(
      {
        error: "Failed to create voting poll",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
