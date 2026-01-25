import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const receiverId = searchParams.get("receiver_id")

    console.log("[v0] Fetching messages for user:", session.id, "receiver:", receiverId)

    let messagesData
    if (receiverId) {
      messagesData = await sql`
        SELECT m.*, 
          sender.id as sender_id,
          sender.name as sender_name,
          sender.is_admin as sender_is_admin,
          receiver.id as receiver_id,
          receiver.name as receiver_name
        FROM messages m
        JOIN users sender ON m.sender_id = sender.id
        JOIN users receiver ON m.receiver_id = receiver.id
        WHERE (m.sender_id = ${session.id} AND m.receiver_id = ${receiverId})
           OR (m.sender_id = ${receiverId} AND m.receiver_id = ${session.id})
        ORDER BY m.created_at ASC
      `
    } else {
      messagesData = await sql`
        SELECT m.*, 
          sender.id as sender_id,
          sender.name as sender_name,
          sender.is_admin as sender_is_admin,
          receiver.id as receiver_id,
          receiver.name as receiver_name
        FROM messages m
        JOIN users sender ON m.sender_id = sender.id
        JOIN users receiver ON m.receiver_id = receiver.id
        WHERE m.sender_id = ${session.id} OR m.receiver_id = ${session.id}
        ORDER BY m.created_at DESC
      `
    }

    console.log("[v0] Messages fetched:", messagesData.length)

    const messages = messagesData.map((m: any) => ({
      id: m.id,
      content: m.content,
      created_at: m.created_at,
      sender: {
        id: m.sender_id,
        name: m.sender_name,
        is_admin: m.sender_is_admin,
      },
      receiver: {
        id: m.receiver_id,
        name: m.receiver_name,
      },
    }))

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("[v0] Get messages error:", error)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { content, receiver_id } = await request.json()

    if (!content) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 })
    }

    let receiverId = receiver_id
    if (!receiverId) {
      const admins = await sql`SELECT id FROM users WHERE is_admin = true LIMIT 1`
      if (admins.length === 0) {
        return NextResponse.json({ error: "No admin available" }, { status: 404 })
      }
      receiverId = admins[0].id
    }

    const newMessages = await sql`
      INSERT INTO messages (sender_id, receiver_id, content, message_type)
      VALUES (${session.id}, ${receiverId}, ${content}, 'chat')
      RETURNING *
    `

    console.log("[v0] Message sent:", newMessages[0].id)

    return NextResponse.json({ message: newMessages[0] })
  } catch (error) {
    console.error("[v0] Send message error:", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}
