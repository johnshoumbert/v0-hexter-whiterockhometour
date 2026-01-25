import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await sql`
      SELECT * FROM events
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "No settings found" }, { status: 404 })
    }

    return NextResponse.json({ settings: result[0] })
  } catch (error) {
    console.error("[v0] Error fetching event settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      event_name,
      start_date,
      end_date,
      go_live_date,
      domain,
      show_qr_codes,
      allow_likes,
      max_bidding,
      auto_bids,
      hero_image_url,
      hero_description,
      logo_image_url,
    } = body

    // Get the first (and should be only) settings record
    const existing = await sql`SELECT id FROM events LIMIT 1`

    if (existing.length === 0) {
      // Create new settings
      await sql`
        INSERT INTO events (
          event_name, start_date, end_date, go_live_date, domain,
          show_qr_codes, allow_likes, max_bidding, auto_bids, hero_image_url,
          hero_description, logo_image_url
        ) VALUES (
          ${event_name}, ${start_date}, ${end_date}, ${go_live_date}, ${domain},
          ${show_qr_codes}, ${allow_likes}, ${max_bidding}, ${auto_bids}, ${hero_image_url},
          ${hero_description}, ${logo_image_url}
        )
      `
    } else {
      // Update existing settings
      await sql`
        UPDATE events
        SET
          event_name = ${event_name},
          start_date = ${start_date},
          end_date = ${end_date},
          go_live_date = ${go_live_date},
          domain = ${domain},
          show_qr_codes = ${show_qr_codes},
          allow_likes = ${allow_likes},
          max_bidding = ${max_bidding},
          auto_bids = ${auto_bids},
          hero_image_url = ${hero_image_url},
          hero_description = ${hero_description},
          logo_image_url = ${logo_image_url},
          updated_at = NOW()
        WHERE id = ${existing[0].id}
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating event settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
