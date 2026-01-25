import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

// PUT - Update a pricing tier
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; ticketId: string; tierId: string }> },
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { tierId, ticketId } = await params
    const body = await request.json()
    const { tierName, price, startDate, endDate, displayOrder } = body

    if (!tierName || price === undefined) {
      return NextResponse.json({ error: "Tier name and price are required" }, { status: 400 })
    }

    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)

      if (start >= end) {
        return NextResponse.json({ error: "Start date must be before end date" }, { status: 400 })
      }

      // Check for overlapping date ranges with other tiers (excluding current tier)
      const existingTiers = await sql`
        SELECT * FROM pricing_tiers
        WHERE ticket_id = ${ticketId}
        AND id != ${tierId}
        AND (
          (start_date < ${endDate} AND end_date > ${startDate})
        )
      `

      if (existingTiers.length > 0) {
        return NextResponse.json(
          { error: `Date range overlaps with existing tier "${existingTiers[0].tier_name}"` },
          { status: 400 },
        )
      }
    }

    const [tier] = await sql`
      UPDATE pricing_tiers
      SET 
        tier_name = ${tierName},
        price = ${price},
        start_date = ${startDate || null},
        end_date = ${endDate || null},
        display_order = ${displayOrder || 0},
        updated_at = NOW()
      WHERE id = ${tierId}
      RETURNING *
    `

    if (!tier) {
      return NextResponse.json({ error: "Pricing tier not found" }, { status: 404 })
    }

    return NextResponse.json({ tier })
  } catch (error) {
    console.error("[v0] Error updating pricing tier:", error)
    return NextResponse.json({ error: "Failed to update pricing tier" }, { status: 500 })
  }
}

// DELETE - Delete a pricing tier
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; ticketId: string; tierId: string }> },
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { tierId } = await params

    await sql`DELETE FROM pricing_tiers WHERE id = ${tierId}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting pricing tier:", error)
    return NextResponse.json({ error: "Failed to delete pricing tier" }, { status: 500 })
  }
}
