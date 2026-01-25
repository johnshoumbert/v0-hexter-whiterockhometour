import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getEventStripe } from "@/lib/stripe"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in to continue." }, { status: 401 })
    }

    const { eventId } = await params
    const { amount, message } = await request.json()

    if (!amount || amount < 1) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    const { stripe } = await getEventStripe(eventId)

    const eventResult = await sql`SELECT event_name FROM events WHERE id = ${eventId}`
    const eventName = eventResult[0]?.event_name || "Event"

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      metadata: {
        application: "MySchoolAuction.com",
        type: "donation",
        user_id: session.id,
        message: message || "",
        event_id: eventId,
        event_name: eventName,
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      totalAmount: amount,
      items: [{ name: "Donation", amount, quantity: 1 }],
    })
  } catch (error) {
    console.error("[v0] Error creating donation payment intent:", error)
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 })
  }
}
