import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/session"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; winnerId: string }> },
) {
  try {
    const user = await getSession()
    const { eventId, winnerId } = await params

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const isGlobalAdmin = user.role === "admin"
    const eventAdmins = await sql`
      SELECT * FROM event_users
      WHERE event_id = ${eventId} AND user_id = ${user.id} AND role = 'admin'
    `
    const isEventAdmin = eventAdmins.length > 0

    if (!isGlobalAdmin && !isEventAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { delivered } = body

    console.log("[v0] Updating delivery status:", { winnerId, delivered })

    // Update the bid's delivered status
    await sql`
      UPDATE bids
      SET delivered = ${delivered},
          released_at = ${delivered ? "NOW()" : null}
      WHERE id = ${winnerId}
        AND event_id = ${eventId}
    `

    console.log("[v0] Delivery status updated successfully")

    return NextResponse.json({ 
      success: true, 
      delivered,
      message: `Item marked as ${delivered ? "delivered" : "awaiting pickup"}` 
    })
  } catch (error: any) {
    console.error("[v0] Update delivery status error:", error)
    return NextResponse.json({ error: "Failed to update delivery status", message: error.message }, { status: 500 })
  }
}
