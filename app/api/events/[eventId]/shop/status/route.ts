import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params

    console.log("[v0] Fetching shop status for event:", eventId)

    // Fetch shop closure status from event_settings
    const result = await sql`
      SELECT value
      FROM event_settings
      WHERE event_id = ${eventId}
        AND page = 'shop'
        AND object = 'closure'
      LIMIT 1
    `

    console.log("[v0] Shop status query result:", result)

    if (result.length > 0) {
      const settings = result[0].value as any
      console.log("[v0] Shop settings found:", settings)
      return NextResponse.json({
        closed: settings.closed || false,
        message: settings.message || "",
      })
    }

    // Default: shop is open
    console.log("[v0] No shop settings found, returning default (open)")
    return NextResponse.json({
      closed: false,
      message: "",
    })
  } catch (error) {
    console.error("[v0] Error fetching shop status:", error)
    console.error("[v0] Error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json({ error: "Failed to fetch shop status" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const body = await request.json()
    const { closed, message } = body

    console.log("[v0] Updating shop status for event:", eventId)
    console.log("[v0] New status:", { closed, message })

    const result = await sql`
      INSERT INTO event_settings (event_id, page, object, value, created_at, updated_at)
      VALUES (
        ${eventId},
        'shop',
        'closure',
        ${JSON.stringify({ closed, message })},
        NOW(),
        NOW()
      )
      ON CONFLICT (event_id, page, object)
      DO UPDATE SET
        value = ${JSON.stringify({ closed, message })},
        updated_at = NOW()
      RETURNING *
    `

    console.log("[v0] Shop status update result:", result)

    return NextResponse.json({
      success: true,
      closed,
      message,
    })
  } catch (error) {
    console.error("[v0] Error updating shop status:", error)
    console.error("[v0] Error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      {
        error: "Failed to update shop status",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
