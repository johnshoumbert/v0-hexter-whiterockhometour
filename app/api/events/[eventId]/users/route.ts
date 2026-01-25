import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const user = await getSession()
    const { eventId } = await params

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Fetching users for event:", eventId)

    const users = await sql`
      SELECT DISTINCT
        u.id,
        u.name,
        u.email,
        u.phone,
        u.created_at,
        eu.role as event_role,
        (
          SELECT COUNT(DISTINCT b.id)
          FROM bids b
          JOIN auctions a ON b.auction_id = a.id
          WHERE b.user_id = u.id AND a.event_id = ${eventId}
        ) as bid_count,
        (
          SELECT COALESCE(SUM(w.final_bid), 0)
          FROM winners w
          WHERE w.user_id = u.id AND w.event_id = ${eventId} AND w.payment_status = 'completed'
        ) as total_spent
      FROM users u
      INNER JOIN event_users eu ON eu.user_id = u.id AND eu.event_id = ${eventId}
      ORDER BY u.created_at DESC
    `

    console.log("[v0] Users fetched for event:", users.length)

    return NextResponse.json({ users })
  } catch (error: any) {
    console.error("[v0] Get users error:", error)
    return NextResponse.json({ error: "Failed to fetch users", details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const user = await getSession()
    const { eventId } = await params

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { userId, role = "participant" } = body

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const existing = await sql`
      SELECT * FROM event_users
      WHERE event_id = ${eventId} AND user_id = ${userId}
    `

    if (existing.length > 0) {
      // Update existing record
      const result = await sql`
        UPDATE event_users
        SET role = ${role}
        WHERE event_id = ${eventId} AND user_id = ${userId}
        RETURNING *
      `
      return NextResponse.json({ success: true, eventUser: result[0] })
    } else {
      // Insert new record
      const result = await sql`
        INSERT INTO event_users (event_id, user_id, role)
        VALUES (${eventId}, ${userId}, ${role})
        RETURNING *
      `
      return NextResponse.json({ success: true, eventUser: result[0] })
    }
  } catch (error: any) {
    console.error("[v0] Add user to event error:", error.message)
    return NextResponse.json({ error: "Failed to add user to event", details: error.message }, { status: 500 })
  }
}
