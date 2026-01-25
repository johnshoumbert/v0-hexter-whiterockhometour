import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, email } = body

    if (!code) {
      return NextResponse.json({ error: "License code is required" }, { status: 400 })
    }

    console.log("[v0] Verifying license code:", code)

    const licenses = await sql`
      SELECT id, code, email, event_count, status, used, used_at, used_by_email
      FROM licenses
      WHERE code = ${code}
      LIMIT 1
    `

    if (!licenses || licenses.length === 0) {
      return NextResponse.json({ error: "Invalid license code" }, { status: 404 })
    }

    const license = licenses[0]

    if (license.status !== "paid") {
      return NextResponse.json({ error: "License has not been paid" }, { status: 400 })
    }

    if (license.used) {
      return NextResponse.json(
        {
          error: `License already used by ${license.used_by_email} on ${new Date(license.used_at).toLocaleDateString()}`,
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      valid: true,
      eventCount: license.event_count,
      email: license.email,
      licenseId: license.id,
    })
  } catch (error) {
    console.error("[v0] License verification error:", error)
    return NextResponse.json({ error: "Failed to verify license" }, { status: 500 })
  }
}
