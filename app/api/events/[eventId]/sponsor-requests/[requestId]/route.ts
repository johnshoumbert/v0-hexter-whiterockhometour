import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string; requestId: string }> }) {
  try {
    const { eventId, requestId } = await params

    const requestData = await sql`
      SELECT sr.*, sl.amount as level_amount
      FROM sponsor_requests sr
      LEFT JOIN sponsor_levels sl ON sl.event_id = sr.event_id AND sl.level = sr.sponsorship_level
      WHERE sr.id = ${requestId} AND sr.event_id = ${eventId}
      LIMIT 1
    `

    if (requestData.length === 0) {
      return NextResponse.json({ error: "Sponsor request not found" }, { status: 404 })
    }

    return NextResponse.json({ request: requestData[0] })
  } catch (error) {
    console.error("[v0] Error fetching sponsor request:", error)
    return NextResponse.json({ error: "Failed to fetch sponsor request" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ eventId: string; requestId: string }> }) {
  try {
    const { eventId, requestId } = await params
    const body = await request.json()
    const { status } = body

    const updated = await sql`
      UPDATE sponsor_requests
      SET 
        status = ${status},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${requestId} AND event_id = ${eventId}
      RETURNING *
    `

    if (updated.length === 0) {
      return NextResponse.json({ error: "Sponsor request not found" }, { status: 404 })
    }

    return NextResponse.json({ request: updated[0] })
  } catch (error) {
    console.error("[v0] Error updating sponsor request:", error)
    return NextResponse.json({ error: "Failed to update sponsor request" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ eventId: string; requestId: string }> }) {
  try {
    const { eventId, requestId } = await params

    const deleted = await sql`
      DELETE FROM sponsor_requests
      WHERE id = ${requestId} AND event_id = ${eventId}
      RETURNING *
    `

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Sponsor request not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Sponsor request deleted successfully" })
  } catch (error) {
    console.error("[v0] Error deleting sponsor request:", error)
    return NextResponse.json({ error: "Failed to delete sponsor request" }, { status: 500 })
  }
}
