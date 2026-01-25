import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getSession } from "@/lib/auth"

const sql = neon(process.env.NEON_DATABASE_URL!)

export async function POST(
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

    // Get the winning bid
    const bids = await sql`
      SELECT b.*, a.title as auction_title
      FROM bids b
      JOIN auctions a ON b.auction_id = a.id
      WHERE b.id = ${winnerId}
        AND b.event_id = ${eventId}
    `

    if (bids.length === 0) {
      return NextResponse.json({ error: "Winner not found" }, { status: 404 })
    }

    const bid = bids[0]

    // Check if payment is completed
    const payments = await sql`
      SELECT * FROM payments
      WHERE user_id = ${bid.user_id}
        AND (auction_id = ${bid.auction_id} OR id IN (
          SELECT payment_id FROM payment_items 
          WHERE metadata->>'bid_id' = ${bid.id}
        ))
        AND status IN ('completed', 'succeeded')
    `

    if (payments.length === 0) {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    // Generate release code
    const releaseCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    // Update bid to mark as delivered
    await sql`
      UPDATE bids
      SET delivered = true,
          release_code = ${releaseCode},
          released_at = NOW()
      WHERE id = ${winnerId}
    `

    console.log("[v0] Item released for winner:", winnerId)

    return NextResponse.json({
      success: true,
      releaseCode,
      message: "Item released successfully",
    })
  } catch (error: any) {
    console.error("[v0] Release item error:", error)
    return NextResponse.json({ error: "Failed to release item", message: error.message }, { status: 500 })
  }
}
