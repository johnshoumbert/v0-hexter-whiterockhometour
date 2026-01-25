import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getEventStripe } from "@/lib/stripe"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const sessionId = request.nextUrl.searchParams.get("session_id")

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    console.log("[v0] Fetching ticket purchases for session:", sessionId)

    // Fetch ticket purchases by session ID
    const purchases = await sql`
      SELECT 
        tp.id,
        tp.quantity,
        tp.total_amount,
        tp.status,
        tp.stripe_payment_intent,
        tp.stripe_session_id,
        tp.created_at,
        et.name as ticket_name,
        et.description as ticket_description,
        et.price as ticket_price,
        u.name as customer_name,
        u.email as customer_email
      FROM ticket_purchases tp
      JOIN event_tickets et ON tp.ticket_id = et.id
      JOIN users u ON tp.user_id = u.id
      WHERE tp.stripe_session_id = ${sessionId}
        AND tp.event_id = ${eventId}
      ORDER BY tp.created_at DESC
    `

    if (!purchases || purchases.length === 0) {
      console.log("[v0] No ticket purchases found for session:", sessionId)
      return NextResponse.json({ error: "Ticket purchases not found" }, { status: 404 })
    }

    // Get Stripe configuration to fetch payment status
    let paymentStatus = null
    let paymentIntent = null

    if (purchases[0].stripe_payment_intent) {
      try {
        const { stripe } = await getEventStripe(eventId)

        if (!stripe) {
          console.log("[v0] Stripe not configured for event")
        } else {
          // Fetch the payment intent from Stripe
          paymentIntent = await stripe.paymentIntents.retrieve(purchases[0].stripe_payment_intent)
          paymentStatus = paymentIntent.status

          console.log("[v0] Stripe payment status:", paymentStatus)

          if (paymentStatus === "succeeded" && purchases[0].status !== "completed") {
            await sql`
              UPDATE ticket_purchases
              SET status = 'completed', updated_at = NOW()
              WHERE stripe_session_id = ${sessionId}
            `
            console.log("[v0] Updated ticket purchases to completed status")
          } else if (
            (paymentStatus === "canceled" || paymentStatus === "payment_failed") &&
            purchases[0].status !== "failed"
          ) {
            await sql`
              UPDATE ticket_purchases
              SET status = 'failed', updated_at = NOW()
              WHERE stripe_session_id = ${sessionId}
            `
            console.log("[v0] Updated ticket purchases to failed status")
          }
        }
      } catch (stripeError) {
        console.error("[v0] Error fetching Stripe payment status:", stripeError)
      }
    }

    // Calculate totals
    const subtotal = purchases.reduce((sum, purchase) => sum + Number.parseFloat(purchase.total_amount), 0)

    return NextResponse.json({
      purchases: purchases.map((purchase) => ({
        id: purchase.id,
        ticketName: purchase.ticket_name,
        ticketDescription: purchase.ticket_description,
        quantity: purchase.quantity,
        unitPrice: purchase.ticket_price,
        totalAmount: purchase.total_amount,
        status: purchase.status,
        createdAt: purchase.created_at,
      })),
      customerName: purchases[0].customer_name,
      customerEmail: purchases[0].customer_email,
      subtotal: subtotal.toFixed(2),
      purchaseStatus: purchases[0].status,
      paymentStatus: paymentStatus,
      stripePaymentIntent: purchases[0].stripe_payment_intent,
      stripeSessionId: purchases[0].stripe_session_id,
    })
  } catch (error) {
    console.error("[v0] Ticket session fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 })
  }
}
