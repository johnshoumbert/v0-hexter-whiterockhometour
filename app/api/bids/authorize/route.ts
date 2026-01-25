import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getOrCreatePaymentGatewayCustomer } from "@/lib/payment-gateway"

export async function POST(request: NextRequest) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { auctionId } = await request.json()

    if (!auctionId) {
      return NextResponse.json({ error: "Auction ID is required" }, { status: 400 })
    }

    const auctionResult = await sql`
      SELECT event_id FROM auctions WHERE id = ${auctionId}
    `

    if (auctionResult.length === 0) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 })
    }

    const eventId = auctionResult[0].event_id

    const configResult = await sql`
      SELECT value 
      FROM event_settings 
      WHERE event_id = ${eventId} 
      AND page = 'payment'
      AND object = 'stripe_config'
      LIMIT 1
    `

    if (configResult.length === 0) {
      return NextResponse.json(
        { error: "Stripe not configured for this event. Please configure payment methods in admin settings." },
        { status: 400 },
      )
    }

    const config = configResult[0].value
    const secretKey = config?.secret_key

    if (!secretKey) {
      return NextResponse.json(
        { error: "Stripe not configured for this event. Please configure payment methods in admin settings." },
        { status: 400 },
      )
    }

    let stripe: Stripe

    if (secretKey.startsWith("mk_")) {
      stripe = new Stripe(secretKey, {
        apiVersion: "2024-12-18.acacia",
      })
    } else {
      stripe = new Stripe(secretKey, {
        apiVersion: "2024-12-18.acacia",
      })
    }

    const customerId = await getOrCreatePaymentGatewayCustomer(user.id, eventId, "stripe", stripe, {
      email: user.email,
      name: user.name,
    })

    // Create SetupIntent for saving payment method
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      usage: "off_session",
      metadata: {
        auctionId,
        userId: user.id,
        eventId,
      },
    })

    return NextResponse.json({ clientSecret: setupIntent.client_secret })
  } catch (error) {
    console.error("Bid authorization error:", error)
    return NextResponse.json({ error: "Failed to authorize payment" }, { status: 500 })
  }
}
