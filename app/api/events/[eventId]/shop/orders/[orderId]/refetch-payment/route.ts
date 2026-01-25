import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import Stripe from "stripe"

const sql = neon(process.env.NEON_DATABASE_URL!)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; orderId: string }> },
) {
  try {
    const { eventId, orderId } = await params

    console.log("[v0] Refetching payment status for order:", orderId)

    // Fetch order details including stripe_session_id
    const orderResult = await sql`
      SELECT 
        so.id,
        so.stripe_session_id,
        so.stripe_payment_intent,
        so.status,
        so.user_id,
        so.shop_item_id,
        so.quantity,
        so.unit_price,
        so.total_amount,
        so.selected_options,
        si.title as item_title
      FROM shop_orders so
      JOIN shop_items si ON so.shop_item_id = si.id
      WHERE so.id = ${orderId}
      AND so.event_id = ${eventId}
      LIMIT 1
    `

    if (orderResult.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const order = orderResult[0]

    if (!order.stripe_session_id) {
      return NextResponse.json({ error: "No Stripe Checkout Session ID found for this order" }, { status: 400 })
    }

    // Get Stripe configuration from event settings
    const configResult = await sql`
      SELECT value 
      FROM event_settings 
      WHERE event_id = ${eventId} 
        AND page = 'payment' 
        AND object = 'stripe_config'
      LIMIT 1
    `

    if (configResult.length === 0) {
      return NextResponse.json({ error: "Stripe not configured for this event" }, { status: 400 })
    }

    const stripeConfig = configResult[0].value
    if (!stripeConfig?.secret_key) {
      return NextResponse.json({ error: "Stripe secret key not found" }, { status: 400 })
    }

    // Initialize Stripe with event-specific config
    const stripe = new Stripe(stripeConfig.secret_key, {
      apiVersion: "2024-12-18.acacia",
    })

    console.log("[v0] Retrieving Stripe session:", order.stripe_session_id)

    // Retrieve the Checkout Session
    const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id, {
      expand: ["payment_intent"],
    })

    if (!session.payment_intent) {
      return NextResponse.json({ error: "No PaymentIntent found for this Checkout Session" }, { status: 400 })
    }

    // Get the payment intent details
    const paymentIntent =
      typeof session.payment_intent === "string"
        ? await stripe.paymentIntents.retrieve(session.payment_intent)
        : session.payment_intent

    console.log("[v0] Payment Intent status:", paymentIntent.status)

    let orderStatus = order.status
    let paymentDisplayStatus = "unpaid"

    switch (paymentIntent.status) {
      case "succeeded":
        paymentDisplayStatus = "paid"
        orderStatus = "completed" // Set to completed when payment succeeds
        break
      case "processing":
        paymentDisplayStatus = "pending"
        orderStatus = "pending"
        break
      case "requires_payment_method":
      case "requires_confirmation":
      case "requires_action":
        paymentDisplayStatus = "pending"
        orderStatus = "pending"
        break
      case "canceled":
        paymentDisplayStatus = "failed"
        orderStatus = "cancelled"
        break
      default:
        paymentDisplayStatus = "failed"
        orderStatus = "failed"
    }

    console.log("[v0] Mapped order status:", orderStatus, "payment display:", paymentDisplayStatus)

    await sql`
      UPDATE shop_orders
      SET 
        stripe_payment_intent = ${paymentIntent.id},
        status = ${orderStatus},
        updated_at = NOW()
      WHERE id = ${orderId}
    `

    console.log("[v0] Updated shop order:", orderId)

    const existingPaymentResult = await sql`
      SELECT id, status 
      FROM payments 
      WHERE stripe_payment_intent = ${paymentIntent.id}
      LIMIT 1
    `

    let paymentId: string

    if (existingPaymentResult.length > 0) {
      // Update existing payment record
      paymentId = existingPaymentResult[0].id
      console.log("[v0] Updating existing payment record:", paymentId)

      await sql`
        UPDATE payments
        SET 
          status = ${paymentDisplayStatus === "paid" ? "completed" : paymentDisplayStatus},
          stripe_session_id = ${order.stripe_session_id},
          updated_at = NOW()
        WHERE id = ${paymentId}
      `
    } else if (paymentDisplayStatus === "paid") {
      // Create new payment record only if payment succeeded
      console.log("[v0] Creating new payment record for completed payment")

      const amount = order.total_amount
      const paymentResult = await sql`
        INSERT INTO payments (
          user_id, auction_id, event_id, amount, stripe_payment_intent, 
          stripe_session_id, payment_type, status, created_at
        )
        VALUES (
          ${order.user_id}, NULL, ${eventId}, ${amount}, ${paymentIntent.id},
          ${order.stripe_session_id}, 'shop', 'completed', NOW()
        )
        RETURNING id
      `
      paymentId = paymentResult[0].id
      console.log("[v0] Created payment record:", paymentId)

      // Create payment item record
      await sql`
        INSERT INTO payment_items (
          payment_id, item_type, item_id, item_name, quantity, 
          unit_price, total_amount, metadata, created_at
        ) VALUES (
          ${paymentId}, 'shop_item', ${order.shop_item_id}, ${order.item_title}, 
          ${order.quantity}, ${order.unit_price}, ${order.total_amount},
          ${order.selected_options || null}::jsonb, NOW()
        )
      `
      console.log("[v0] Created payment item record")
    }

    console.log("[v0] Payment status refetch complete")

    return NextResponse.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
      orderStatus,
      paymentDisplayStatus,
    })
  } catch (error: any) {
    console.error("[v0] Error refetching payment status:", error)
    return NextResponse.json({ error: error.message || "Failed to refetch payment status" }, { status: 500 })
  }
}
