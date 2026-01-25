import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params

    console.log("[v0] Fetching staff roles for event:", eventId)

    const roles = await sql`
      SELECT sr.*, 
             COALESCE(json_agg(json_build_object('id', sas.id, 'date_time', sas.date_time, 'capacity', sas.capacity)) 
               FILTER (WHERE sas.id IS NOT NULL), '[]'::json) AS slots
      FROM staff_roles sr
      LEFT JOIN staff_availability_slots sas ON sr.id = sas.staff_role_id
      WHERE sr.event_id = ${eventId}
      GROUP BY sr.id
      ORDER BY sr.created_at DESC
    `

    console.log("[v0] Staff roles fetched:", roles)
    return NextResponse.json({ roles })
  } catch (error) {
    console.error("[v0] Failed to fetch staff roles:", error)
    return NextResponse.json(
      { error: "Failed to fetch staff roles", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const body = await request.json()
    const { roleName, description, maxPositions } = body

    console.log("[v0] Creating staff role:", { eventId, roleName, description, maxPositions })

    if (!roleName || !eventId) {
      console.warn("[v0] Missing required fields - roleName or eventId")
      return NextResponse.json({ error: "roleName and eventId are required" }, { status: 400 })
    }

    console.log("[v0] Executing INSERT query with values:", [eventId, roleName, description || null, maxPositions || 1])

    const result = await sql`
      INSERT INTO staff_roles (event_id, role_name, description, max_positions)
      VALUES (${eventId}, ${roleName}, ${description || null}, ${maxPositions || 1})
      RETURNING *
    `

    console.log("[v0] Insert result:", result)
    console.log("[v0] Result length:", result ? result.length : "null")

    if (!result || result.length === 0) {
      console.error("[v0] No result returned from INSERT")
      return NextResponse.json({ error: "Failed to create staff role - no result returned" }, { status: 500 })
    }

    console.log("[v0] Staff role created successfully:", result[0])
    return NextResponse.json({ role: result[0] }, { status: 201 })
  } catch (error) {
    console.error("[v0] Exception in POST handler:", error)
    console.error("[v0] Error type:", error instanceof Error ? error.constructor.name : typeof error)
    console.error(
      "[v0] Error details:",
      error instanceof Error ? { message: error.message, stack: error.stack } : error,
    )

    return NextResponse.json(
      {
        error: "Failed to create staff role",
        details: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.constructor.name : typeof error,
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const body = await request.json()
    const { roleId, roleName, description, maxPositions } = body

    console.log("[v0] Updating staff role:", { eventId, roleId, roleName, description, maxPositions })

    if (!roleId || !roleName || !eventId) {
      console.warn("[v0] Missing required fields - roleId, roleName or eventId")
      return NextResponse.json({ error: "roleId, roleName and eventId are required" }, { status: 400 })
    }

    const result = await sql`
      UPDATE staff_roles 
      SET role_name = ${roleName}, 
          description = ${description || null}, 
          max_positions = ${maxPositions || 1},
          updated_at = NOW()
      WHERE id = ${roleId} AND event_id = ${eventId}
      RETURNING *
    `

    console.log("[v0] Update result:", result)

    if (!result || result.length === 0) {
      console.error("[v0] No role found to update")
      return NextResponse.json({ error: "Staff role not found" }, { status: 404 })
    }

    console.log("[v0] Staff role updated successfully:", result[0])
    return NextResponse.json({ role: result[0] })
  } catch (error) {
    console.error("[v0] Exception in PUT handler:", error)
    return NextResponse.json(
      {
        error: "Failed to update staff role",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const body = await request.json()
    const { roleId } = body

    console.log("[v0] Deleting staff role:", { eventId, roleId })

    if (!roleId || !eventId) {
      return NextResponse.json({ error: "roleId and eventId are required" }, { status: 400 })
    }

    // Delete associated availability slots first (cascade)
    await sql`
      DELETE FROM staff_availability_slots
      WHERE staff_role_id = ${roleId}
    `

    // Then delete the role
    const result = await sql`
      DELETE FROM staff_roles
      WHERE id = ${roleId} AND event_id = ${eventId}
      RETURNING *
    `

    if (!result || result.length === 0) {
      console.error("[v0] No role found to delete")
      return NextResponse.json({ error: "Staff role not found" }, { status: 404 })
    }

    console.log("[v0] Staff role deleted successfully:", result[0])
    return NextResponse.json({ message: "Staff role deleted successfully" })
  } catch (error) {
    console.error("[v0] Exception in DELETE handler:", error)
    return NextResponse.json(
      {
        error: "Failed to delete staff role",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
