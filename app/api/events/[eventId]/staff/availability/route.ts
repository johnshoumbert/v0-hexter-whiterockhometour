import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params

    const slots = await sql`
      SELECT * FROM staff_availability_slots
      WHERE event_id = ${eventId}
      ORDER BY date_time ASC
    `

    return NextResponse.json({ slots })
  } catch (error) {
    console.error("[v0] Failed to fetch availability slots:", error)
    return NextResponse.json({ error: "Failed to fetch availability slots" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const { staffRoleId, startTime, endTime, capacity } = await request.json()

    console.log("[v0] Creating availability slot:", { eventId, staffRoleId, startTime, endTime, capacity })

    if (new Date(endTime) <= new Date(startTime)) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO staff_availability_slots (event_id, staff_role_id, date_time, end_time, capacity)
      VALUES (${eventId}, ${staffRoleId}, ${startTime}, ${endTime}, ${capacity})
      RETURNING *
    `

    console.log("[v0] Availability slot created:", result[0])

    return NextResponse.json({ slot: result[0] })
  } catch (error) {
    console.error("[v0] Failed to create availability slot:", error)
    return NextResponse.json({ error: "Failed to create availability slot", details: String(error) }, { status: 500 })
  }
}
