import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

// GET /api/notifications - Get user's notifications
export async function GET(request: NextRequest) {
  try {
    let session
    try {
      session = await getSession()
    } catch (sessionError) {
      console.error("[v0] Session retrieval error:", sessionError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get("unread") === "true"

    let notifications
    try {
      if (unreadOnly) {
        notifications = await sql`
          SELECT n.*, a.title as auction_title, a.slug as auction_slug
          FROM notifications n
          LEFT JOIN auctions a ON n.auction_id = a.id
          WHERE n.user_id = ${session.id} AND n.read = false
          ORDER BY n.created_at DESC
          LIMIT 50
        `
      } else {
        notifications = await sql`
          SELECT n.*, a.title as auction_title, a.slug as auction_slug
          FROM notifications n
          LEFT JOIN auctions a ON n.auction_id = a.id
          WHERE n.user_id = ${session.id}
          ORDER BY n.created_at DESC
          LIMIT 50
        `
      }
    } catch (dbError) {
      console.error("[v0] Database query error:", dbError)
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error("[v0] Error fetching notifications:", error)
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
  }
}

// POST /api/notifications - Create notification (internal use)
export async function POST(request: NextRequest) {
  try {
    const { user_id, type, auction_id, message } = await request.json()

    if (!user_id || !type || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    await sql`
      INSERT INTO notifications (user_id, type, auction_id, message)
      VALUES (${user_id}, ${type}, ${auction_id}, ${message})
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error creating notification:", error)
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 })
  }
}
