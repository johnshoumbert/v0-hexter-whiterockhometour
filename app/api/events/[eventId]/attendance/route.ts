import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { sendEmail } from "@/lib/email"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { eventId } = await params

    // Get user's attendance status for this event
    const result = await sql`
      SELECT status, created_at, updated_at
      FROM event_attendance
      WHERE event_id = ${eventId} AND user_id = ${session.id}
      LIMIT 1
    `

    if (result.length === 0) {
      return NextResponse.json({ attendance: null })
    }

    return NextResponse.json({ attendance: result[0] })
  } catch (error) {
    console.error("[v0] Error fetching attendance:", error)
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Please log in" }, { status: 401 })
    }

    const { eventId } = await params
    const { status } = await request.json()

    console.log("[v0] Registering attendance - eventId:", eventId, "userId:", session.id, "status:", status)

    if (!["going", "not_going", "maybe"].includes(status)) {
      return NextResponse.json({ error: "Invalid status. Must be: going, not_going, or maybe" }, { status: 400 })
    }

    const eventResult = await sql`
      SELECT event_name, domain as event_domain FROM events WHERE id = ${eventId}
    `
    const eventName = eventResult[0]?.event_name || "Event"
    const eventDomain = eventResult[0]?.event_domain
      ? `https://${eventResult[0].event_domain}`
      : request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://myschoolauction.com"

    // Get user details for email
    const userResult = await sql`
      SELECT email, name FROM users WHERE id = ${session.id}
    `

    const result = await sql`
      INSERT INTO event_attendance (event_id, user_id, status, created_at, updated_at)
      VALUES (${eventId}, ${session.id}, ${status}, NOW(), NOW())
      ON CONFLICT (event_id, user_id)
      DO UPDATE SET status = ${status}, updated_at = NOW()
      RETURNING *
    `

    console.log("[v0] Attendance registered:", result[0])

    if (status === "going" || status === "maybe") {
      try {
        // Add user to event_users table if not already there
        const eventUserExists = await sql`
          SELECT id FROM event_users WHERE event_id = ${eventId} AND user_id = ${session.id}
        `

        if (eventUserExists.length === 0) {
          await sql`
            INSERT INTO event_users (event_id, user_id, role, created_at)
            VALUES (${eventId}, ${session.id}, 'participant', NOW())
          `
          console.log("[v0] User added to event_users table")
        }

        // Get the first free ticket (price = 0) or create a default registration ticket
        const ticketQuery = await sql`
          SELECT id FROM event_tickets 
          WHERE event_id = ${eventId} AND price = 0 AND is_active = true 
          ORDER BY display_order ASC 
          LIMIT 1
        `

        let ticketId = ticketQuery[0]?.id

        // If no free ticket exists, create a default "Event Registration" ticket
        if (!ticketId) {
          const newTicket = await sql`
            INSERT INTO event_tickets (event_id, name, description, price, is_active, display_order)
            VALUES (${eventId}, 'Event Registration', 'Free event registration', 0, true, 0)
            RETURNING id
          `
          ticketId = newTicket[0].id
          console.log("[v0] Created default registration ticket:", ticketId)
        }

        // Check if ticket purchase already exists for this user and event
        const existingPurchase = await sql`
          SELECT id FROM ticket_purchases 
          WHERE event_id = ${eventId} AND user_id = ${session.id}
        `

        if (existingPurchase.length === 0) {
          // Insert ticket purchase record
          const purchaseResult = await sql`
            INSERT INTO ticket_purchases (event_id, user_id, ticket_id, quantity, total_amount, status, created_at, updated_at)
            VALUES (${eventId}, ${session.id}, ${ticketId}, 1, 0, 'completed', NOW(), NOW())
            RETURNING *
          `
          console.log("[v0] Ticket purchase created:", purchaseResult[0])

          // Update ticket quantity_sold
          await sql`
            UPDATE event_tickets SET quantity_sold = quantity_sold + 1 WHERE id = ${ticketId}
          `
        } else {
          console.log("[v0] Ticket purchase already exists for this user")
        }
      } catch (ticketError) {
        console.error("[v0] Error creating ticket purchase (non-fatal):", ticketError)
      }
    }

    if (status === "going" && userResult.length > 0 && userResult[0].email) {
      try {
        const currentYear = new Date().getFullYear()
        const sendResult = await sendEmail({
          to: userResult[0].email,
          subject: `RSVP Confirmed for ${eventName}`,
          templateName: "rsvp-confirmation",
          dynamicTemplateData: {
            name: userResult[0].name || "Guest",
            eventTitle: eventName,
            year: currentYear,
            link: eventDomain,
          },
        })

        const emailStatus = sendResult.success ? "sent" : "failed"
        const errorMessage = !sendResult.success ? sendResult.error : null

        await sql`
          INSERT INTO email_queue (
            template_id, subject, to_email, from_email,
            dynamic_template_data, status, error_message
          )
          VALUES (
            ${"rsvp-confirmation"},
            ${"RSVP Confirmed for " + eventName},
            ${userResult[0].email},
            ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
            jsonb_build_object(
              'name', ${userResult[0].name || "Guest"},
              'eventTitle', ${eventName},
              'year', ${currentYear},
              'link', ${eventDomain}
            ),
            ${emailStatus},
            ${errorMessage}
          )
        `
        console.log("[v0] RSVP confirmation email sent/recorded for:", userResult[0].email)
      } catch (emailError) {
        console.error("[v0] Failed to send RSVP confirmation email:", emailError)
      }
    }

    return NextResponse.json({ attendance: result[0] })
  } catch (error) {
    console.error("[v0] Error registering attendance:", error)
    return NextResponse.json({ error: "Failed to register attendance" }, { status: 500 })
  }
}
