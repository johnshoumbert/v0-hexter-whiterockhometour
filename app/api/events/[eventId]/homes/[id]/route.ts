import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { checkAdminAccess } from "@/lib/admin-check"

export async function PUT(
  request: Request,
  { params }: { params: { eventId: string; id: string } }
) {
  try {
    const { eventId, id } = params
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { isAdmin } = await checkAdminAccess(eventId)
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { 
      name, 
      address, 
      sponsor, 
      short_description, 
      full_description, 
      item_images, 
      directions_url, 
      display_order 
    } = body

    console.log("[v0] Updating home with images:", item_images)

    const result = await sql`
      UPDATE homes
      SET 
        name = ${name},
        address = ${address || null},
        sponsor = ${sponsor || null},
        short_description = ${short_description || null},
        full_description = ${full_description || null},
        item_images = ${item_images || null},
        directions_url = ${directions_url || null},
        display_order = ${display_order || 0},
        updated_at = NOW()
      WHERE id = ${id} AND event_id = ${eventId}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Home not found" }, { status: 404 })
    }

    console.log("[v0] Home updated successfully:", result[0])
    return NextResponse.json(result[0])
  } catch (error: any) {
    console.error("[v0] Error updating home:", error)
    return NextResponse.json({ error: "Failed to update home" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { eventId: string; id: string } }
) {
  try {
    const { eventId, id } = params
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { isAdmin } = await checkAdminAccess(eventId)
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const result = await sql`
      DELETE FROM homes
      WHERE id = ${id} AND event_id = ${eventId}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Home not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error deleting home:", error)
    return NextResponse.json({ error: "Failed to delete home" }, { status: 500 })
  }
}
