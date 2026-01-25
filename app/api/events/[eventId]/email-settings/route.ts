import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const sql = getDb()

    const settings = await sql`
      SELECT * FROM email_settings
      WHERE event_id = ${eventId}
      ORDER BY email_type
    `

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("[v0] Error fetching email settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch email settings" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { settings } = await request.json()
    const sql = getDb()

    // Update each setting
    for (const setting of settings) {
      await sql`
        INSERT INTO email_settings (event_id, email_type, enabled, template_id)
        VALUES (${eventId}, ${setting.email_type}, ${setting.enabled}, ${setting.template_id})
        ON CONFLICT (event_id, email_type)
        DO UPDATE SET 
          enabled = ${setting.enabled},
          template_id = ${setting.template_id},
          updated_at = CURRENT_TIMESTAMP
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating email settings:", error)
    return NextResponse.json(
      { error: "Failed to update email settings" },
      { status: 500 }
    )
  }
}
