import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

// GET /api/likes?auction_id=xxx - Get like count and user's like status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const auctionId = searchParams.get("auction_id")

    if (!auctionId) {
      return NextResponse.json({ error: "Auction ID required" }, { status: 400 })
    }

    const session = await getSession()

    // Get total like count
    const countResult = await sql`
      SELECT COUNT(*) as count
      FROM auction_likes
      WHERE auction_id = ${auctionId}
    `
    const likeCount = Number(countResult[0]?.count || 0)

    // Check if current user has liked
    let userHasLiked = false
    if (session) {
      const userLikeResult = await sql`
        SELECT id
        FROM auction_likes
        WHERE auction_id = ${auctionId} AND user_id = ${session.id}
      `
      userHasLiked = userLikeResult.length > 0
    }

    return NextResponse.json({ likeCount, userHasLiked })
  } catch (error) {
    console.error("[v0] Error fetching likes:", error)
    return NextResponse.json({ error: "Failed to fetch likes" }, { status: 500 })
  }
}

// POST /api/likes - Toggle like on auction
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { auction_id } = await request.json()

    if (!auction_id) {
      return NextResponse.json({ error: "Auction ID required" }, { status: 400 })
    }

    const auctionResult = await sql`
      SELECT event_id FROM auctions WHERE id = ${auction_id}
    `

    if (auctionResult.length === 0) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 })
    }

    const eventId = auctionResult[0].event_id

    // Check if user already liked
    const existingLike = await sql`
      SELECT id FROM auction_likes
      WHERE user_id = ${session.id} AND auction_id = ${auction_id}
    `

    if (existingLike.length > 0) {
      // Unlike
      await sql`
        DELETE FROM auction_likes
        WHERE user_id = ${session.id} AND auction_id = ${auction_id}
      `
      return NextResponse.json({ liked: false })
    } else {
      await sql`
        INSERT INTO auction_likes (user_id, auction_id, event_id)
        VALUES (${session.id}, ${auction_id}, ${eventId})
      `
      return NextResponse.json({ liked: true })
    }
  } catch (error) {
    console.error("[v0] Error toggling like:", error)
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 })
  }
}
