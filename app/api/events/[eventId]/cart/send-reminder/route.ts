import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/session"

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params
    const session = await getSession()
    const body = await request.json()
    const { sessionId } = body

    console.log("[v0] Sending abandoned cart reminder:", { eventId, sessionId })

    if (!session?.is_admin) {
      const isEventAdmin = await sql`
        SELECT 1 FROM event_users 
        WHERE event_id = ${eventId} AND user_id = ${session?.userId} AND role = 'admin'
      `

      if (!isEventAdmin || isEventAdmin.length === 0) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    // Check if abandoned cart reminders are enabled for this event
    const eventSettings = await sql`
      SELECT enable_abandoned_cart_reminders FROM events
      WHERE id = ${eventId}
    `

    if (!eventSettings[0]?.enable_abandoned_cart_reminders) {
      return NextResponse.json(
        { error: "Abandoned cart reminders are disabled for this event" },
        { status: 400 }
      )
    }

    // Get cart details
    const cartDetails = await sql`
      SELECT 
        session_id,
        user_id,
        u.email as user_email,
        u.name as user_name,
        SUM(quantity * unit_price) as total_value
      FROM abandoned_cart_tracking act
      LEFT JOIN users u ON act.user_id = u.id
      WHERE act.event_id = ${eventId}
        AND session_id = ${sessionId}
        AND completed_at IS NULL
      GROUP BY session_id, user_id, u.email, u.name
    `

    if (cartDetails.length === 0) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 })
    }

    const cart = cartDetails[0]

    if (!cart.user_email) {
      return NextResponse.json(
        { error: "No email address associated with this cart" },
        { status: 400 }
      )
    }

    // Get cart items
    const items = await sql`
      SELECT item_name, quantity, unit_price
      FROM abandoned_cart_tracking
      WHERE event_id = ${eventId}
        AND session_id = ${sessionId}
        AND completed_at IS NULL
      ORDER BY created_at DESC
    `

    // Enqueue email
    await sql`
      INSERT INTO email_queue (
        event_id,
        recipient_email,
        recipient_name,
        template_name,
        metadata,
        status,
        created_at,
        updated_at
      ) VALUES (
        ${eventId},
        ${cart.user_email},
        ${cart.user_name || 'Customer'},
        'abandoned-cart',
        ${JSON.stringify({
          cart_items: items,
          total_value: cart.total_value,
          cart_url: `/shop?sessionId=${sessionId}`,
        })},
        'pending',
        NOW(),
        NOW()
      )
    `

    // Mark reminder as sent
    await sql`
      UPDATE abandoned_cart_tracking
      SET reminder_sent_at = NOW()
      WHERE event_id = ${eventId}
        AND session_id = ${sessionId}
        AND completed_at IS NULL
    `

    console.log("[v0] Abandoned cart reminder enqueued for:", cart.user_email)

    return NextResponse.json({
      success: true,
      message: "Reminder email enqueued successfully",
    })
  } catch (error: any) {
    console.error("[v0] Error sending reminder:", error)
    return NextResponse.json(
      { error: "Failed to send reminder", details: error.message },
      { status: 500 }
    )
  }
}
