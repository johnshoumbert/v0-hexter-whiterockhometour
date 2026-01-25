import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const sponsors = await sql`
      SELECT * FROM sponsors
      ORDER BY display_order ASC, created_at DESC
    `

    return NextResponse.json({ sponsors })
  } catch (error) {
    console.error("[v0] Error fetching sponsors:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, logo_url, website_url, display_order } = body

    const result = await sql`
      INSERT INTO sponsors (name, logo_url, website_url, display_order)
      VALUES (${name}, ${logo_url}, ${website_url}, ${display_order || 0})
      RETURNING *
    `

    return NextResponse.json({ sponsor: result[0] })
  } catch (error) {
    console.error("[v0] Error creating sponsor:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Sponsor ID required" }, { status: 400 })
    }

    await sql`DELETE FROM sponsors WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting sponsor:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
