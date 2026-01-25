import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is an admin
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { notes } = body

    // Update pickup status to completed
    await sql`
      UPDATE winners 
      SET 
        pickup_status = 'completed',
        pickup_date = NOW(),
        pickup_notes = ${notes || null}
      WHERE id = ${id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Pickup confirmation error:", error)
    return NextResponse.json({ error: "Failed to confirm pickup" }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Get winner details for pickup confirmation
    const result = await sql`
      SELECT 
        w.id,
        w.final_bid,
        w.payment_status,
        w.pickup_status,
        w.pickup_date,
        a.title as auction_title,
        a.description as auction_description,
        a.image_url as auction_image_url,
        u.name as winner_name,
        u.email as winner_email
      FROM winners w
      JOIN auctions a ON w.auction_id = a.id
      JOIN users u ON w.user_id = u.id
      WHERE w.id = ${id}
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Winner not found" }, { status: 404 })
    }

    return NextResponse.json({ winner: result[0] })
  } catch (error) {
    console.error("[v0] Get pickup details error:", error)
    return NextResponse.json({ error: "Failed to fetch pickup details" }, { status: 500 })
  }
}
