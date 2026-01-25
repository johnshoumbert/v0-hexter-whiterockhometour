import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get("name")

    if (!name) {
      return NextResponse.json({ error: "Name parameter is required" }, { status: 400 })
    }

    // Check if organization name already exists (case-insensitive)
    const existing = await sql`
      SELECT id FROM organizations
      WHERE LOWER(name) = LOWER(${name})
      LIMIT 1
    `

    return NextResponse.json({ exists: existing.length > 0 })
  } catch (error) {
    console.error("[v0] Error checking organization name:", error)
    return NextResponse.json({ error: "Failed to check organization name" }, { status: 500 })
  }
}
