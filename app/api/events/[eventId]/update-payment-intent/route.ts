import { type NextRequest, NextResponse } from "next/server"
import { getEventStripe } from "@/lib/stripe"
import { getSession } from "@/lib/auth"

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    console.log("[v0] Update payment intent called")

    const session = await getSession()
    if (!session) {
      console.log("[v0] Unauthorized - no session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { eventId } = await params
    console.log("[v0] Event ID:", eventId)

    const body = await request.json()
    console.log("[v0] Request body:", body)

    const { clientSecret, newAmount, couponCode, discountAmount } = body

    if (!clientSecret || newAmount === undefined) {
      console.log("[v0] Missing required fields:", { clientSecret: !!clientSecret, newAmount })
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Extract payment intent ID from client secret
    const paymentIntentId = clientSecret.split("_secret_")[0]
    console.log("[v0] Payment intent ID:", paymentIntentId)

    console.log("[v0] Getting Stripe instance for event:", eventId)
    const { stripe } = await getEventStripe(eventId)

    const amountInCents = Math.round(newAmount * 100)
    console.log("[v0] Updating payment intent with amount:", { newAmount, amountInCents })

    // Update the payment intent with the new amount
    const paymentIntent = await stripe.paymentIntents.update(paymentIntentId, {
      amount: amountInCents, // Convert to cents
      metadata: {
        ...(couponCode && { coupon_code: couponCode }),
        ...(discountAmount && { discount_amount: discountAmount.toString() }),
      },
    })

    console.log("[v0] Payment intent updated successfully:", {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      metadata: paymentIntent.metadata,
    })

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      amount: paymentIntent.amount / 100,
    })
  } catch (error) {
    console.error("[v0] Error updating payment intent:", error)
    console.error("[v0] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      {
        error: "Failed to update payment intent",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
