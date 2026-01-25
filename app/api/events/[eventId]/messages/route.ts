import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sendEmail } from "@/lib/email"
import MessageNotificationEmail from "@/components/MessageNotificationEmail"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const session = await getSession()
    const { eventId } = await params

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const receiverId = searchParams.get("receiver_id")

    console.log("[v0] Fetching messages for user:", session.id, "receiver:", receiverId, "event:", eventId)

    let messagesData
    if (receiverId) {
      const query = `
        SELECT m.*, 
          sender.id as sender_id,
          sender.name as sender_name,
          sender.is_admin as sender_is_admin,
          receiver.id as receiver_id,
          receiver.name as receiver_name
        FROM messages m
        JOIN users sender ON m.sender_id = sender.id
        JOIN users receiver ON m.receiver_id = receiver.id
        WHERE ((m.sender_id = $1 AND m.receiver_id = $2)
           OR (m.sender_id = $2 AND m.receiver_id = $1))
          AND m.event_id = $3
        ORDER BY m.created_at ASC
      `

      messagesData = await sql.query(query, [session.id, receiverId, eventId])
    } else {
      const query = `
        SELECT m.*, 
          sender.id as sender_id,
          sender.name as sender_name,
          sender.is_admin as sender_is_admin,
          receiver.id as receiver_id,
          receiver.name as receiver_name
        FROM messages m
        JOIN users sender ON m.sender_id = sender.id
        JOIN users receiver ON m.receiver_id = receiver.id
        WHERE (m.sender_id = $1 OR m.receiver_id = $1)
          AND m.event_id = $2
        ORDER BY m.created_at DESC
      `

      messagesData = await sql.query(query, [session.id, eventId])
    }

    const rows = Array.isArray(messagesData) ? messagesData : messagesData?.rows || []

    console.log("[v0] Messages fetched:", rows.length)

    const messages = rows.map((m: any) => ({
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
  } catch (error: any) {
    console.error("[v0] Get messages error:", error.message || error)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const session = await getSession()
    const { eventId } = await params

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { content, receiver_id } = await request.json()

    if (!content) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 })
    }

    let receiverId = receiver_id
    if (!receiverId) {
      const adminsQuery = `
        SELECT u.id 
        FROM users u
        JOIN event_users eu ON u.id = eu.user_id
        WHERE eu.event_id = $1 AND u.is_admin = true
        LIMIT 1
      `
      const adminsResult = await sql.query(adminsQuery, [eventId])
      const adminRows = Array.isArray(adminsResult) ? adminsResult : adminsResult?.rows || []

      if (adminRows.length === 0) {
        const globalAdminsQuery = `SELECT id FROM users WHERE is_admin = true LIMIT 1`
        const globalAdminsResult = await sql.query(globalAdminsQuery, [])
        const globalAdminRows = Array.isArray(globalAdminsResult) ? globalAdminsResult : globalAdminsResult?.rows || []

        if (globalAdminRows.length === 0) {
          return NextResponse.json({ error: "No admin available" }, { status: 404 })
        }
        receiverId = globalAdminRows[0].id
      } else {
        receiverId = adminRows[0].id
      }
    }

    const query = `
      INSERT INTO messages (sender_id, receiver_id, content, message_type, event_id)
      VALUES ($1, $2, $3, 'chat', $4)
      RETURNING id, sender_id, receiver_id, content, message_type, event_id, created_at
    `

    console.log("[v0] Inserting message with params:", {
      sender_id: session.id,
      receiver_id: receiverId,
      event_id: eventId,
    })

    const result = await sql.query(query, [session.id, receiverId, content, eventId])

    const rows = Array.isArray(result) ? result : result?.rows || []

    console.log("[v0] SQL result rows:", rows)

    if (!rows || rows.length === 0) {
      console.error("[v0] Message insert failed - no rows returned")
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
    }

    const message = rows[0]
    console.log("[v0] Message sent successfully:", message.id)

    try {
      const receiverData = await sql.query(`SELECT email, name FROM users WHERE id = $1`, [receiverId])
      const senderData = await sql.query(`SELECT name FROM users WHERE id = $1`, [session.id])

      const receiverRows = Array.isArray(receiverData) ? receiverData : receiverData?.rows || []
      const senderRows = Array.isArray(senderData) ? senderData : senderData?.rows || []

      if (receiverRows.length > 0 && senderRows.length > 0) {
        const receiverEmail = receiverRows[0].email
        const receiverName = receiverRows[0].name
        const senderName = senderRows[0].name

        await sendEmail({
          to: receiverEmail,
          subject: `New message from ${senderName}`,
          react: MessageNotificationEmail({
            senderName,
            receiverName,
            content,
          }),
        })

        console.log("[v0] Email notification sent to:", receiverEmail)
      }
    } catch (emailError) {
      console.warn("[v0] Failed to send email notification:", emailError)
    }

    return NextResponse.json({ message })
  } catch (error: any) {
    console.error("[v0] Send message error:", error.message || error)
    console.error("[v0] Full error:", error)
    return NextResponse.json({ error: "Failed to send message", details: error.message }, { status: 500 })
  }
}
