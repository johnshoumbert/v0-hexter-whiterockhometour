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

    // Fetch all users
    const users = await sql`
      SELECT 
        id as user_id,
        first_name,
        last_name,
        email,
        phone,
        role,
        created_at,
        COALESCE(city || ', ' || state, city, state, '') as location,
        CASE WHEN role = 'admin' THEN true ELSE false END as is_admin,
        true as is_active
      FROM users
      ORDER BY created_at DESC
    `

    // Calculate stats
    const stats = {
      total: users.length,
      admins: users.filter((u: any) => u.role === "admin").length,
      active: users.length, // All users are considered active for now
    }

    return NextResponse.json({ users, stats })
  } catch (error) {
    console.error("[v0] Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}
