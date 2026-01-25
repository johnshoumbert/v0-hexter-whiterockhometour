import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { useEventStore } from "@/stores/event-store"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; raffleId: string }> },
) {
  try {
    const { raffleId } = await params

    const result = await sql`
      SELECT 
        r.*,
        u.name as winner_name,
        u.email as winner_email,
        (SELECT COUNT(*) FROM raffle_entries WHERE raffle_id = r.id) as entry_count
      FROM raffles r
      LEFT JOIN users u ON r.winner_user_id = u.id
      WHERE r.id = ${raffleId}
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Raffle not found" }, { status: 404 })
    }

    return NextResponse.json({ raffle: result[0] })
  } catch (error) {
    console.error("[v0] Error fetching raffle:", error)
    return NextResponse.json({ error: "Failed to fetch raffle" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; raffleId: string }> },
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { raffleId } = await params
    const body = await request.json()

    const result = await sql`
      UPDATE raffles
      SET
        title = COALESCE(${body.title}, title),
        description = COALESCE(${body.description}, description),
        ticket_price = COALESCE(${body.ticket_price}, ticket_price),
        max_tickets_per_user = COALESCE(${body.max_tickets_per_user}, max_tickets_per_user),
        total_tickets_available = COALESCE(${body.total_tickets_available}, total_tickets_available),
        image_url = COALESCE(${body.image_url}, image_url),
        start_date = COALESCE(${body.start_date}, start_date),
        end_date = COALESCE(${body.end_date}, end_date),
        is_active = COALESCE(${body.is_active}, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${raffleId}
      RETURNING *
    `

    useEventStore.getState().invalidateCache()

    return NextResponse.json({ raffle: result[0] })
  } catch (error) {
    console.error("[v0] Error updating raffle:", error)
    return NextResponse.json({ error: "Failed to update raffle" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; raffleId: string }> },
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { raffleId } = await params

    await sql`DELETE FROM raffles WHERE id = ${raffleId}`

    useEventStore.getState().invalidateCache()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting raffle:", error)
    return NextResponse.json({ error: "Failed to delete raffle" }, { status: 500 })
  }
}
