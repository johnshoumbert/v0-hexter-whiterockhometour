import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getSession()

    // Only admins can view all users
    if (!user || !user.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch users with their bid statistics
    const users = await sql`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.created_at,
        COUNT(DISTINCT b.id) as bid_count,
        COALESCE(SUM(w.final_bid), 0) as total_spent
      FROM users u
      LEFT JOIN bids b ON u.id = b.user_id
      LEFT JOIN winners w ON u.id = w.user_id AND w.payment_status = 'completed'
      WHERE u.is_admin = false
      GROUP BY u.id, u.name, u.email, u.phone, u.created_at
      ORDER BY u.created_at DESC
    `

    return NextResponse.json({ users })
  } catch (error) {
    console.error("[v0] Get users error:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}
