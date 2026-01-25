import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "active"
    const featured = searchParams.get("featured")
    const limit = searchParams.get("limit")

    let query = `
      SELECT 
        a.id, a.title, a.description, a.min_bid,
        COALESCE(MAX(b.amount), a.min_bid) as current_bid,
        a.image_url, a.start_time, a.end_time, a.category, a.status,
        a.slug, a.featured, a.event_id, a.donor, a.bid_increment,
        COUNT(DISTINCT b.id) as bid_count
      FROM auctions a
      LEFT JOIN bids b ON a.id = b.auction_id
      WHERE a.event_id = $1
    `

    const queryParams: any[] = [eventId]
    let paramIndex = 2

    if (status !== "all") {
      query += ` AND a.status = $${paramIndex}`
      queryParams.push(status)
      paramIndex++
    }

    if (featured === "true") {
      query += ` AND a.featured = true`
    }

    query += ` GROUP BY a.id ORDER BY a.created_at DESC`

    if (limit) {
      query += ` LIMIT $${paramIndex}`
      queryParams.push(Number.parseInt(limit))
    }

    const result = await sql.query(query, queryParams)
    const auctions = result?.rows || []

    return NextResponse.json({ auctions })
  } catch (error: any) {
    console.error("[v0] Error fetching auctions:", error)

    if (error.message?.includes("column") && error.message?.includes("event_id")) {
      const { searchParams } = new URL(request.url)
      const status = searchParams.get("status") || "active"
      const limit = searchParams.get("limit")

      let fallbackQuery = `
        SELECT 
          a.id, a.title, a.description, a.min_bid,
          COALESCE(MAX(b.amount), a.min_bid) as current_bid,
          a.image_url, a.start_time, a.end_time, a.category, a.status, a.slug,
          a.donor, a.bid_increment,
          COUNT(DISTINCT b.id) as bid_count
        FROM auctions a
        LEFT JOIN bids b ON a.id = b.auction_id
      `

      const queryParams: any[] = []
      let paramIndex = 1

      if (status !== "all") {
        fallbackQuery += ` WHERE a.status = $${paramIndex}`
        queryParams.push(status)
        paramIndex++
      }

      fallbackQuery += ` GROUP BY a.id ORDER BY a.created_at DESC`

      if (limit) {
        fallbackQuery += ` LIMIT $${paramIndex}`
        queryParams.push(Number.parseInt(limit))
      }

      const result = await sql.query(fallbackQuery, queryParams)
      const auctions = result?.rows || []
      return NextResponse.json({ auctions })
    }

    return NextResponse.json({ auctions: [] })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const body = await request.json()
    const {
      title,
      description,
      min_bid,
      bid_increment,
      image_url,
      start_time,
      end_time,
      category,
      donor,
      featured = false,
      status = "active",
    } = body

    const slug =
      body.slug ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")

    const result = await sql`
      INSERT INTO auctions (
        title, description, min_bid, bid_increment, image_url,
        start_time, end_time, category, donor, status, slug, featured, event_id
      )
      VALUES (
        ${title}, ${description}, ${min_bid}, ${bid_increment}, ${image_url},
        ${start_time}, ${end_time}, ${category}, ${donor}, ${status}, ${slug}, ${featured}, ${eventId}
      )
      RETURNING *
    `

    return NextResponse.json({ auction: result[0] }, { status: 201 })
  } catch (error: any) {
    console.error("[v0] Error creating auction:", error)

    if (error.message?.includes("column") && error.message?.includes("event_id")) {
      const body = await request.json()
      const {
        title,
        description,
        min_bid,
        bid_increment,
        image_url,
        start_time,
        end_time,
        category,
        donor,
        status = "active",
      } = body

      const slug =
        body.slug ||
        title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")

      const result = await sql`
        INSERT INTO auctions (
          title, description, min_bid, bid_increment, image_url,
          start_time, end_time, category, donor, status, slug
        )
        VALUES (
          ${title}, ${description}, ${min_bid}, ${bid_increment}, ${image_url},
          ${start_time}, ${end_time}, ${category}, ${donor}, ${status}, ${slug}
        )
        RETURNING *
      `

      return NextResponse.json({ auction: result[0] }, { status: 201 })
    }

    return NextResponse.json({ error: "Failed to create auction" }, { status: 500 })
  }
}
