import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    let events
    try {
      events = await sql`
        SELECT 
          e.*,
          COUNT(DISTINCT a.id) as auction_count
        FROM events e
        LEFT JOIN auctions a ON a.event_id = e.id
        GROUP BY e.id
        ORDER BY e.start_date DESC
      `
    } catch (error) {
      // If event_id column doesn't exist in auctions table, fetch without join
      console.log("[v0] event_id column not found in auctions, fetching events without auction count")
      events = await sql`
        SELECT *
        FROM events
        ORDER BY start_date DESC
      `
    }

    return NextResponse.json({ events })
  } catch (error) {
    console.error("[v0] Error fetching events:", error)
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    console.log("[v0] Session in POST /api/events:", session)

    if (!session) {
      console.log("[v0] No user in session, returning 401")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] User authenticated:", session.email, "is_admin:", session.is_admin)

    const body = await request.json()
    console.log("[v0] Request body:", body)

    const {
      event_name,
      domain,
      start_date,
      end_date,
      go_live_date,
      show_qr_codes,
      allow_likes,
      max_bidding,
      auto_bids,
      hero_description,
      organization_id,
      is_silent_auction,
      license_id,
      license_code,
    } = body

    console.log("[v0] Creating event with name:", event_name)

    const result = await sql`
      INSERT INTO events (
        event_name,
        domain,
        start_date,
        end_date,
        go_live_date,
        show_qr_codes,
        allow_likes,
        max_bidding,
        auto_bids,
        hero_description,
        is_silent_auction
      )
      VALUES (
        ${event_name},
        ${domain},
        ${start_date},
        ${end_date},
        ${go_live_date},
        ${show_qr_codes || false},
        ${allow_likes || false},
        ${max_bidding || false},
        ${auto_bids || false},
        ${hero_description || ""},
        ${is_silent_auction || false}
      )
      RETURNING *
    `

    console.log("[v0] Event created successfully:", result[0])

    if (license_id && license_code) {
      console.log("[v0] Marking license as used:", license_code)
      try {
        await sql`
          UPDATE licenses
          SET used = TRUE, used_at = NOW(), used_by_email = ${session.email}
          WHERE id = ${license_id} AND code = ${license_code}
        `
        console.log("[v0] License marked as used successfully")
      } catch (licenseError) {
        console.error("[v0] Failed to mark license as used:", licenseError)
        // Don't fail the entire request if license update fails
      }
    }

    return NextResponse.json({ event: result[0] }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating event:", error)
    return NextResponse.json(
      {
        error: "Failed to create event",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
