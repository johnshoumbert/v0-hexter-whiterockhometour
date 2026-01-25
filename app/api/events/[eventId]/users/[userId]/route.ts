import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; userId: string }> },
) {
  try {
    const user = await getSession()
    const { eventId, userId } = await params

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Delete user request:", { eventId, userId, requestingUser: user.id })

    // Check if user is global admin or event admin
    let isAuthorized = user.is_admin

    if (!isAuthorized) {
      const eventAdmin = await sql`
        SELECT * FROM event_users 
        WHERE user_id = ${user.id} AND event_id = ${eventId} AND role = 'admin'
      `
      isAuthorized = eventAdmin.length > 0
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    // Prevent users from deleting themselves
    if (userId === user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    // Delete the user from the event
    const result = await sql`
      DELETE FROM event_users
      WHERE event_id = ${eventId} AND user_id = ${userId}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "User not found in this event" }, { status: 404 })
    }

    console.log("[v0] User removed from event:", { eventId, userId })

    return NextResponse.json({
      success: true,
      message: "User removed from event successfully",
    })
  } catch (error: any) {
    console.error("[v0] Delete user error:", error)
    return NextResponse.json({ error: "Failed to delete user", details: error.message }, { status: 500 })
  }
}
