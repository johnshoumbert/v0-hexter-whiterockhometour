import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth"
import Stripe from "stripe"

const sql = neon(process.env.NEON_DATABASE_URL!)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; purchaseId: string }> },
) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const { ticket_id, quantity, balanceAmount } = await request.json()
    const { eventId, purchaseId } = await params

    // Get user
    const users = await sql`SELECT * FROM users WHERE id = ${payload.userId}`
    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    const user = users[0]

    // Get event
    const events = await sql`SELECT * FROM events WHERE id = ${eventId}`
    if (events.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }
    const event = events[0]

    // Get ticket info
    const tickets = await sql`
      SELECT * FROM event_tickets 
      WHERE id = ${ticket_id} AND event_id = ${eventId}
    `
    if (tickets.length === 0) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }
    const ticket = tickets[0]

    // Create Stripe checkout session for the balance
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${ticket.name} - Balance Payment`,
              description: `Registration change balance for ${event.event_name}`,
            },
            unit_amount: Math.round(balanceAmount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin")}/?registration_updated=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin")}/?registration_cancelled=true`,
      customer_email: user.email,
      metadata: {
        type: "registration_balance",
        user_id: payload.userId,
        event_id: eventId,
        purchase_id: purchaseId,
        ticket_id: ticket_id,
        quantity: quantity.toString(),
      },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error("[v0] Error creating balance payment session:", error)
    return NextResponse.json({ error: "Failed to create payment session" }, { status: 500 })
  }
}
