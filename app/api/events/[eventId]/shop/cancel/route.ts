import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { eventId } = await params
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    console.log("[v0] Cancelling orders for session:", sessionId)

    // Delete orders that are still in checkout status
    const result = await sql`
      DELETE FROM shop_orders
      WHERE stripe_session_id = ${sessionId}
        AND event_id = ${eventId}
        AND user_id = ${session.id}
        AND status = 'checkout'
      RETURNING id
    `

    console.log(`[v0] Deleted ${result.length} cancelled checkout orders`)

    return NextResponse.json({
      success: true,
      deletedCount: result.length,
    })
  } catch (error) {
    console.error("[v0] Error cancelling orders:", error)
    return NextResponse.json({ error: "Failed to cancel orders" }, { status: 500 })
  }
}
