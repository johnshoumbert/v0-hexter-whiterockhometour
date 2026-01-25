import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

// DELETE /api/bids/[id] - Cancel a bid
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Verify the bid belongs to the user
    const bidResult = await sql`
      SELECT b.*, a.title as auction_title
      FROM bids b
      JOIN auctions a ON b.auction_id = a.id
      WHERE b.id = ${id} AND b.user_id = ${session.id}
    `

    if (bidResult.length === 0) {
      return NextResponse.json({ error: "Bid not found or unauthorized" }, { status: 404 })
    }

    const bid = bidResult[0]

    // Check if this is the highest bid
    const highestBidResult = await sql`
      SELECT id, user_id, amount
      FROM bids
      WHERE auction_id = ${bid.auction_id}
      ORDER BY amount DESC, created_at DESC
      LIMIT 1
    `

    if (highestBidResult.length === 0 || highestBidResult[0].id !== id) {
      return NextResponse.json({ error: "Can only cancel your highest bid" }, { status: 400 })
    }

    // Delete the bid
    await sql`
      DELETE FROM bids
      WHERE id = ${id}
    `

    return NextResponse.json({
      success: true,
      message: `Bid of $${bid.amount} on "${bid.auction_title}" has been cancelled`,
    })
  } catch (error) {
    console.error("[v0] Error cancelling bid:", error)
    return NextResponse.json({ error: "Failed to cancel bid" }, { status: 500 })
  }
}
