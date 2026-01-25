import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { useEventStore } from "@/stores/event-store"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; ticketId: string }> },
) {
  try {
    const { eventId, ticketId } = await params
    const body = await request.json()

    console.log("[v0] PUT ticket update - eventId:", eventId, "ticketId:", ticketId)
    console.log("[v0] Request body:", body)

    const allowedFields = [
      "name",
      "description",
      "instructions",
      "price",
      "quantity_available",
      "is_active",
      "display_order",
      "early_bird_price",
      "early_bird_end_date",
      "regular_price",
      "regular_end_date",
      "late_price",
    ]
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramIndex}`)
        values.push(value)
        paramIndex++
      }
    }

    console.log("[v0] Updates to apply:", updates)
    console.log("[v0] Values:", values)

    if (updates.length === 0) {
      console.error("[v0] No valid fields to update")
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    values.push(ticketId)
    values.push(eventId)

    const query = `
      UPDATE event_tickets
      SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex} AND event_id = $${paramIndex + 1}
      RETURNING *
    `

    console.log("[v0] SQL query:", query)
    console.log("[v0] Query parameters:", values)

    const result = await sql.query(query, values)

    console.log("[v0] Database result:", result)

    if (!result || result.length === 0) {
      console.error("[v0] Ticket not found in database")
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    useEventStore.getState().invalidateCache()

    console.log("[v0] Ticket updated successfully")
    return NextResponse.json({ ticket: result[0] })
  } catch (error) {
    console.error("[v0] Error updating ticket:", error)
    return NextResponse.json({ error: "Failed to update ticket", details: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; ticketId: string }> },
) {
  try {
    const { eventId, ticketId } = await params

    await sql`
      DELETE FROM event_tickets
      WHERE id = ${ticketId} AND event_id = ${eventId}
    `

    useEventStore.getState().invalidateCache()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting ticket:", error)
    return NextResponse.json({ error: "Failed to delete ticket" }, { status: 500 })
  }
}
