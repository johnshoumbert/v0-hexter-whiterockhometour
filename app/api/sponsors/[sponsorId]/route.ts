import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ sponsorId: string }> }) {
  try {
    const { sponsorId } = await params
    console.log("[v0] Fetching sponsor:", sponsorId)

    const result = await sql`
      SELECT * FROM sponsors
      WHERE id = ${sponsorId}
      LIMIT 1
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Sponsor not found" }, { status: 404 })
    }

    return NextResponse.json({ sponsor: result[0] })
  } catch (error) {
    console.error("[v0] Error fetching sponsor:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
