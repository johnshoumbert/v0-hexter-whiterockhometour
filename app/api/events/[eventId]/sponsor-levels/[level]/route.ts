import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ eventId: string; level: string }> }) {
  try {
    const { eventId, level } = await params
    const body = await request.json()
    const { name, amount, description, benefits, sponsor_limit } = body

    const updated = await sql`
      UPDATE sponsor_levels
      SET 
        name = ${name},
        amount = ${amount},
        description = ${description},
        sponsor_limit = ${sponsor_limit},
        updated_at = CURRENT_TIMESTAMP
      WHERE event_id = ${eventId} AND level = ${level}
      RETURNING id
    `

    if (updated.length === 0) {
      return NextResponse.json({ error: "Sponsor level not found" }, { status: 404 })
    }

    const levelId = updated[0].id

    await sql`DELETE FROM sponsor_benefits WHERE sponsor_level_id = ${levelId}`

    if (benefits && Array.isArray(benefits) && benefits.length > 0) {
      for (let i = 0; i < benefits.length; i++) {
        if (benefits[i].trim()) {
          await sql`
            INSERT INTO sponsor_benefits (sponsor_level_id, benefit_text, display_order)
            VALUES (${levelId}, ${benefits[i]}, ${i + 1})
          `
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating sponsor level:", error)
    return NextResponse.json({ error: "Failed to update sponsor level" }, { status: 500 })
  }
}
