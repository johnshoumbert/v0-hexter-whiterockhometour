import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string; orderId: string }> }) {
  try {
    const session = await getSession()
    if (!session?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { eventId, orderId } = await params

    // Get order to find the customer
    const orders = await sql`
      SELECT user_id FROM shop_orders
      WHERE id = ${orderId} AND event_id = ${eventId}
    `

    if (orders.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const customerId = orders[0].user_id

    // Fetch messages between admin and customer
    const messages = await sql`
      SELECT m.*, 
        sender.id as sender_id,
        sender.name as sender_name,
        sender.is_admin as sender_is_admin,
        receiver.id as receiver_id,
        receiver.name as receiver_name
      FROM messages m
      JOIN users sender ON m.sender_id = sender.id
      JOIN users receiver ON m.receiver_id = receiver.id
      WHERE ((m.sender_id = ${session.id} AND m.receiver_id = ${customerId})
         OR (m.sender_id = ${customerId} AND m.receiver_id = ${session.id}))
        AND m.event_id = ${eventId}
      ORDER BY m.created_at ASC
    `

    return NextResponse.json({
      messages: messages.map((m: any) => ({
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
      })),
    })
  } catch (error) {
    console.error("Error fetching order messages:", error)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; orderId: string }> },
) {
  try {
    const session = await getSession()
    if (!session?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { eventId, orderId } = await params
    const { content } = await request.json()

    if (!content) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 })
    }

    // Get order to find the customer
    const orders = await sql`
      SELECT user_id FROM shop_orders
      WHERE id = ${orderId} AND event_id = ${eventId}
    `

    if (orders.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const customerId = orders[0].user_id

    // Send message to customer
    const newMessages = await sql`
      INSERT INTO messages (sender_id, receiver_id, content, message_type, event_id)
      VALUES (${session.id}, ${customerId}, ${content}, 'order_update', ${eventId})
      RETURNING *
    `

    return NextResponse.json({ message: newMessages[0] })
  } catch (error) {
    console.error("Error sending order message:", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}
