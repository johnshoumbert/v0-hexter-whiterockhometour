import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const { searchParams } = new URL(request.url)
    const auctionId = searchParams.get("auction_id")
    const userId = searchParams.get("user_id")

    if (!auctionId) {
      return NextResponse.json({ error: "Auction ID required" }, { status: 400 })
    }

    const auction = await sql`
      SELECT id FROM auctions 
      WHERE id = ${auctionId} AND event_id = ${eventId}
    `

    if (!auction || auction.length === 0) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 })
    }

    const likeCount = await sql`
      SELECT COUNT(*) as count FROM auction_likes
      WHERE auction_id = ${auctionId}
    `

    let userLiked = false
    if (userId) {
      const userLike = await sql`
        SELECT id FROM auction_likes
        WHERE auction_id = ${auctionId} AND user_id = ${userId}
      `
      userLiked = userLike.length > 0
    }

    return NextResponse.json({
      count: Number.parseInt(likeCount[0].count),
      userLiked,
    })
  } catch (error: any) {
    console.error("[v0] Error fetching likes:", error)

    if (error.message?.includes("relation") && error.message?.includes("does not exist")) {
      return NextResponse.json({ count: 0, userLiked: false })
    }

    return NextResponse.json({ error: "Failed to fetch likes" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const body = await request.json()
    const { auction_id, user_id } = body

    const auction = await sql`
      SELECT id FROM auctions 
      WHERE id = ${auction_id} AND event_id = ${eventId}
    `

    if (!auction || auction.length === 0) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 })
    }

    const existingLike = await sql`
      SELECT id FROM auction_likes
      WHERE auction_id = ${auction_id} AND user_id = ${user_id}
    `

    if (existingLike.length > 0) {
      await sql`
        DELETE FROM auction_likes
        WHERE auction_id = ${auction_id} AND user_id = ${user_id}
      `
      return NextResponse.json({ liked: false })
    } else {
      await sql`
        INSERT INTO auction_likes (auction_id, user_id)
        VALUES (${auction_id}, ${user_id})
      `
      return NextResponse.json({ liked: true })
    }
  } catch (error) {
    console.error("[v0] Error toggling like:", error)
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 })
  }
}
