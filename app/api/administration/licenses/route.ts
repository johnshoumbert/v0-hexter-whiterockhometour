import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    // Check if user is admin or john.shoumbert
    if (!session || (session.email !== "john.shoumbert@gmail.com" && !session.is_admin)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const licenses = await sql`
      SELECT 
        id,
        code,
        email,
        event_count,
        amount,
        status,
        used,
        used_at,
        used_by_email,
        created_at,
        stripe_session_id
      FROM licenses
      ORDER BY created_at DESC
    `

    return NextResponse.json({ licenses })
  } catch (error) {
    console.error("[v0] Failed to fetch licenses:", error)
    return NextResponse.json({ error: "Failed to fetch licenses" }, { status: 500 })
  }
}
