import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getServerSession } from "@/lib/session"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Fetching events for user:", session.user.id)

    // Get all events where user is a member, admin, or has participated
    const events = await sql`
      SELECT DISTINCT
        e.id,
        e.event_name,
        e.domain,
        e.start_date,
        e.end_date,
        e.go_live_date,
        e.goal,
        e.logo_image_url,
        e.hero_image_url,
        e.created_at,
        o.name as organization_name,
        CASE
          WHEN ea.user_id IS NOT NULL THEN 'admin'
          WHEN eu.role IS NOT NULL THEN eu.role
          WHEN b.user_id IS NOT NULL THEN 'participant'
          ELSE NULL
        END as user_role
      FROM events e
      LEFT JOIN organizations o ON e.organization_id = o.id
      LEFT JOIN event_admins ea ON e.id = ea.event_id AND ea.user_id = ${session.user.id}
      LEFT JOIN event_users eu ON e.id = eu.event_id AND eu.user_id = ${session.user.id}
      LEFT JOIN (
        SELECT DISTINCT event_id, user_id
        FROM bids
        WHERE user_id = ${session.user.id}
      ) b ON e.id = b.event_id
      WHERE ea.user_id = ${session.user.id}
        OR eu.user_id = ${session.user.id}
        OR b.user_id = ${session.user.id}
      ORDER BY e.created_at DESC
    `

    console.log("[v0] Found events:", events.length)

    return NextResponse.json({
      events: events,
    })
  } catch (error) {
    console.error("[v0] Failed to fetch user events:", error)
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
  }
}
