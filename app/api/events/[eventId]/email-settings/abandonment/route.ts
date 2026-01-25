import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { checkAdminAccess } from "@/lib/admin-check"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params

    const adminCheck = await checkAdminAccess(eventId)
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const settings = await sql`
      SELECT value FROM event_settings
      WHERE event_id = ${eventId} AND page = 'email' AND object = 'abandonment'
    `

    const defaultSettings = {
      abandonmentEnabled: true,
      firstReminderHours: 24,
      secondReminderDays: 3,
      finalReminderDays: 5,
      maxReminders: 3,
    }

    return NextResponse.json(settings.length > 0 ? settings[0].value : defaultSettings)
  } catch (error) {
    console.error("[v0] Error fetching email settings:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params

    const adminCheck = await checkAdminAccess(eventId)
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()

    await sql`
      INSERT INTO event_settings (event_id, page, object, value, created_at, updated_at)
      VALUES (
        ${eventId},
        'email',
        'abandonment',
        ${JSON.stringify(body)},
        NOW(),
        NOW()
      )
      ON CONFLICT (event_id, page, object)
      DO UPDATE SET
        value = ${JSON.stringify(body)},
        updated_at = NOW()
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error saving email settings:", error)
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
  }
}
