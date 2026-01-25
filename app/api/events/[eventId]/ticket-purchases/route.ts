import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { eventId } = await params

    const { searchParams } = new URL(request.url)
    const showAll = searchParams.get("showAll") === "true"

    console.log("[v0] Fetching ticket purchases for event:", eventId, "showAll:", showAll)

    const revokedFilter = showAll ? "" : "AND tp.is_revoked = false"

    const purchases = showAll
      ? await sql.query(
          `SELECT 
            tp.id,
            tp.ticket_id,
            tp.quantity,
            tp.total_amount,
            tp.status,
            tp.created_at,
            tp.is_claimed,
            tp.claimed_at,
            tp.is_revoked,
            u.name as user_name,
            u.email as user_email,
            et.name as ticket_name
          FROM ticket_purchases tp
          JOIN users u ON tp.user_id = u.id
          JOIN event_tickets et ON tp.ticket_id = et.id
          WHERE tp.event_id = $1
          ORDER BY tp.created_at DESC`,
          [eventId],
        )
      : await sql.query(
          `SELECT 
            tp.id,
            tp.ticket_id,
            tp.quantity,
            tp.total_amount,
            tp.status,
            tp.created_at,
            tp.is_claimed,
            tp.claimed_at,
            tp.is_revoked,
            u.name as user_name,
            u.email as user_email,
            et.name as ticket_name
          FROM ticket_purchases tp
          JOIN users u ON tp.user_id = u.id
          JOIN event_tickets et ON tp.ticket_id = et.id
          WHERE tp.event_id = $1 AND tp.user_id = $2 AND tp.is_revoked = false
          ORDER BY tp.created_at DESC`,
          [eventId, session.id],
        )

    console.log("[v0] Ticket purchases fetched:", purchases.length)

    const purchasesWithNumbers = purchases.map((p: any) => ({
      ...p,
      total_amount: typeof p.total_amount === "string" ? Number.parseFloat(p.total_amount) : p.total_amount,
      is_claimed: p.is_claimed || false,
      claimed_at: p.claimed_at || null,
      is_revoked: p.is_revoked || false,
    }))

    return NextResponse.json({ purchases: purchasesWithNumbers })
  } catch (error) {
    console.error("[v0] Error fetching ticket purchases:", error)
    if (error instanceof Error && error.message.includes('relation "ticket_purchases" does not exist')) {
      console.log("[v0] ticket_purchases table does not exist yet, returning empty array")
      return NextResponse.json({ purchases: [] })
    }
    return NextResponse.json(
      { error: "Failed to fetch ticket purchases", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
