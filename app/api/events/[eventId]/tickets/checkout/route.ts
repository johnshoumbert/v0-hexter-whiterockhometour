import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getOrCreatePaymentGatewayCustomer } from "@/lib/payment-gateway"
import { safeErrorMessage, safeExtractStripeSessionData } from "@/lib/safe-stripe-error"
import { getEventStripe } from "@/lib/stripe"

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Please log in" }, { status: 401 })
    }

    console.log("[v0] Raw params before await:", params)
    const { eventId } = await params
    console.log("[v0] Extracted eventId after await:", eventId)
    console.log("[v0] EventId type:", typeof eventId, "value:", eventId)

    const { tickets, responses } = await request.json()

    console.log("[v0] Creating ticket checkout - eventId:", eventId, "userId:", session.id, "tickets:", tickets)

    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return NextResponse.json({ error: "No tickets provided" }, { status: 400 })
    }

    let stripe
    let keySource
    try {
      const stripeResult = await getEventStripe(eventId)
      stripe = stripeResult.stripe
      keySource = stripeResult.keySource
      console.log("[v0] Stripe initialized using:", keySource)
    } catch (stripeError) {
      const errorMsg = safeErrorMessage(stripeError)
      console.error("[v0] Stripe initialization error:", errorMsg)
      return NextResponse.json({ error: `Stripe configuration error: ${errorMsg}` }, { status: 400 })
    }

    const eventResult = await sql`SELECT event_name, domain FROM events WHERE id = ${eventId}`
    const eventName = eventResult[0]?.event_name || "Event"
    const eventDomain = eventResult[0]?.domain

    let eventHost: string
    if (eventDomain && eventDomain !== "localhost" && !eventDomain.includes("localhost:")) {
      eventHost = eventDomain.startsWith("http") ? eventDomain : `https://${eventDomain}`
      console.log("[v0] Using event domain from database:", eventHost)
    } else {
      // Fallback to request origin for localhost or missing domains
      const origin = request.headers.get("origin") || request.headers.get("referer")?.split("/").slice(0, 3).join("/")
      if (!origin) {
        return NextResponse.json({ error: "Could not determine event URL for checkout" }, { status: 400 })
      }
      eventHost = origin
      console.log("[v0] Using request origin for redirect:", eventHost)
    }

    let stripeCustomer
    try {
      stripeCustomer = await stripe.customers.create({
        email: session.email || undefined,
        name: session.name || undefined,
        metadata: {
          user_id: session.id,
          event_id: eventId,
        },
      })
    } catch (customerError) {
      const errorMsg = safeErrorMessage(customerError)
      console.error("[v0] Error creating Stripe customer:", errorMsg)
      return NextResponse.json({ error: `Failed to create customer: ${errorMsg}` }, { status: 500 })
    }

    const stripeCustomerId = String(stripeCustomer.id)

    console.log("[v0] About to call getOrCreatePaymentGatewayCustomer with eventId:", eventId, "type:", typeof eventId)

    await getOrCreatePaymentGatewayCustomer(session.id, eventId, "stripe", stripeCustomerId, {
      email: session.email,
      name: session.name,
    })

    console.log("[v0] Successfully created/retrieved payment gateway customer")

    // Calculate total and create line items
    const lineItems = tickets.map((ticket: any) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: ticket.ticket_name || "Event Ticket",
        },
        unit_amount: Math.round(ticket.price * 100),
      },
      quantity: ticket.quantity,
    }))

    const totalAmount = tickets.reduce((sum: number, t: any) => sum + t.price * t.quantity, 0)

    // Create pending ticket purchase records
    const purchaseIds: string[] = []
    for (const ticket of tickets) {
      const result = await sql`
        INSERT INTO ticket_purchases (event_id, user_id, ticket_id, quantity, total_amount, status, created_at, updated_at)
        VALUES (${eventId}, ${session.id}, ${ticket.ticket_id}, ${ticket.quantity}, ${ticket.price * ticket.quantity}, 'pending', NOW(), NOW())
        RETURNING id
      `
      purchaseIds.push(result[0].id)

      // Save question responses if provided
      if (responses && responses[ticket.ticket_id]) {
        const ticketResponses = responses[ticket.ticket_id]
        for (const questionId of Object.keys(ticketResponses)) {
          const response = ticketResponses[questionId]

          try {
            await sql`
              INSERT INTO ticket_question_responses (purchase_id, question_id, response_text, response_array)
              VALUES (${result[0].id}, ${questionId}, ${Array.isArray(response) ? null : response}, ${Array.isArray(response) ? JSON.stringify(response) : null})
            `
          } catch (error) {
            console.error("[v0] Error saving question response:", error)
          }
        }
      }
    }

    let checkoutSession
    try {
      checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: `${eventHost}/tickets/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${eventHost}/?canceled=true`,
        customer: stripeCustomerId,
        metadata: {
          application: "MySchoolAuction.com",
          event_id: eventId,
          event_name: eventName,
          type: "ticket_purchase",
          user_id: session.id,
          purchase_ids: purchaseIds.join(","),
        },
        payment_intent_data: {
          metadata: {
            application: "MySchoolAuction.com",
            event_id: eventId,
            event_name: eventName,
            type: "ticket_purchase",
            user_id: session.id,
            purchase_ids: purchaseIds.join(","),
          },
        },
      })
    } catch (sessionError) {
      const errorMsg = safeErrorMessage(sessionError)
      console.error("[v0] Error creating checkout session:", errorMsg)
      return NextResponse.json({ error: `Failed to create checkout: ${errorMsg}` }, { status: 500 })
    }

    const { url: checkoutUrl, id: sessionId } = safeExtractStripeSessionData(checkoutSession)

    // Store session ID with purchases
    for (const purchaseId of purchaseIds) {
      await sql`UPDATE ticket_purchases SET stripe_session_id = ${sessionId} WHERE id = ${purchaseId}`
    }

    console.log("[v0] Ticket checkout session created:", sessionId)

    const finalUrl = checkoutUrl || ""
    if (!finalUrl) {
      return NextResponse.json({ error: "Failed to generate checkout URL" }, { status: 500 })
    }

    return NextResponse.json({ url: finalUrl })
  } catch (error) {
    const errorMsg = safeErrorMessage(error)
    console.error("[v0] Error creating ticket checkout:", errorMsg)
    return NextResponse.json({ error: errorMsg || "Failed to create checkout session" }, { status: 500 })
  }
}
