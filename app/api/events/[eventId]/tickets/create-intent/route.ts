import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getEventStripe } from "@/lib/stripe"
import { getOrCreatePaymentGatewayCustomer } from "@/lib/payment-gateway"

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { eventId } = await params
    const { tickets, responses } = await request.json()

    if (!tickets || tickets.length === 0) {
      return NextResponse.json({ error: "No tickets provided" }, { status: 400 })
    }

    const { stripe } = await getEventStripe(eventId)

    const eventResult = await sql`SELECT event_name FROM events WHERE id = ${eventId}`
    const eventName = eventResult[0]?.event_name || "Event"

    const purchaseIds: string[] = []
    let totalAmount = 0

    for (const ticket of tickets) {
      const ticketAmount = ticket.price * ticket.quantity
      totalAmount += ticketAmount

      const result = await sql`
        INSERT INTO ticket_purchases (event_id, user_id, ticket_id, quantity, total_amount, status, created_at, updated_at)
        VALUES (${eventId}, ${session.id}, ${ticket.ticket_id}, ${ticket.quantity}, ${ticketAmount}, 'pending', NOW(), NOW())
        RETURNING id
      `
      purchaseIds.push(result[0].id)

      // Save question responses if provided
      if (responses && responses[ticket.ticket_id]) {
        const ticketResponses = responses[ticket.ticket_id]
        for (const questionId of Object.keys(ticketResponses)) {
          const response = ticketResponses[questionId]
          await sql`
            INSERT INTO ticket_question_responses (purchase_id, question_id, response_text, response_array)
            VALUES (${result[0].id}, ${questionId}, ${Array.isArray(response) ? null : response}, ${Array.isArray(response) ? JSON.stringify(response) : null})
          `
        }
      }
    }

    // Create or get Stripe customer
    const existingCustomer = await sql`
      SELECT customer_id FROM payment_gateway_customers
      WHERE user_id = ${session.id} AND event_id = ${eventId} AND payment_provider = 'stripe'
    `

    let stripeCustomerId: string
    if (existingCustomer.length > 0) {
      stripeCustomerId = existingCustomer[0].customer_id
    } else {
      const customer = await stripe.customers.create({
        email: session.email,
        name: session.name,
        metadata: { user_id: session.id, event_id: eventId },
      })
      stripeCustomerId = customer.id
      await getOrCreatePaymentGatewayCustomer(session.id, eventId, "stripe", stripeCustomerId, {
        email: session.email,
        name: session.name,
      })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100),
      currency: "usd",
      customer: stripeCustomerId,
      metadata: {
        application: "MySchoolAuction.com",
        type: "ticket_purchase",
        event_id: eventId,
        event_name: eventName,
        user_id: session.id,
        purchase_ids: purchaseIds.join(","),
      },
    })

    // Store payment intent with purchases
    for (const purchaseId of purchaseIds) {
      await sql`
        UPDATE ticket_purchases
        SET stripe_payment_intent = ${paymentIntent.id}
        WHERE id = ${purchaseId}
      `
    }

    const ticketsSummary = tickets.map((ticket: any) => ({
      ticket_id: ticket.ticket_id,
      name: ticket.ticket_name || "Event Ticket",
      amount: (ticket.price * ticket.quantity).toFixed(2),
      quantity: ticket.quantity,
      price: ticket.price,
    }))

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      totalAmount: totalAmount.toFixed(2),
      items: ticketsSummary,
    })
  } catch (error) {
    console.error("[v0] Error creating ticket payment intent:", error)
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 })
  }
}
