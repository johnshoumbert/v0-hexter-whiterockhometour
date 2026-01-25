import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    console.log("[v0] Fetching auction by slug or id:", id)

    let auctions
    try {
      auctions = await sql`
        SELECT a.*, 
          COALESCE((SELECT COUNT(*) FROM bids WHERE auction_id = a.id), 0) as bid_count,
          COALESCE((SELECT MAX(amount) FROM bids WHERE auction_id = a.id), a.min_bid) as current_bid,
          u.name as creator_name,
          e.start_date as event_start_date,
          e.end_date as event_end_date,
          COALESCE(a.start_time, e.start_date) as effective_start_time,
          COALESCE(a.end_time, e.end_date) as effective_end_time
        FROM auctions a
        LEFT JOIN users u ON a.created_by = u.id
        LEFT JOIN events e ON a.event_id = e.id
        WHERE a.slug = ${id}
        LIMIT 1
      `

      console.log("[v0] Query by slug result count:", auctions.length)
    } catch (slugError) {
      console.error("[v0] Error querying by slug:", slugError)
      auctions = []
    }

    if (auctions.length === 0) {
      // Check if id is a valid UUID format before querying
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

      if (uuidRegex.test(id)) {
        try {
          auctions = await sql`
            SELECT a.*, 
              COALESCE((SELECT COUNT(*) FROM bids WHERE auction_id = a.id), 0) as bid_count,
              COALESCE((SELECT MAX(amount) FROM bids WHERE auction_id = a.id), a.min_bid) as current_bid,
              u.name as creator_name,
              e.start_date as event_start_date,
              e.end_date as event_end_date,
              COALESCE(a.start_time, e.start_date) as effective_start_time,
              COALESCE(a.end_time, e.end_date) as effective_end_time
            FROM auctions a
            LEFT JOIN users u ON a.created_by = u.id
            LEFT JOIN events e ON a.event_id = e.id
            WHERE a.id = ${id}
            LIMIT 1
          `

          console.log("[v0] Query by id result count:", auctions.length)
        } catch (idError) {
          console.error("[v0] Error querying by id:", idError)
          auctions = []
        }
      } else {
        console.log("[v0] ID is not a valid UUID format, skipping UUID query")
      }
    }

    if (auctions.length === 0) {
      console.log("[v0] Auction not found:", id)
      return NextResponse.json({ error: "Auction not found" }, { status: 404 })
    }

    console.log("[v0] Auction found:", auctions[0].title)
    return NextResponse.json({ auction: auctions[0] })
  } catch (error) {
    console.error("[v0] Get auction error:", error)
    return NextResponse.json(
      { error: "Failed to fetch auction", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user || !user.is_admin) {
      console.error("[v0] Unauthorized update attempt:", { user })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const updates = await request.json()

    console.log("[v0] Updating auction:", { id, updates })

    try {
      const updatedAuctions = await sql`
        UPDATE auctions
        SET 
          title = COALESCE(${updates.title}, title),
          slug = COALESCE(${updates.slug}, slug),
          description = COALESCE(${updates.description}, description),
          image_url = COALESCE(${updates.image_url}, image_url),
          category = COALESCE(${updates.category}, category),
          donor = COALESCE(${updates.donor}, donor),
          min_bid = COALESCE(${updates.min_bid}, min_bid),
          bid_increment = COALESCE(${updates.bid_increment}, bid_increment),
          start_time = COALESCE(${updates.start_time}, start_time),
          end_time = COALESCE(${updates.end_time}, end_time),
          status = COALESCE(${updates.status}, status),
          featured = COALESCE(${updates.featured}, featured)
        WHERE id = ${id}
        RETURNING *
      `

      if (updatedAuctions.length === 0) {
        return NextResponse.json({ error: "Auction not found" }, { status: 404 })
      }

      console.log("[v0] Auction updated successfully:", updatedAuctions[0])
      return NextResponse.json({ auction: updatedAuctions[0] })
    } catch (slugError) {
      console.log("[v0] Slug or featured column might not exist, trying without them...")
      // If slug or featured column doesn't exist, try without them
      const updatedAuctions = await sql`
        UPDATE auctions
        SET 
          title = COALESCE(${updates.title}, title),
          description = COALESCE(${updates.description}, description),
          image_url = COALESCE(${updates.image_url}, image_url),
          category = COALESCE(${updates.category}, category),
          donor = COALESCE(${updates.donor}, donor),
          min_bid = COALESCE(${updates.min_bid}, min_bid),
          bid_increment = COALESCE(${updates.bid_increment}, bid_increment),
          start_time = COALESCE(${updates.start_time}, start_time),
          end_time = COALESCE(${updates.end_time}, end_time),
          status = COALESCE(${updates.status}, status)
        WHERE id = ${id}
        RETURNING *
      `

      if (updatedAuctions.length === 0) {
        return NextResponse.json({ error: "Auction not found" }, { status: 404 })
      }

      console.log("[v0] Auction updated successfully (without slug/featured):", updatedAuctions[0])
      return NextResponse.json({ auction: updatedAuctions[0] })
    }
  } catch (error) {
    console.error("[v0] Update auction error:", error)
    return NextResponse.json(
      { error: "Failed to update auction", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user || !user.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    await sql`DELETE FROM auctions WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Delete auction error:", error)
    return NextResponse.json({ error: "Failed to delete auction" }, { status: 500 })
  }
}
