import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const { ticketId } = await request.json()

    if (!ticketId) {
      return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 })
    }

    // Fetch ticket base price
    const [ticket] = await sql`
      SELECT id, name, price
      FROM event_tickets
      WHERE id = ${ticketId} AND event_id = ${eventId}
    `

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    // Fetch all pricing tiers for this ticket
    const tiers = await sql`
      SELECT id, tier_name, price, start_date, end_date, display_order
      FROM pricing_tiers
      WHERE ticket_id = ${ticketId}
      ORDER BY display_order ASC, start_date ASC NULLS LAST
    `

    const now = new Date()
    let currentPrice = ticket.price
    let activeTier = null

    // Find the first active tier based on current date
    for (const tier of tiers) {
      const startDate = tier.start_date ? new Date(tier.start_date) : null
      const endDate = tier.end_date ? new Date(tier.end_date) : null

      // Check if tier is currently active
      const isAfterStart = !startDate || now >= startDate
      const isBeforeEnd = !endDate || now <= endDate

      if (isAfterStart && isBeforeEnd) {
        currentPrice = tier.price
        activeTier = {
          id: tier.id,
          name: tier.tier_name,
          price: tier.price,
          endDate: tier.end_date,
        }
        break // Use first matching tier
      }
    }

    return NextResponse.json({
      price: currentPrice,
      tier: activeTier,
      baseprice: ticket.price,
      allTiers: tiers.map((t: any) => ({
        id: t.id,
        name: t.tier_name,
        price: t.price,
        startDate: t.start_date,
        endDate: t.end_date,
      })),
    })
  } catch (error) {
    console.error("[v0] Error calculating price:", error)
    return NextResponse.json(
      { error: "Failed to calculate price", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
