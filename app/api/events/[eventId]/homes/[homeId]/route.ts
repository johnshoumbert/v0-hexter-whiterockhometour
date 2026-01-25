import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { checkAdminAccess } from "@/lib/admin-check"

export async function GET(
  request: Request,
  { params }: { params: { eventId: string; homeId: string } }
) {
  try {
    const { eventId, homeId } = params

    const result = await sql`
      SELECT *
      FROM homes
      WHERE id = ${homeId} AND event_id = ${eventId}
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Home not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error: any) {
    console.error("[v0] Error fetching home:", error)
    return NextResponse.json({ error: "Failed to fetch home" }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { eventId: string; homeId: string } }
) {
  try {
    const { eventId, homeId } = params
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { isAdmin } = await checkAdminAccess(eventId)
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, address, sponsor_id, short_description, full_description, item_images, directions_url, display_order } = body

    const updates = []
    const values: any[] = []
    let paramIndex = 1

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      values.push(name)
    }
    if (address !== undefined) {
      updates.push(`address = $${paramIndex++}`)
      values.push(address)
    }
    if (sponsor_id !== undefined) {
      updates.push(`sponsor_id = $${paramIndex++}`)
      values.push(sponsor_id)
    }
    if (short_description !== undefined) {
      updates.push(`short_description = $${paramIndex++}`)
      values.push(short_description)
    }
    if (full_description !== undefined) {
      updates.push(`full_description = $${paramIndex++}`)
      values.push(full_description)
    }
    if (item_images !== undefined) {
      updates.push(`item_images = $${paramIndex++}`)
      values.push(item_images)
    }
    if (directions_url !== undefined) {
      updates.push(`directions_url = $${paramIndex++}`)
      values.push(directions_url)
    }
    if (display_order !== undefined) {
      updates.push(`display_order = $${paramIndex++}`)
      values.push(display_order)
    }

    updates.push(`updated_at = NOW()`)
    values.push(homeId, eventId)

    const result = await sql.query(
      `UPDATE homes 
       SET ${updates.join(", ")}
       WHERE id = $${paramIndex++} AND event_id = $${paramIndex++}
       RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Home not found" }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    console.error("[v0] Error updating home:", error)
    return NextResponse.json({ error: "Failed to update home" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { eventId: string; homeId: string } }
) {
  try {
    const { eventId, homeId } = params
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { isAdmin } = await checkAdminAccess(eventId)
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await sql`
      DELETE FROM homes
      WHERE id = ${homeId} AND event_id = ${eventId}
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error deleting home:", error)
    return NextResponse.json({ error: "Failed to delete home" }, { status: 500 })
  }
}
