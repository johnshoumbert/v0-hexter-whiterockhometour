import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import Stripe from "stripe"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; paymentId: string }> },
) {
  try {
    const user = await getSession()
    const { eventId, paymentId } = await params

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const isGlobalAdmin = user.role === "admin"
    const eventAdmins = await sql`
      SELECT * FROM event_users
      WHERE event_id = ${eventId} AND user_id = ${user.id} AND role = 'admin'
    `
    const isEventAdmin = eventAdmins.length > 0

    if (!isGlobalAdmin && !isEventAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    // Get payment details
    const payments = await sql`
      SELECT * FROM payments
      WHERE id = ${paymentId} AND event_id = ${eventId}
    `

    if (payments.length === 0) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    const payment = payments[0]

    if (!payment.stripe_payment_intent) {
      return NextResponse.json({ error: "No Stripe payment intent found for this payment" }, { status: 400 })
    }

    if (payment.status === "refunded") {
      return NextResponse.json({ error: "Payment has already been refunded" }, { status: 400 })
    }

    // Get event's Stripe configuration
    const eventSettings = await sql`
      SELECT stripe_secret_key FROM event_settings
      WHERE event_id = ${eventId}
    `

    const stripeKey = eventSettings[0]?.stripe_secret_key || process.env.STRIPE_SECRET_KEY

    if (!stripeKey) {
      return NextResponse.json({ error: "Stripe not configured for this event" }, { status: 400 })
    }

    // Initialize Stripe with event-specific key
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-11-20.acacia",
    })

    // Process refund through Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent,
      reason: "requested_by_customer",
    })

    // Update payment status in database
    await sql`
      UPDATE payments
      SET status = 'refunded'
      WHERE id = ${paymentId}
    `

    return NextResponse.json({
      success: true,
      message: "Refund processed successfully",
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
      },
    })
  } catch (error: any) {
    console.error("[v0] Refund error:", error)

    // Handle Stripe-specific errors
    if (error.type === "StripeCardError") {
      return NextResponse.json({ error: "Card error", message: error.message }, { status: 400 })
    } else if (error.type === "StripeInvalidRequestError") {
      return NextResponse.json({ error: "Invalid request", message: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to process refund", message: error.message }, { status: 500 })
  }
}
