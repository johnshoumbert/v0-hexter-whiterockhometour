import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    // Check authentication and admin status
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const adminCheck = await sql`
      SELECT role FROM users WHERE id = ${session.userId}
    `

    if (adminCheck.length === 0 || adminCheck[0].role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    // Try to fetch contact messages
    try {
      const contacts = await sql`
        SELECT 
          m.id,
          m.message,
          m.created_at,
          u.first_name || ' ' || u.last_name as user_name,
          u.email as user_email,
          e.event_name
        FROM messages m
        LEFT JOIN users u ON m.user_id = u.id
        LEFT JOIN events e ON m.event_id = e.id
        ORDER BY m.created_at DESC
        LIMIT 100
      `

      return NextResponse.json({ contacts })
    } catch (error: any) {
      // If messages table doesn't exist, return empty array
      if (error.code === "42P01") {
        return NextResponse.json({ contacts: [] })
      }
      throw error
    }
  } catch (error) {
    console.error("[v0] Error fetching contacts:", error)
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 })
  }
}
