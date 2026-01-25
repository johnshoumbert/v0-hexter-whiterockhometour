import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import Stripe from "stripe"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const sessionId = request.nextUrl.searchParams.get("session_id")

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    console.log("[v0] Fetching shop orders for session:", sessionId)

    // Fetch orders by session ID
    const orders = await sql`
      SELECT 
        so.id,
        so.quantity,
        so.unit_price,
        so.total_amount,
        so.status,
        so.selected_options,
        so.stripe_payment_intent,
        so.stripe_session_id,
        so.created_at,
        si.title,
        si.description,
        si.image_url,
        u.name as customer_name,
        u.email as customer_email
      FROM shop_orders so
      JOIN shop_items si ON so.shop_item_id = si.id
      JOIN users u ON so.user_id = u.id
      WHERE so.stripe_session_id = ${sessionId}
        AND so.event_id = ${eventId}
      ORDER BY so.created_at DESC
    `

    if (!orders || orders.length === 0) {
      console.log("[v0] No orders found for session:", sessionId)
      return NextResponse.json({ error: "Orders not found" }, { status: 404 })
    }

    // Get Stripe configuration to fetch payment status
    const configResult = await sql`
      SELECT value 
      FROM event_settings 
      WHERE event_id = ${eventId} 
        AND page = 'payment' 
        AND object = 'stripe_config'
    `

    let paymentStatus = null
    let paymentIntent = null

    if (configResult.length > 0 && configResult[0].value?.secret_key && orders[0].stripe_payment_intent) {
      try {
        const config = configResult[0].value
        const stripe = new Stripe(config.secret_key, {
          apiVersion: "2024-12-18.acacia",
        })

        // Fetch the payment intent from Stripe
        paymentIntent = await stripe.paymentIntents.retrieve(orders[0].stripe_payment_intent)
        paymentStatus = paymentIntent.status

        console.log("[v0] Stripe payment status:", paymentStatus)

        if (paymentStatus === "succeeded" && orders[0].status === "checkout") {
          await sql`
            UPDATE shop_orders
            SET status = 'completed', updated_at = NOW()
            WHERE stripe_session_id = ${sessionId}
          `
          console.log("[v0] Updated orders to completed status")
        } else if (
          (paymentStatus === "canceled" || paymentStatus === "payment_failed") &&
          orders[0].status === "checkout"
        ) {
          await sql`
            UPDATE shop_orders
            SET status = 'failed', updated_at = NOW()
            WHERE stripe_session_id = ${sessionId}
          `
          console.log("[v0] Updated orders to failed status")
        }
      } catch (stripeError) {
        console.error("[v0] Error fetching Stripe payment status:", stripeError)
      }
    }

    // Calculate totals
    const subtotal = orders.reduce((sum, order) => sum + Number.parseFloat(order.total_amount), 0)

    return NextResponse.json({
      orders: orders.map((order) => ({
        id: order.id,
        itemTitle: order.title,
        itemDescription: order.description,
        itemImage: order.image_url,
        quantity: order.quantity,
        unitPrice: order.unit_price,
        totalAmount: order.total_amount,
        selectedOptions: order.selected_options,
        status: order.status,
        createdAt: order.created_at,
      })),
      customerName: orders[0].customer_name,
      customerEmail: orders[0].customer_email,
      subtotal: subtotal.toFixed(2),
      orderStatus: orders[0].status,
      paymentStatus: paymentStatus,
      stripePaymentIntent: orders[0].stripe_payment_intent,
      stripeSessionId: orders[0].stripe_session_id,
    })
  } catch (error) {
    console.error("[v0] Session fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 })
  }
}
