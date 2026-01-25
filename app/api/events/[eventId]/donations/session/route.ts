import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getEventStripe } from "@/lib/stripe"
import { safeErrorMessage } from "@/lib/safe-stripe-error"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("session_id")

    console.log("[v0] Fetching donation session:", sessionId)

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 })
    }

    // Get Stripe instance for event
    const { stripe } = await getEventStripe(eventId)

    // Retrieve the Stripe checkout session
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId)
    console.log("[v0] Stripe session retrieved:", stripeSession.id)
    console.log("[v0] Payment status:", stripeSession.payment_status)

    // Get payment record from database using session metadata
    const paymentId = stripeSession.metadata?.payment_id

    if (!paymentId) {
      console.error("[v0] No payment_id in session metadata")
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 })
    }

    const paymentResult = await sql`
      SELECT 
        p.id,
        p.amount,
        p.status,
        p.created_at,
        p.stripe_session_id,
        p.stripe_payment_intent,
        e.event_name,
        u.name as user_name,
        u.email as user_email
      FROM payments p
      LEFT JOIN events e ON e.id = p.event_id
      LEFT JOIN users u ON u.id = p.user_id
      WHERE p.id = ${paymentId}
    `

    if (paymentResult.length === 0) {
      console.error("[v0] Payment not found:", paymentId)
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    const payment = paymentResult[0]

    // Update payment status based on Stripe session
    if (stripeSession.payment_status === "paid" && payment.status !== "completed") {
      console.log("[v0] Updating payment status to completed")
      await sql`
        UPDATE payments
        SET 
          status = 'completed',
          stripe_session_id = ${sessionId},
          stripe_payment_intent = ${stripeSession.payment_intent},
          updated_at = NOW()
        WHERE id = ${paymentId}
      `
      payment.status = "completed"
      payment.stripe_session_id = sessionId
      payment.stripe_payment_intent = stripeSession.payment_intent
    }

    // Extract donor info from metadata
    const donorName = stripeSession.metadata?.donor_name || payment.user_name || "Anonymous"
    const donorEmail = stripeSession.metadata?.donor_email || payment.user_email || ""
    const message = stripeSession.metadata?.message || ""

    return NextResponse.json({
      payment: {
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        created_at: payment.created_at,
        donor_name: donorName,
        donor_email: donorEmail,
        message: message,
      },
      event: {
        name: payment.event_name,
      },
      stripe: {
        payment_status: stripeSession.payment_status,
        amount_total: stripeSession.amount_total,
        currency: stripeSession.currency,
      },
    })
  } catch (error: unknown) {
    const message = safeErrorMessage(error)
    console.error("[v0] Error fetching donation session:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
