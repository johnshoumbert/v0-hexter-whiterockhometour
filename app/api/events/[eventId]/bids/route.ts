import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const { searchParams } = new URL(request.url)
    const auctionId = searchParams.get("auction_id") || searchParams.get("auction")
    const userId = searchParams.get("user")

    let query = `
      SELECT 
        b.id, b.amount, b.created_at,
        u.name as user_name, u.email as user_email,
        a.title as auction_title, a.id as auction_id
      FROM bids b
      JOIN users u ON b.user_id = u.id
      JOIN auctions a ON b.auction_id = a.id
      WHERE a.event_id = $1
    `

    const queryParams: any[] = [eventId]
    let paramIndex = 2

    if (auctionId) {
      query += ` AND b.auction_id = $${paramIndex}`
      queryParams.push(auctionId)
      paramIndex++
    }

    if (userId && userId !== "me") {
      query += ` AND b.user_id = $${paramIndex}`
      queryParams.push(userId)
      paramIndex++
    }

    query += ` ORDER BY b.created_at DESC`

    const bids = await sql.query(query, queryParams)

    return NextResponse.json({ bids: bids.rows })
  } catch (error: any) {
    console.error("[v0] Error fetching bids:", error)

    if (error.message?.includes("column") && error.message?.includes("event_id")) {
      const { searchParams } = new URL(request.url)
      const auctionId = searchParams.get("auction_id") || searchParams.get("auction")

      let fallbackQuery = `
        SELECT 
          b.id, b.amount, b.created_at,
          u.name as user_name, u.email as user_email,
          a.title as auction_title, a.id as auction_id
        FROM bids b
        JOIN users u ON b.user_id = u.id
        JOIN auctions a ON b.auction_id = a.id
      `

      const queryParams: any[] = []
      const paramIndex = 1

      if (auctionId) {
        fallbackQuery += ` WHERE b.auction_id = $${paramIndex}`
        queryParams.push(auctionId)
      }

      fallbackQuery += ` ORDER BY b.created_at DESC`

      const bids = await sql.query(fallbackQuery, queryParams)
      return NextResponse.json({ bids: bids.rows })
    }

    return NextResponse.json({ error: "Failed to fetch bids" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const body = await request.json()
    const { auction_id, user_id, amount, is_max_bid = false } = body

    const auction = await sql`
      SELECT * FROM auctions 
      WHERE id = ${auction_id} AND event_id = ${eventId}
    `

    if (!auction || auction.length === 0) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 })
    }

    const currentAuction = auction[0]

    if (amount <= currentAuction.current_bid) {
      return NextResponse.json({ error: "Bid must be higher than current bid" }, { status: 400 })
    }

    const previousHighBidder = await sql`
      SELECT user_id FROM bids
      WHERE auction_id = ${auction_id}
      ORDER BY amount DESC
      LIMIT 1
    `

    const result = await sql`
      INSERT INTO bids (auction_id, user_id, amount)
      VALUES (${auction_id}, ${user_id}, ${amount})
      RETURNING *
    `

    await sql`
      UPDATE auctions
      SET current_bid = ${amount}
      WHERE id = ${auction_id}
    `

    if (previousHighBidder && previousHighBidder.length > 0) {
      const prevUserId = previousHighBidder[0].user_id
      if (prevUserId !== user_id) {
        try {
          await sql`
            INSERT INTO notifications (user_id, type, auction_id, message, read)
            VALUES (
              ${prevUserId},
              'outbid',
              ${auction_id},
              'You have been outbid on ' || ${currentAuction.title},
              false
            )
          `
        } catch (notifError) {
          console.error("[v0] Error creating notification:", notifError)
        }
      }
    }

    return NextResponse.json({ bid: result[0] }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating bid:", error)
    return NextResponse.json({ error: "Failed to create bid" }, { status: 500 })
  }
}
