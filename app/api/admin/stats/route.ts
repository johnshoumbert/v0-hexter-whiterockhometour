import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a platform admin
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const safeQuery = async (query: ReturnType<typeof sql>) => {
      try {
        const result = await query
        return result
      } catch (error: any) {
        // If table doesn't exist (42P01) or column doesn't exist (42703), return 0 count
        if (error.code === "42P01" || error.code === "42703") {
          console.log("[v0] Table or column not found, using 0")
          return [{ count: "0" }]
        }
        throw error
      }
    }

    // Fetch statistics with safe queries
    const [usersResult, emailsResult, advocatesResult, schoolsResult] = await Promise.all([
      // Total users
      safeQuery(sql`SELECT COUNT(*) as count FROM users`),

      // Total contact/demo requests (use messages table instead)
      safeQuery(sql`SELECT COUNT(*) as count FROM messages`),

      // Total advocates (use event_users with role 'participant')
      safeQuery(sql`SELECT COUNT(DISTINCT user_id) as count FROM event_users WHERE role = 'participant'`),

      // Total schools/events
      safeQuery(sql`SELECT COUNT(*) as count FROM events`),
    ])

    const stats = {
      totalUsers: Number.parseInt(usersResult[0]?.count || "0"),
      totalEmails: Number.parseInt(emailsResult[0]?.count || "0"),
      totalAdvocates: Number.parseInt(advocatesResult[0]?.count || "0"),
      totalSchools: Number.parseInt(schoolsResult[0]?.count || "0"),
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("[v0] Error fetching admin stats:", error)
    return NextResponse.json({ error: "Failed to fetch statistics" }, { status: 500 })
  }
}
