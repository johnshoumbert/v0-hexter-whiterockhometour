import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; auctionId: string }> },
) {
  try {
    const { eventId, auctionId } = await params

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(auctionId)

    let auction
    if (isUUID) {
      auction = await sql`
        SELECT 
          a.*,
          e.start_date as event_start_date,
          e.end_date as event_end_date,
          COALESCE(a.start_time, e.start_date) as effective_start_time,
          COALESCE(a.end_time, e.end_date) as effective_end_time,
          ad.donor_name,
          ad.donor_email,
          ad.donor_phone,
          ad.donor_organization,
          ad.donor_address
        FROM auctions a
        LEFT JOIN events e ON a.event_id = e.id
        LEFT JOIN auction_donors ad ON a.donor_id = ad.id
        WHERE a.id = ${auctionId} AND a.event_id = ${eventId}
      `
    } else {
      auction = await sql`
        SELECT 
          a.*,
          e.start_date as event_start_date,
          e.end_date as event_end_date,
          COALESCE(a.start_time, e.start_date) as effective_start_time,
          COALESCE(a.end_time, e.end_date) as effective_end_time,
          ad.donor_name,
          ad.donor_email,
          ad.donor_phone,
          ad.donor_organization,
          ad.donor_address
        FROM auctions a
        LEFT JOIN events e ON a.event_id = e.id
        LEFT JOIN auction_donors ad ON a.donor_id = ad.id
        WHERE a.slug = ${auctionId} AND a.event_id = ${eventId}
      `
    }

    if (!auction || auction.length === 0) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 })
    }

    return NextResponse.json({ auction: auction[0] })
  } catch (error: any) {
    console.error("[v0] Error fetching auction:", error)

    if (error.message?.includes("column") && error.message?.includes("event_id")) {
      const { auctionId } = await params
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(auctionId)

      let auction
      if (isUUID) {
        auction = await sql`SELECT * FROM auctions WHERE id = ${auctionId}`
      } else {
        auction = await sql`SELECT * FROM auctions WHERE slug = ${auctionId}`
      }

      if (!auction || auction.length === 0) {
        return NextResponse.json({ error: "Auction not found" }, { status: 404 })
      }

      return NextResponse.json({ auction: auction[0] })
    }

    return NextResponse.json({ error: "Failed to fetch auction" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; auctionId: string }> },
) {
  try {
    const { eventId, auctionId } = await params
    const body = await request.json()
    const {
      title,
      description,
      min_bid,
      bid_increment,
      valued_at,
      priceless,
      image_url,
      start_time,
      end_time,
      category,
      status,
      featured,
      donor,
      slug,
      buy_type,
      buy_now_price,
      count,
      pickup_instructions,
      use_event_pickup_instructions,
      donor_name,
      donor_email,
      donor_phone,
      donor_organization,
      donor_address,
      delivery_method,
      donation_notes,
    } = body

    const existingAuction = await sql`
      SELECT slug, donor_id FROM auctions WHERE id = ${auctionId} AND event_id = ${eventId}
    `

    if (!existingAuction || existingAuction.length === 0) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 })
    }

    const finalSlug = slug || existingAuction[0].slug
    let donorId = existingAuction[0].donor_id

    if (donor_email && (donor_name || donor_organization)) {
      if (donorId) {
        // Update existing donor
        await sql`
          UPDATE auction_donors
          SET 
            donor_name = ${donor_name},
            donor_email = ${donor_email},
            donor_phone = ${donor_phone || null},
            donor_organization = ${donor_organization || null},
            donor_address = ${donor_address || null},
            updated_at = NOW()
          WHERE id = ${donorId}
        `
      } else {
        // Check if donor exists by email
        const existingDonor = await sql`
          SELECT id FROM auction_donors WHERE donor_email = ${donor_email}
        `

        if (existingDonor.length > 0) {
          donorId = existingDonor[0].id
        } else {
          // Create new donor
          const newDonor = await sql`
            INSERT INTO auction_donors (
              donor_name, donor_email, donor_phone, donor_organization, donor_address
            )
            VALUES (
              ${donor_name}, ${donor_email}, ${donor_phone}, ${donor_organization}, ${donor_address}
            )
            RETURNING id
          `
          donorId = newDonor[0].id
        }
      }
    }

    const result = await sql`
      UPDATE auctions
      SET 
        title = ${title},
        description = ${description},
        min_bid = ${min_bid},
        bid_increment = ${bid_increment || 25},
        valued_at = ${valued_at},
        priceless = ${priceless || false},
        donor = ${donor},
        image_url = ${image_url},
        start_time = ${start_time},
        end_time = ${end_time},
        category = ${category},
        status = ${status},
        slug = ${finalSlug},
        featured = ${featured},
        buy_type = ${buy_type || "auction"},
        buy_now_price = ${buy_now_price || null},
        count = ${count || 1},
        pickup_instructions = ${pickup_instructions || null},
        use_event_pickup_instructions = ${use_event_pickup_instructions || false},
        donor_id = ${donorId},
        delivery_method = ${delivery_method || null},
        donation_notes = ${donation_notes || null},
        updated_at = NOW()
      WHERE id = ${auctionId} AND event_id = ${eventId}
      RETURNING *
    `

    if (!result || result.length === 0) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 })
    }

    return NextResponse.json({ auction: result[0] })
  } catch (error: any) {
    console.error("[v0] Error updating auction:", error)

    if (error.message?.includes("duplicate key") || error.code === "23505") {
      return NextResponse.json(
        {
          error: "An auction with this title or identifier already exists. Please use a different title or slug.",
          type: "duplicate_key",
        },
        { status: 409 },
      )
    }

    if (error.message?.includes("column") && error.message?.includes("does not exist")) {
      const { auctionId } = await params
      const body = await request.json()
      const { title, description, min_bid, image_url, start_time, end_time, category, status } = body

      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")

      const result = await sql`
        UPDATE auctions
        SET 
          title = ${title},
          description = ${description},
          min_bid = ${min_bid},
          image_url = ${image_url},
          start_time = ${start_time},
          end_time = ${end_time},
          category = ${category},
          status = ${status},
          slug = ${slug},
          updated_at = NOW()
        WHERE id = ${auctionId}
        RETURNING *
      `

      if (!result || result.length === 0) {
        return NextResponse.json({ error: "Auction not found" }, { status: 404 })
      }

      return NextResponse.json({ auction: result[0] })
    }

    return NextResponse.json(
      {
        error: "Failed to update auction",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; auctionId: string }> },
) {
  try {
    const { eventId, auctionId } = await params

    await sql`DELETE FROM auctions WHERE id = ${auctionId} AND event_id = ${eventId}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting auction:", error)
    return NextResponse.json({ error: "Failed to delete auction" }, { status: 500 })
  }
}
