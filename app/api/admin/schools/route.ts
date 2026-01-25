import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    // Check authentication and admin status
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const userResult = await sql`
      SELECT role FROM users WHERE id = ${session.userId}
    `

    if (userResult.length === 0 || userResult[0].role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    // Fetch events as "schools"
    const schools = await sql`
      SELECT 
        id as school_id,
        event_name as school_name,
        'public' as school_type,
        '' as city,
        '' as state,
        '' as district_id,
        true as enable_surveys,
        false as enforce_admin_approval,
        created_at
      FROM events
      ORDER BY created_at DESC
    `

    // Calculate stats
    const stats = {
      total: schools.length,
      districts: 0,
      independent: schools.length,
      charter: 0,
    }

    return NextResponse.json({
      schools,
      stats,
    })
  } catch (error) {
    console.error("[v0] Error fetching schools:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch schools",
        schools: [],
        stats: { total: 0, districts: 0, independent: 0, charter: 0 },
      },
      { status: 500 },
    )
  }
}
