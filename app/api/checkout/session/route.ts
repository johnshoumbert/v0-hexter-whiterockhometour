import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("session_id")

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    const licenses = await sql`
      SELECT code, email, event_count, status
      FROM licenses
      WHERE stripe_session_id = ${sessionId}
      LIMIT 1
    `

    if (!licenses || licenses.length === 0) {
      return NextResponse.json({ error: "License not found" }, { status: 404 })
    }

    const license = licenses[0]

    return NextResponse.json({
      licenseCode: license.code,
      email: license.email,
      eventCount: license.event_count,
      status: license.status,
    })
  } catch (error) {
    console.error("[v0] Session fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 })
  }
}
