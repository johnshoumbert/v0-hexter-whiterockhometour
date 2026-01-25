import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { useEventStore } from "@/stores/event-store"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params

    try {
      const raffles = await sql`
        SELECT 
          r.*,
          u.name as winner_name,
          u.email as winner_email,
          (SELECT COUNT(*) FROM raffle_entries WHERE raffle_id = r.id) as entry_count
        FROM raffles r
        LEFT JOIN users u ON r.winner_user_id = u.id
        WHERE r.event_id = ${eventId}
        ORDER BY r.created_at DESC
      `

      return NextResponse.json({ raffles })
    } catch (error: any) {
      // If table doesn't exist, return empty array with setup message
      if (error.code === "42P01") {
        return NextResponse.json({
          raffles: [],
          message:
            "Raffle tables not yet created. Please run scripts/create-raffles-v1.sql to set up the raffle system.",
        })
      }
      throw error
    }
  } catch (error) {
    console.error("[v0] Error fetching raffles:", error)
    return NextResponse.json({ error: "Failed to fetch raffles" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { eventId } = await params
    const body = await request.json()
    const {
      title,
      description,
      ticket_price,
      max_tickets_per_user,
      total_tickets_available,
      image_url,
      start_date,
      end_date,
      is_active,
    } = body

    try {
      const result = await sql`
        INSERT INTO raffles (
          event_id,
          title,
          description,
          ticket_price,
          max_tickets_per_user,
          total_tickets_available,
          image_url,
          start_date,
          end_date,
          is_active
        ) VALUES (
          ${eventId},
          ${title},
          ${description || null},
          ${ticket_price || 0},
          ${max_tickets_per_user || null},
          ${total_tickets_available || null},
          ${image_url || null},
          ${start_date},
          ${end_date},
          ${is_active !== false}
        )
        RETURNING *
      `

      useEventStore.getState().invalidateCache()

      return NextResponse.json({ raffle: result[0] })
    } catch (error: any) {
      // If table doesn't exist, return helpful error
      if (error.code === "42P01") {
        return NextResponse.json(
          {
            error:
              "Raffle tables not yet created. Please run scripts/create-raffles-v1.sql to set up the raffle system.",
          },
          { status: 400 },
        )
      }
      throw error
    }
  } catch (error) {
    console.error("[v0] Error creating raffle:", error)
    return NextResponse.json({ error: "Failed to create raffle" }, { status: 500 })
  }
}
