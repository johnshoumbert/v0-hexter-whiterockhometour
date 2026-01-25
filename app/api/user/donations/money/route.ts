import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const donations = await sql`
      SELECT 
        d.id,
        d.amount,
        d.donor_name,
        d.donor_email,
        d.message,
        d.status,
        d.created_at,
        e.event_name
      FROM donations d
      LEFT JOIN events e ON d.event_id = e.id
      WHERE d.user_id = ${session.id} OR d.donor_email = ${session.email}
      ORDER BY d.created_at DESC
    `

    return NextResponse.json({ donations })
  } catch (error) {
    console.error("[v0] Error fetching monetary donations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
