import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const { searchParams } = new URL(request.url)
    const auctionId = searchParams.get("auction_id")
    const userId = searchParams.get("user_id")

    if (!auctionId || !userId) {
      return NextResponse.json({ error: "Auction ID and User ID required" }, { status: 400 })
    }

    const auction = await sql`
      SELECT id FROM auctions 
      WHERE id = ${auctionId} AND event_id = ${eventId}
    `

    if (!auction || auction.length === 0) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 })
    }

    const maxBid = await sql`
      SELECT * FROM max_bids
      WHERE auction_id = ${auctionId} AND user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1
    `

    return NextResponse.json({ maxBid: maxBid[0] || null })
  } catch (error: any) {
    console.error("[v0] Error fetching max bid:", error)

    if (error.message?.includes("relation") && error.message?.includes("does not exist")) {
      return NextResponse.json({ maxBid: null })
    }

    return NextResponse.json({ error: "Failed to fetch max bid" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const body = await request.json()
    const { auction_id, user_id, max_amount } = body

    const auction = await sql`
      SELECT id FROM auctions 
      WHERE id = ${auction_id} AND event_id = ${eventId}
    `

    if (!auction || auction.length === 0) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 })
    }

    const result = await sql`
      INSERT INTO max_bids (auction_id, user_id, max_amount)
      VALUES (${auction_id}, ${user_id}, ${max_amount})
      RETURNING *
    `

    return NextResponse.json({ maxBid: result[0] }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating max bid:", error)
    return NextResponse.json({ error: "Failed to create max bid" }, { status: 500 })
  }
}
