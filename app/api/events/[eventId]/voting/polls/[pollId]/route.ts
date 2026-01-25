import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { useEventStore } from "@/stores/event-store"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string; pollId: string }> }) {
  try {
    const { pollId } = await params

    const [poll] = await sql`
      SELECT * FROM voting_polls WHERE id = ${pollId}
    `

    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 })
    }

    const items = await sql`
      SELECT 
        vi.*,
        COUNT(v.id) as vote_count
      FROM voting_items vi
      LEFT JOIN votes v ON v.item_id = vi.id
      WHERE vi.poll_id = ${pollId}
      GROUP BY vi.id
      ORDER BY vi.display_order, vi.created_at
    `

    return NextResponse.json({ poll, items })
  } catch (error) {
    console.error("[v0] Error fetching poll details:", error)
    return NextResponse.json({ error: "Failed to fetch poll details" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; pollId: string }> },
) {
  try {
    const { pollId } = await params
    const body = await request.json()
    const { title, description, is_active, start_date, end_date, blind_voting } = body

    const [poll] = await sql`
      UPDATE voting_polls
      SET 
        title = COALESCE(${title}, title),
        description = COALESCE(${description}, description),
        is_active = COALESCE(${is_active}, is_active),
        start_date = COALESCE(${start_date}, start_date),
        end_date = COALESCE(${end_date}, end_date),
        blind_voting = COALESCE(${blind_voting}, blind_voting),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${pollId}
      RETURNING *
    `

    useEventStore.getState().invalidateCache()

    return NextResponse.json({ poll })
  } catch (error) {
    console.error("[v0] Error updating poll:", error)
    return NextResponse.json({ error: "Failed to update poll" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; pollId: string }> },
) {
  try {
    const { pollId } = await params

    await sql`DELETE FROM voting_polls WHERE id = ${pollId}`

    useEventStore.getState().invalidateCache()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting poll:", error)
    return NextResponse.json({ error: "Failed to delete poll" }, { status: 500 })
  }
}
