import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { checkAdminAccess } from "@/lib/admin-check"
import { getEventStripe } from "@/lib/stripe"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; winnerId: string }> },
) {
  try {
    const { eventId, winnerId } = await params

    console.log("[v0] Charge winner called:", { eventId, winnerId })

    const adminCheck = await checkAdminAccess(eventId)
    if (!adminCheck.isAdmin) {
      console.log("[v0] Unauthorized charge attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get the winning bid - winnerId is actually the bid ID
    const bids = await sql`
      SELECT 
        b.*,
        u.stripe_customer_id,
        u.email as user_email,
        u.name as user_name,
        a.title as auction_title,
        a.id as auction_id
      FROM bids b
      JOIN users u ON b.user_id = u.id
      JOIN auctions a ON b.auction_id = a.id
      WHERE b.id = ${winnerId}
        AND b.event_id = ${eventId}
    `

    if (bids.length === 0) {
      console.log("[v0] Winner bid not found")
      return NextResponse.json({ error: "Winner not found" }, { status: 404 })
    }

    const bid = bids[0]
    console.log("[v0] Winner bid found:", {
      userId: bid.user_id,
      auctionId: bid.auction_id,
      amount: bid.amount,
      authorized: bid.authorized,
      hasPaymentMethod: !!bid.stripe_payment_method_id,
    })

    if (!bid.authorized || !bid.stripe_payment_method_id) {
      console.log("[v0] Payment method not authorized")
      return NextResponse.json({ error: "Payment method not authorized" }, { status: 400 })
    }

    // Check if already paid
    const existingPayment = await sql`
      SELECT * FROM payments
      WHERE user_id = ${bid.user_id}
        AND auction_id = ${bid.auction_id}
        AND event_id = ${eventId}
        AND status IN ('completed', 'succeeded')
    `

    if (existingPayment.length > 0) {
      console.log("[v0] Already paid")
      return NextResponse.json({ error: "Already paid" }, { status: 400 })
    }

    console.log("[v0] Getting event Stripe instance")
    const stripeResult = await getEventStripe(eventId)

    if (!stripeResult || !stripeResult.stripe) {
      console.log("[v0] Stripe not configured for event")
      return NextResponse.json({ error: "Stripe not configured for this event" }, { status: 400 })
    }

    const stripe = stripeResult.stripe

    console.log("[v0] Creating payment intent for amount:", bid.amount)
    // Create and confirm payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(bid.amount) * 100),
      currency: "usd",
      customer: bid.stripe_customer_id,
      payment_method: bid.stripe_payment_method_id,
      off_session: true,
      confirm: true,
      metadata: {
        winnerId: bid.id,
        auctionId: bid.auction_id,
        userId: bid.user_id,
        eventId: eventId,
      },
    })

    console.log("[v0] Payment intent status:", paymentIntent.status)

    if (paymentIntent.status === "succeeded") {
      // Create payment record
      const paymentResult = await sql`
        INSERT INTO payments (
          user_id, auction_id, event_id, amount, 
          stripe_payment_intent, status, payment_type, created_at
        )
        VALUES (
          ${bid.user_id}, ${bid.auction_id}, ${eventId}, ${bid.amount},
          ${paymentIntent.id}, 'completed', 'auction', NOW()
        )
        RETURNING id
      `

      const paymentId = paymentResult[0].id
      console.log("[v0] Payment record created:", paymentId)

      // Create payment_item to link the bid to the payment
      await sql`
        INSERT INTO payment_items (
          payment_id,
          item_type,
          item_id,
          item_name,
          quantity,
          unit_price,
          total_amount,
          metadata,
          created_at,
          updated_at
        )
        VALUES (
          ${paymentId},
          'auction',
          ${bid.auction_id},
          ${bid.auction_title},
          1,
          ${bid.amount},
          ${bid.amount},
          ${JSON.stringify({ bid_id: bid.id })},
          NOW(),
          NOW()
        )
      `

      console.log("[v0] Payment successful with payment_item created")
      return NextResponse.json({
        success: true,
        paymentIntentId: paymentIntent.id,
        paymentId: paymentId,
      })
    }

    console.log("[v0] Payment failed with status:", paymentIntent.status)
    return NextResponse.json(
      {
        error: "Payment failed",
        status: paymentIntent.status,
      },
      { status: 400 },
    )
  } catch (error: any) {
    console.error("[v0] Charge winner error:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to charge winner",
      },
      { status: 500 },
    )
  }
}
