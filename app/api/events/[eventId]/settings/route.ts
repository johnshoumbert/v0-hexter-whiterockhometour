import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const { searchParams } = new URL(request.url)
    const page = searchParams.get("page")
    const object = searchParams.get("object")

    if (!page || !object) {
      return NextResponse.json({ error: "Page and object parameters are required" }, { status: 400 })
    }

    const result = await sql`
      SELECT * FROM event_settings
      WHERE event_id = ${eventId}
        AND page = ${page}
        AND object = ${object}
      LIMIT 1
    `

    if (result.length === 0) {
      return NextResponse.json({ settings: null })
    }

    return NextResponse.json({ settings: result[0] })
  } catch (error) {
    console.error("[v0] Error fetching event settings:", error)
    return NextResponse.json({ error: "Failed to fetch event settings" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const body = await request.json()
    const { page, object, value } = body

    if (!page || !object || !value) {
      return NextResponse.json({ error: "Page, object, and value are required" }, { status: 400 })
    }

    // Upsert the settings
    const result = await sql`
      INSERT INTO event_settings (event_id, page, object, value, updated_at)
      VALUES (${eventId}, ${page}, ${object}, ${JSON.stringify(value)}, NOW())
      ON CONFLICT (event_id, page, object)
      DO UPDATE SET
        value = ${JSON.stringify(value)},
        updated_at = NOW()
      RETURNING *
    `

    return NextResponse.json({ settings: result[0] })
  } catch (error) {
    console.error("[v0] Error updating event settings:", error)
    return NextResponse.json({ error: "Failed to update event settings" }, { status: 500 })
  }
}
