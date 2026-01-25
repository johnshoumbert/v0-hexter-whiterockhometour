import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { getEventStripe } from "@/lib/stripe"
import { safeErrorMessage } from "@/lib/safe-stripe-error"

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string; requestId: string }> }) {
  try {
    const { eventId, requestId } = await params

    let invoiceNumber = null
    try {
      const body = await request.json()
      invoiceNumber = body.invoiceNumber
    } catch (e) {
      // No body or invalid JSON - that's okay, invoiceNumber is optional
    }

    console.log("[v0] Creating sponsor checkout for request:", requestId, "eventId:", eventId)

    // Get event-specific Stripe instance
    let stripe
    let keySource
    try {
      const stripeResult = await getEventStripe(eventId)
      stripe = stripeResult.stripe
      keySource = stripeResult.keySource
      console.log("[v0] SPONSOR CHECKOUT - Stripe initialized using keySource:", keySource, "for eventId:", eventId)
      console.log("[v0] This Stripe account will be used to CREATE the payment intent")
    } catch (stripeError) {
      const errorMsg = safeErrorMessage(stripeError)
      console.error("[v0] Stripe initialization error:", errorMsg)
      return NextResponse.json({ error: `Stripe configuration error: ${errorMsg}` }, { status: 400 })
    }

    const requestData = await sql`
      SELECT sr.*, sl.amount as level_amount
      FROM sponsor_requests sr
      LEFT JOIN sponsor_levels sl ON sl.event_id = sr.event_id AND sl.level = sr.sponsorship_level
      WHERE sr.id = ${requestId} AND sr.event_id = ${eventId}
      LIMIT 1
    `

    if (requestData.length === 0) {
      console.log("[v0] Sponsor request not found:", requestId)
      return NextResponse.json({ error: "Sponsor request not found" }, { status: 404 })
    }

    const request_data = requestData[0]
    console.log("[v0] Sponsor request data:", {
      company: request_data.company_name,
      level: request_data.sponsorship_level,
      custom_amount: request_data.custom_amount,
      level_amount: request_data.level_amount,
    })

    const rawAmount = request_data.custom_amount || request_data.level_amount
    const amount = Number.parseFloat(rawAmount)

    console.log("[v0] Parsed amount:", amount)

    if (!amount || isNaN(amount)) {
      console.log("[v0] Invalid amount:", { rawAmount, amount })
      return NextResponse.json({ error: "Invalid sponsorship amount" }, { status: 400 })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: "usd",
      metadata: {
        type: "sponsor",
        sponsor_request_id: requestId,
        event_id: eventId,
        company_name: request_data.company_name,
        sponsorship_level: request_data.sponsorship_level,
      },
      description: `Sponsorship: ${request_data.company_name} - ${request_data.sponsorship_level}`,
    })

    console.log("[v0] Payment intent CREATED:", paymentIntent.id, "using keySource:", keySource)
    console.log("[v0] IMPORTANT: This payment intent MUST be retrieved using the SAME keySource:", keySource)

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount: amount,
      totalAmount: amount.toFixed(2),
      invoiceNumber: invoiceNumber || `INV-${requestId.slice(0, 8).toUpperCase()}`,
      items: [
        {
          name: `${request_data.sponsorship_level.charAt(0).toUpperCase() + request_data.sponsorship_level.slice(1)} Sponsorship`,
          amount: amount.toFixed(2),
          quantity: 1,
        },
      ],
    })
  } catch (error) {
    console.error("[v0] Error creating sponsor checkout:", error)
    return NextResponse.json(
      { error: "Failed to create checkout", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
