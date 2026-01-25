import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const session = await getSession()
    const { eventId } = await params

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the latest message from each conversation where the user is the receiver
    const query = `
      WITH latest_messages AS (
        SELECT DISTINCT ON (m.sender_id)
          m.id,
          m.content,
          m.created_at,
          m.sender_id,
          sender.name as sender_name,
          sender.is_admin as sender_is_admin,
          sender.profile_image as sender_image
        FROM messages m
        JOIN users sender ON m.sender_id = sender.id
        WHERE m.receiver_id = $1
          AND m.event_id = $2
        ORDER BY m.sender_id, m.created_at DESC
      )
      SELECT * FROM latest_messages
      ORDER BY created_at DESC
      LIMIT 5
    `

    const result = await sql.query(query, [session.id, eventId])
    const rows = Array.isArray(result) ? result : result?.rows || []

    const messages = rows.map((m: any) => ({
      id: m.id,
      content: m.content,
      created_at: m.created_at,
      sender: {
        id: m.sender_id,
        name: m.sender_name,
        is_admin: m.sender_is_admin,
        profile_image: m.sender_image,
      },
    }))

    return NextResponse.json({ messages, count: messages.length })
  } catch (error: any) {
    console.error("[v0] Get unread messages error:", error.message || error)
    return NextResponse.json({ messages: [], count: 0 })
  }
}
