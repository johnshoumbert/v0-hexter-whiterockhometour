import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

// GET - Fetch pricing tiers for a ticket
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; ticketId: string }> },
) {
  try {
    const { ticketId } = await params

    const tiers = await sql`
      SELECT id, ticket_id, tier_name, price, start_date, end_date, display_order, created_at
      FROM pricing_tiers
      WHERE ticket_id = ${ticketId}
      ORDER BY display_order ASC, start_date ASC NULLS LAST
    `

    return NextResponse.json({ tiers })
  } catch (error) {
    console.error("[v0] Error fetching pricing tiers:", error)
    return NextResponse.json({ error: "Failed to fetch pricing tiers" }, { status: 500 })
  }
}

// POST - Create a new pricing tier
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; ticketId: string }> },
) {
  try {
    console.log("[v0] POST pricing tier - starting")

    const session = await getSession()
    console.log("[v0] Session check:", session ? "authenticated" : "not authenticated")

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { eventId, ticketId } = await params
    console.log("[v0] Params:", { eventId, ticketId })

    const body = await request.json()
    console.log("[v0] Request body:", body)

    const { tierName, price, startDate, endDate, displayOrder } = body

    if (!tierName || price === undefined) {
      console.log("[v0] Validation failed: missing tierName or price")
      return NextResponse.json({ error: "Tier name and price are required" }, { status: 400 })
    }

    // Validate both dates are provided
    if (!startDate || !endDate) {
      console.log("[v0] Validation failed: missing dates")
      return NextResponse.json({ error: "Both start date and end date are required" }, { status: 400 })
    }

    // Validate start date is before end date
    const start = new Date(startDate)
    const end = new Date(endDate)
    console.log("[v0] Date range:", { start, end })

    if (start >= end) {
      console.log("[v0] Validation failed: start date not before end date")
      return NextResponse.json({ error: "Start date must be before end date" }, { status: 400 })
    }

    // Check for overlapping date ranges with existing tiers
    console.log("[v0] Checking for overlapping tiers...")
    const existingTiers = await sql`
      SELECT id, start_date, end_date, tier_name
      FROM pricing_tiers
      WHERE ticket_id = ${ticketId}
      AND start_date IS NOT NULL
      AND end_date IS NOT NULL
    `
    console.log("[v0] Existing tiers count:", existingTiers.length)

    for (const existing of existingTiers) {
      const existingStart = new Date(existing.start_date)
      const existingEnd = new Date(existing.end_date)

      const hasOverlap =
        (start >= existingStart && start < existingEnd) ||
        (end > existingStart && end <= existingEnd) ||
        (start <= existingStart && end >= existingEnd)

      if (hasOverlap) {
        console.log("[v0] Overlap detected with tier:", existing.tier_name)
        return NextResponse.json(
          {
            error: `Date range overlaps with existing pricing tier "${existing.tier_name}"`,
          },
          { status: 400 },
        )
      }
    }

    console.log("[v0] Inserting new pricing tier...")
    const [tier] = await sql`
      INSERT INTO pricing_tiers (ticket_id, tier_name, price, start_date, end_date, display_order)
      VALUES (${ticketId}, ${tierName}, ${price}, ${startDate}, ${endDate}, ${displayOrder || 0})
      RETURNING *
    `
    console.log("[v0] Pricing tier created successfully:", tier)

    return NextResponse.json({ tier })
  } catch (error) {
    console.error("[v0] Error creating pricing tier:", error)
    return NextResponse.json({ error: "Failed to create pricing tier", details: String(error) }, { status: 500 })
  }
}
