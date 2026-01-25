import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { useEventStore } from "@/stores/event-store"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params

    console.log("[v0] Fetching sponsors for event:", eventId)

    // Check if requesting only home page sponsors via query param
    const showOnHomeOnly = request.nextUrl.searchParams.get("showOnHome") === "true"

    const sponsors = showOnHomeOnly
      ? await sql`
          SELECT * FROM sponsors
          WHERE event_id = ${eventId}
            AND show_on_home = true
          ORDER BY created_at DESC
        `
      : await sql`
          SELECT * FROM sponsors
          WHERE event_id = ${eventId}
          ORDER BY created_at DESC
        `

    console.log("[v0] Sponsors found:", sponsors.length, sponsors.map((s: any) => ({ 
      name: s.name, 
      level: s.level,
      show_on_home: s.show_on_home 
    })))

    return NextResponse.json({ sponsors })
  } catch (error: any) {
    console.error("[v0] Error fetching sponsors:", error)

    if (error.message?.includes("relation") && error.message?.includes("does not exist")) {
      return NextResponse.json({ sponsors: [] })
    }

    return NextResponse.json({ error: "Failed to fetch sponsors" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const body = await request.json()
    const {
      name,
      logo_url,
      website_url,
      level,
      sponsorship_amount,
      description,
      contact_name,
      contact_email,
      contact_phone,
      internal_notes,
      show_on_home,
      show_on_auction_item,
    } = body

    const result = await sql`
      INSERT INTO sponsors (
        name, 
        logo_url, 
        website_url, 
        level, 
        sponsorship_amount,
        description, 
        contact_name, 
        contact_email, 
        contact_phone,
        internal_notes,
        show_on_home,
        show_on_auction_item,
        event_id
      )
      VALUES (
        ${name}, 
        ${logo_url || null}, 
        ${website_url || null}, 
        ${level || null}, 
        ${sponsorship_amount || null},
        ${description || null}, 
        ${contact_name || null}, 
        ${contact_email || null}, 
        ${contact_phone || null},
        ${internal_notes || null},
        ${show_on_home ?? true},
        ${show_on_auction_item ?? true},
        ${eventId}
      )
      RETURNING *
    `

    useEventStore.getState().invalidateCache()

    return NextResponse.json({ sponsor: result[0] }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating sponsor:", error)
    return NextResponse.json({ error: "Failed to create sponsor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const body = await request.json()
    const {
      id,
      name,
      logo_url,
      website_url,
      level,
      sponsorship_amount,
      description,
      contact_name,
      contact_email,
      contact_phone,
      internal_notes,
      show_on_home,
      show_on_auction_item,
    } = body

    if (!id) {
      return NextResponse.json({ error: "Sponsor ID required" }, { status: 400 })
    }

    const result = await sql`
      UPDATE sponsors 
      SET 
        name = ${name},
        logo_url = ${logo_url || null},
        website_url = ${website_url || null},
        level = ${level || null},
        sponsorship_amount = ${sponsorship_amount || null},
        description = ${description || null},
        contact_name = ${contact_name || null},
        contact_email = ${contact_email || null},
        contact_phone = ${contact_phone || null},
        internal_notes = ${internal_notes || null},
        show_on_home = ${show_on_home ?? true},
        show_on_auction_item = ${show_on_auction_item ?? true},
        updated_at = NOW()
      WHERE id = ${id} AND event_id = ${eventId}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Sponsor not found" }, { status: 404 })
    }

    useEventStore.getState().invalidateCache()

    return NextResponse.json({ sponsor: result[0] })
  } catch (error) {
    console.error("[v0] Error updating sponsor:", error)
    return NextResponse.json({ error: "Failed to update sponsor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Sponsor ID required" }, { status: 400 })
    }

    await sql`
      DELETE FROM sponsors 
      WHERE id = ${id} AND event_id = ${eventId}
    `

    useEventStore.getState().invalidateCache()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting sponsor:", error)
    return NextResponse.json({ error: "Failed to delete sponsor" }, { status: 500 })
  }
}
