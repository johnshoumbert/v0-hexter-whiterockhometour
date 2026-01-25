import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

// GET /api/max-bids?auction_id=xxx - Get user's max bid for auction
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const auctionId = searchParams.get("auction_id")

    if (!auctionId) {
      return NextResponse.json({ error: "Auction ID required" }, { status: 400 })
    }

    const result = await sql`
      SELECT * FROM max_bids
      WHERE user_id = ${session.id} AND auction_id = ${auctionId}
    `

    return NextResponse.json({ maxBid: result[0] || null })
  } catch (error) {
    console.error("[v0] Error fetching max bid:", error)
    return NextResponse.json({ error: "Failed to fetch max bid" }, { status: 500 })
  }
}

// POST /api/max-bids - Set or update max bid
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { auction_id, max_amount } = await request.json()

    if (!auction_id || !max_amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get current auction bid
    const auctionResult = await sql`
      SELECT current_bid, min_bid FROM auctions WHERE id = ${auction_id}
    `
    const currentBid = Number(auctionResult[0]?.current_bid || auctionResult[0]?.min_bid || 0)

    if (Number(max_amount) <= currentBid) {
      return NextResponse.json({ error: "Max bid must be higher than current bid" }, { status: 400 })
    }

    // Upsert max bid
    await sql`
      INSERT INTO max_bids (user_id, auction_id, max_amount, current_bid, updated_at)
      VALUES (${session.id}, ${auction_id}, ${max_amount}, ${currentBid}, NOW())
      ON CONFLICT (user_id, auction_id)
      DO UPDATE SET max_amount = ${max_amount}, updated_at = NOW()
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error setting max bid:", error)
    return NextResponse.json({ error: "Failed to set max bid" }, { status: 500 })
  }
}
