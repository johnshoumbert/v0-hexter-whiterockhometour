import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Fetching all purchases for user:", session.id)

    // Fetch ticket purchases
    let ticketPurchases = []
    try {
      const tickets = await sql.query(
        `SELECT 
          tp.id,
          tp.event_id,
          tp.ticket_id,
          tp.quantity,
          tp.total_amount,
          tp.status,
          tp.created_at,
          et.name as ticket_name,
          e.event_name,
          e.domain
        FROM ticket_purchases tp
        JOIN event_tickets et ON tp.ticket_id = et.id
        JOIN events e ON tp.event_id = e.id
        WHERE tp.user_id = $1
        ORDER BY tp.created_at DESC`,
        [session.id],
      )
      ticketPurchases = tickets.map((t: any) => ({
        ...t,
        total_amount: typeof t.total_amount === "string" ? Number.parseFloat(t.total_amount) : t.total_amount,
        type: "ticket",
      }))
    } catch (error: any) {
      if (error.message.includes('relation "ticket_purchases" does not exist')) {
        console.log("[v0] ticket_purchases table does not exist yet")
      } else {
        throw error
      }
    }

    // Fetch raffle entries
    let raffleEntries = []
    try {
      const raffles = await sql.query(
        `SELECT 
          re.id,
          re.raffle_id,
          re.ticket_number,
          re.purchased_at as created_at,
          re.payment_amount as total_amount,
          re.payment_status as status,
          r.title as raffle_name,
          r.winner_user_id,
          r.winner_ticket_number,
          e.id as event_id,
          e.event_name,
          e.domain
        FROM raffle_entries re
        JOIN raffles r ON re.raffle_id = r.id
        JOIN events e ON r.event_id = e.id
        WHERE re.user_id = $1
        ORDER BY re.purchased_at DESC`,
        [session.id],
      )
      raffleEntries = raffles.map((r: any) => ({
        ...r,
        total_amount: typeof r.total_amount === "string" ? Number.parseFloat(r.total_amount) : r.total_amount,
        type: "raffle",
        is_winner: r.winner_user_id === session.id && r.winner_ticket_number === r.ticket_number,
      }))
    } catch (error: any) {
      if (error.message.includes('relation "raffle_entries" does not exist')) {
        console.log("[v0] raffle_entries table does not exist yet")
      } else {
        throw error
      }
    }

    console.log("[v0] Found purchases - Tickets:", ticketPurchases.length, "Raffles:", raffleEntries.length)

    return NextResponse.json({
      tickets: ticketPurchases,
      raffles: raffleEntries,
    })
  } catch (error) {
    console.error("[v0] Error fetching user purchases:", error)
    return NextResponse.json(
      { error: "Failed to fetch purchases", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
