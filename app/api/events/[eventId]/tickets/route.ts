import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { useEventStore } from "@/stores/event-store"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params

    const tickets = await sql`
      SELECT * FROM event_tickets
      WHERE event_id = ${eventId}
      ORDER BY display_order ASC, created_at ASC
    `

    const now = new Date()
    const ticketsWithTiers = await Promise.all(
      tickets.map(async (ticket: any) => {
        const tiers = await sql`
          SELECT id, tier_name, price, start_date, end_date, display_order
          FROM pricing_tiers
          WHERE ticket_id = ${ticket.id}
          ORDER BY display_order ASC, start_date ASC NULLS LAST
        `

        // Find all tiers with active status and get the active tier name for price display
        let activeTierName = null
        const tiersWithStatus = tiers.map((tier: any) => {
          const startDate = tier.start_date ? new Date(tier.start_date) : null
          const endDate = tier.end_date ? new Date(tier.end_date) : null

          const isAfterStart = !startDate || now >= startDate
          const isBeforeEnd = !endDate || now <= endDate
          const isActive = isAfterStart && isBeforeEnd

          if (isActive) {
            activeTierName = tier.tier_name
          }

          return {
            id: tier.id,
            name: tier.tier_name,
            price: tier.price,
            startDate: tier.start_date,
            endDate: tier.end_date,
            displayOrder: tier.display_order,
            isActive,
          }
        })

        return {
          ...ticket,
          activeTierName, // For displaying current price
          pricingTiers: tiersWithStatus, // All tiers with active status
        }
      }),
    )

    return NextResponse.json({ tickets: ticketsWithTiers })
  } catch (error) {
    console.error("[v0] Error fetching tickets:", error)
    if (error instanceof Error && error.message.includes('relation "event_tickets" does not exist')) {
      return NextResponse.json({ tickets: [] })
    }
    return NextResponse.json(
      { error: "Failed to fetch tickets", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const body = await request.json()
    const { name, description, instructions, price, quantity_available, is_active } = body

    const result = await sql`
      INSERT INTO event_tickets (event_id, name, description, instructions, price, quantity_available, is_active)
      VALUES (${eventId}, ${name}, ${description || null}, ${instructions || null}, ${price}, ${quantity_available}, ${is_active !== false})
      RETURNING *
    `

    useEventStore.getState().invalidateCache()

    return NextResponse.json({ ticket: result[0] })
  } catch (error) {
    console.error("[v0] Error creating ticket:", error)
    return NextResponse.json(
      {
        error: "Failed to create ticket",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
