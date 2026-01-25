import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const { userId, staffRoleId, selectedSlotIds } = await request.json()

    const result = await sql(
      `INSERT INTO user_staff_assignments (event_id, user_id, staff_role_id, selected_slot_ids)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, staff_role_id, event_id) DO UPDATE
       SET selected_slot_ids = $4, updated_at = NOW()
       RETURNING *`,
      [eventId, userId, staffRoleId, selectedSlotIds],
    )

    return NextResponse.json({ assignment: result[0] })
  } catch (error) {
    console.error("[v0] Failed to create staff assignment:", error)
    return NextResponse.json({ error: "Failed to create staff assignment" }, { status: 500 })
  }
}
