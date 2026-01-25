import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string; userId: string }> }) {
  try {
    const { eventId, userId } = await params

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    const result = await sql`
      SELECT * FROM user_staff_assignments 
      WHERE event_id = ${eventId} AND user_id = ${userId}
    `

    return NextResponse.json({ assignment: result[0] || null })
  } catch (error) {
    console.error("[v0] Failed to fetch staff assignment:", error)
    return NextResponse.json({ error: "Failed to fetch staff assignment" }, { status: 500 })
  }
}
