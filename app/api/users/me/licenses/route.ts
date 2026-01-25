import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getSession(request)

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Fetching unused licenses for user:", user.email)

    // Get all paid, unused licenses for this user
    const licenses = await sql`
      SELECT id, code, event_count, used, created_at
      FROM licenses
      WHERE email = ${user.email}
        AND status = 'paid'
        AND used = FALSE
      ORDER BY created_at DESC
    `

    // Calculate total unused event count
    const unusedCount = licenses.reduce((total, license) => total + license.event_count, 0)

    console.log("[v0] Found", unusedCount, "unused licenses")

    return NextResponse.json({
      unusedCount,
      licenses: licenses.map((l) => ({
        id: l.id,
        code: l.code,
        eventCount: l.event_count,
        createdAt: l.created_at,
      })),
    })
  } catch (error) {
    console.error("[v0] Error fetching licenses:", error)
    return NextResponse.json({ error: "Failed to fetch licenses" }, { status: 500 })
  }
}
