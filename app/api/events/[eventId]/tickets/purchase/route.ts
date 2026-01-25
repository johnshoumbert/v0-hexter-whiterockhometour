import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { sendEmail } from "@/lib/email"

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const body = await request.json()

    console.log("[v0] Ticket purchase request body:", JSON.stringify(body, null, 2))

    let userId: string
    if (body.userId) {
      // Kiosk mode - userId provided directly
      userId = body.userId
    } else {
      // Normal mode - get from session
      const session = await getSession()
      if (!session) {
        return NextResponse.json({ error: "Unauthorized - Please log in" }, { status: 401 })
      }
      userId = session.id
    }

    const { tickets, responses, ticketQuantities } = body

    const ticketList = ticketQuantities
      ? Object.entries(ticketQuantities)
          .filter(([_, qty]) => (qty as number) > 0)
          .map(([ticketId, quantity]) => ({ ticket_id: ticketId, quantity }))
      : tickets

    console.log("[v0] Processing ticket purchase - eventId:", eventId, "userId:", userId, "tickets:", ticketList)

    if (!ticketList || !Array.isArray(ticketList) || ticketList.length === 0) {
      console.error("[v0] No tickets provided in request")
      return NextResponse.json({ error: "No tickets provided" }, { status: 400 })
    }

    // Get user email and event details for email
    const userResult = await sql`SELECT email, name FROM users WHERE id = ${userId}`
    if (!userResult || userResult.length === 0) {
      console.error("[v0] User not found:", userId)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    const user = userResult[0]

    const eventResult = await sql`SELECT event_name, domain as event_domain FROM events WHERE id = ${eventId}`
    if (!eventResult || eventResult.length === 0) {
      console.error("[v0] Event not found:", eventId)
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }
    const event = eventResult[0]

    const eventName = event?.event_name || "Event"
    const eventDomain = event?.event_domain
      ? `https://${event.event_domain}`
      : request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://myschoolauction.com"

    const ticketIds = ticketList.map((t: any) => t.ticket_id)

    console.log("[v0] Fetching ticket details for IDs:", ticketIds)

    const ticketDetails = await sql`
      SELECT 
        id, name, price,
        early_bird_price, early_bird_end_date,
        regular_price, regular_end_date,
        late_price
      FROM event_tickets 
      WHERE id = ANY(${ticketIds})
    `

    console.log("[v0] Ticket details fetched:", ticketDetails.length, "tickets")

    if (ticketDetails.length === 0) {
      console.error("[v0] No ticket details found for IDs:", ticketIds)
      return NextResponse.json({ error: "Tickets not found" }, { status: 404 })
    }

    const ticketMap = new Map(ticketDetails.map((t: any) => [t.id, t]))

    // Helper function to calculate current price
    const calculateCurrentPrice = (ticket: any): number => {
      const now = new Date()

      // Check early bird pricing
      if (ticket.early_bird_price && ticket.early_bird_end_date) {
        const earlyBirdEnd = new Date(ticket.early_bird_end_date)
        if (now < earlyBirdEnd) {
          console.log("[v0] Using early bird price:", ticket.early_bird_price)
          return Number(ticket.early_bird_price)
        }
      }

      // Check regular pricing
      if (ticket.regular_price && ticket.regular_end_date) {
        const regularEnd = new Date(ticket.regular_end_date)
        if (now < regularEnd) {
          console.log("[v0] Using regular price:", ticket.regular_price)
          return Number(ticket.regular_price)
        }
      }

      // Check late pricing
      if (ticket.late_price) {
        console.log("[v0] Using late price:", ticket.late_price)
        return Number(ticket.late_price)
      }

      // Fallback to base price
      console.log("[v0] Using base price:", ticket.price)
      return Number(ticket.price)
    }

    for (const ticket of ticketList) {
      const ticketInfo = ticketMap.get(ticket.ticket_id)
      if (!ticketInfo) {
        console.error("[v0] Ticket not found:", ticket.ticket_id)
        continue
      }

      const currentPrice = calculateCurrentPrice(ticketInfo)
      const totalAmount = currentPrice * Number(ticket.quantity)

      console.log(
        "[v0] Calculated price for ticket:",
        ticketInfo.name,
        "price:",
        currentPrice,
        "quantity:",
        ticket.quantity,
        "total:",
        totalAmount,
      )

      const existingPurchaseResult = await sql`
        SELECT id FROM ticket_purchases 
        WHERE event_id = ${eventId} AND user_id = ${userId} AND ticket_id = ${ticket.ticket_id}
      `

      const existingPurchase = existingPurchaseResult.length > 0 ? existingPurchaseResult[0] : null

      let purchaseId: string

      if (!existingPurchase) {
        console.log("[v0] Creating new ticket purchase...")

        const newPurchaseResult = await sql`
          INSERT INTO ticket_purchases (event_id, user_id, ticket_id, quantity, total_amount, status, created_at, updated_at)
          VALUES (${eventId}, ${userId}, ${ticket.ticket_id}, ${ticket.quantity}, ${totalAmount}, 'completed', NOW(), NOW())
          RETURNING id
        `

        if (!newPurchaseResult || newPurchaseResult.length === 0) {
          console.error("[v0] Failed to create ticket purchase")
          throw new Error("Failed to create ticket purchase")
        }

        purchaseId = newPurchaseResult[0].id

        console.log("[v0] Ticket purchase created with ID:", purchaseId)

        // Update ticket quantity_sold
        await sql`UPDATE event_tickets SET quantity_sold = quantity_sold + ${ticket.quantity} WHERE id = ${ticket.ticket_id}`

        console.log("[v0] Ticket quantity updated for ticket:", ticket.ticket_id)
      } else {
        purchaseId = existingPurchase.id
        console.log("[v0] Using existing purchase ID:", purchaseId)
      }

      // Save question responses if provided
      if (responses && responses[ticket.ticket_id]) {
        console.log("[v0] Saving question responses for ticket:", ticket.ticket_id)
        const ticketResponses = responses[ticket.ticket_id]
        for (const questionId of Object.keys(ticketResponses)) {
          const response = ticketResponses[questionId]

          try {
            await sql`
              INSERT INTO ticket_question_responses (purchase_id, question_id, response_text, response_array)
              VALUES (${purchaseId}, ${questionId}, ${Array.isArray(response) ? null : response}, ${Array.isArray(response) ? JSON.stringify(response) : null})
              ON CONFLICT (purchase_id, question_id)
              DO UPDATE SET response_text = ${Array.isArray(response) ? null : response}, response_array = ${Array.isArray(response) ? JSON.stringify(response) : null}
            `
            console.log("[v0] Question response saved for question:", questionId)
          } catch (error) {
            console.error("[v0] Error saving question response:", error)
          }
        }
      }
    }

    const eventUserExistsResult =
      await sql`SELECT id FROM event_users WHERE event_id = ${eventId} AND user_id = ${userId}`
    const eventUserExists = eventUserExistsResult.length > 0 ? eventUserExistsResult[0] : null

    if (!eventUserExists) {
      await sql`
        INSERT INTO event_users (event_id, user_id, role, created_at)
        VALUES (${eventId}, ${userId}, 'participant', NOW())
      `
      console.log("[v0] User added to event_users table")
    }

    await sql`
      INSERT INTO event_attendance (event_id, user_id, status, created_at, updated_at)
      VALUES (${eventId}, ${userId}, 'going', NOW(), NOW())
      ON CONFLICT (event_id, user_id)
      DO UPDATE SET status = 'going', updated_at = NOW()
    `
    console.log("[v0] Attendance updated to 'going'")

    if (user && user.email) {
      try {
        const currentYear = new Date().getFullYear()
        const sendResult = await sendEmail({
          to: user.email,
          subject: `RSVP Confirmed for ${eventName}`,
          templateName: "rsvp-confirmation",
          dynamicTemplateData: {
            name: user.name || "Guest",
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
            ${user.email},
            ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
            jsonb_build_object(
              'name', ${user.name || "Guest"},
              'eventTitle', ${eventName},
              'year', ${currentYear},
              'link', ${eventDomain}
            ),
            ${emailStatus},
            ${errorMessage}
          )
        `
        console.log("[v0] RSVP confirmation email sent/recorded for:", user.email)
      } catch (emailError) {
        console.error("[v0] Failed to send RSVP confirmation email:", emailError)
        // Don't fail the entire request if email fails
      }
    }

    console.log("[v0] Ticket purchase completed successfully")
    return NextResponse.json({ success: true, message: "Registration complete" })
  } catch (error) {
    console.error("[v0] Error processing ticket purchase:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json(
      {
        error: "Failed to process ticket purchase",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
