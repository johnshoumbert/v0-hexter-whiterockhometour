import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const user = await getSession()
    const { eventId } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!user || !user.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (userId) {
      // Check if specific user is an admin for this event
      const result = await sql`
        SELECT * FROM event_admins
        WHERE event_id = ${eventId} AND user_id = ${userId}
      `
      return NextResponse.json({ isAdmin: result.length > 0 })
    }

    // Get all admins for this event
    const admins = await sql`
      SELECT ea.*, u.name, u.email
      FROM event_admins ea
      JOIN users u ON ea.user_id = u.id
      WHERE ea.event_id = ${eventId}
    `

    return NextResponse.json({ admins })
  } catch (error: any) {
    console.error("[v0] Get event admins error:", error)
    return NextResponse.json({ error: "Failed to fetch admins", details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const user = await getSession()
    const { eventId } = await params

    if (!user || !user.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log("[v0] Adding event admin:", userId, "to event:", eventId)

    const existingAdmin = await sql`
      SELECT * FROM event_admins
      WHERE event_id = ${eventId} AND user_id = ${userId}
    `

    if (existingAdmin.length === 0) {
      // Add user to event_admins table
      await sql`
        INSERT INTO event_admins (event_id, user_id)
        VALUES (${eventId}, ${userId})
      `
    }

    // Check if user exists in event_users
    const existingEventUser = await sql`
      SELECT * FROM event_users
      WHERE event_id = ${eventId} AND user_id = ${userId}
    `

    if (existingEventUser.length > 0) {
      // Update their role in event_users
      await sql`
        UPDATE event_users
        SET role = 'admin'
        WHERE event_id = ${eventId} AND user_id = ${userId}
      `
    } else {
      // Add user to event_users with admin role
      await sql`
        INSERT INTO event_users (event_id, user_id, role)
        VALUES (${eventId}, ${userId}, 'admin')
      `
    }

    console.log("[v0] User promoted to event admin successfully")

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Add event admin error:", error.message)
    return NextResponse.json({ error: "Failed to add admin", details: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const user = await getSession()
    const { eventId } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!user || !user.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log("[v0] Removing event admin:", userId, "from event:", eventId)

    // Remove from event_admins table
    await sql`
      DELETE FROM event_admins
      WHERE event_id = ${eventId} AND user_id = ${userId}
    `

    // Update role in event_users
    await sql`
      UPDATE event_users
      SET role = 'participant'
      WHERE event_id = ${eventId} AND user_id = ${userId}
    `

    console.log("[v0] User removed from event admins successfully")

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Remove event admin error:", error)
    return NextResponse.json({ error: "Failed to remove admin", details: error.message }, { status: 500 })
  }
}
