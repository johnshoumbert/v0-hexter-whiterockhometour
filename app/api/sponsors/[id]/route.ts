import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const result = await sql`
      SELECT * FROM sponsors
      WHERE id = ${id}
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Sponsor not found" }, { status: 404 })
    }

    return NextResponse.json({ sponsor: result[0] })
  } catch (error: any) {
    console.error("[v0] Error fetching sponsor:", error)

    if (error.message?.includes("relation") && error.message?.includes("does not exist")) {
      return NextResponse.json({ error: "Sponsor not found" }, { status: 404 })
    }

    return NextResponse.json({ error: "Failed to fetch sponsor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, logo_url, website_url, tier } = body

    const updated = await sql`
      UPDATE sponsors
      SET 
        name = ${name},
        logo_url = ${logo_url},
        website_url = ${website_url},
        tier = ${tier || "bronze"}
      WHERE id = ${id}
      RETURNING *
    `

    if (updated.length === 0) {
      return NextResponse.json({ error: "Sponsor not found" }, { status: 404 })
    }

    return NextResponse.json({ sponsor: updated[0] })
  } catch (error) {
    console.error("[v0] Error updating sponsor:", error)
    return NextResponse.json({ error: "Failed to update sponsor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    await sql`
      DELETE FROM sponsors
      WHERE id = ${id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting sponsor:", error)
    return NextResponse.json({ error: "Failed to delete sponsor" }, { status: 500 })
  }
}
