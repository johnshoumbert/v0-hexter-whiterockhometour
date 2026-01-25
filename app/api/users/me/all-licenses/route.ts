import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getSession(request)

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Fetching all licenses for user:", user.email)

    // Get all licenses for this user (including pending)
    const licenses = await sql`
      SELECT id, code, event_count, amount, status, used, used_at, created_at
      FROM licenses
      WHERE email = ${user.email}
      ORDER BY created_at DESC
    `

    console.log("[v0] Found", licenses.length, "total licenses")

    return NextResponse.json({
      licenses: licenses.map((l) => ({
        id: l.id,
        code: l.code,
        eventCount: l.event_count,
        amount: l.amount,
        status: l.status,
        used: l.used,
        usedAt: l.used_at,
        createdAt: l.created_at,
      })),
    })
  } catch (error) {
    console.error("[v0] Error fetching all licenses:", error)
    return NextResponse.json({ error: "Failed to fetch licenses" }, { status: 500 })
  }
}
