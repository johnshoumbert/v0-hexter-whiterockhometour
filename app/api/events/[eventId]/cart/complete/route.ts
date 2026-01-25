import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/session"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const session = await getSession()
    const body = await request.json()
    const { sessionId, orderId } = body

    console.log("[v0] Marking cart as completed:", { eventId, sessionId, orderId })

    const finalSessionId = sessionId || session?.userId

    if (!finalSessionId) {
      return NextResponse.json({ error: "No session ID provided" }, { status: 400 })
    }

    // Mark all cart items for this session as completed
    await sql`
      UPDATE abandoned_cart_tracking
      SET 
        completed_at = NOW(),
        order_id = ${orderId || null}
      WHERE event_id = ${eventId}
        AND session_id = ${finalSessionId}
        AND completed_at IS NULL
        AND abandoned_at IS NULL
    `

    console.log("[v0] Cart marked as completed")

    return NextResponse.json({ success: true, message: "Cart completed" })
  } catch (error: any) {
    console.error("[v0] Error completing cart:", error)
    return NextResponse.json(
      { error: "Failed to complete cart", details: error.message },
      { status: 500 }
    )
  }
}
