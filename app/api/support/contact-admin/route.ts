import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.NEON_DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { eventId, userId, userName, userEmail, message } = await request.json()

    if (!eventId || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get event admins
    const admins = await sql`
      SELECT u.email, u.name
      FROM event_admins ea
      JOIN users u ON ea.user_id = u.id
      WHERE ea.event_id = ${eventId}
    `

    if (admins.length === 0) {
      return NextResponse.json({ error: "No event admins found" }, { status: 404 })
    }

    // Create message record
    await sql`
      INSERT INTO messages (
        event_id,
        sender_id,
        receiver_id,
        content,
        message_type
      ) VALUES (
        ${eventId},
        ${userId},
        ${admins[0].user_id || null},
        ${message},
        'support'
      )
    `

    // Send email to event admins
    for (const admin of admins) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/support/send-admin-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: admin.email,
            adminName: admin.name,
            userName,
            userEmail,
            message,
          }),
        })
      } catch (emailError) {
        console.error("[v0] Failed to send admin email:", emailError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error sending message to admin:", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}
