import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import Stripe from "stripe"
import { getOrCreatePaymentGatewayCustomer } from "@/lib/payment-gateway"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; raffleId: string }> },
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { eventId, raffleId } = await params
    const body = await request.json()
    const { quantity } = body

    // Get raffle details
    const raffleResult = await sql`
      SELECT * FROM raffles WHERE id = ${raffleId} AND event_id = ${eventId}
    `

    if (raffleResult.length === 0) {
      return NextResponse.json({ error: "Raffle not found" }, { status: 404 })
    }

    const raffle = raffleResult[0]

    // Check if raffle is active
    if (!raffle.is_active) {
      return NextResponse.json({ error: "Raffle is not active" }, { status: 400 })
    }

    // Check if user already has max tickets
    if (raffle.max_tickets_per_user) {
      const userEntries = await sql`
        SELECT COUNT(*) as count
        FROM raffle_entries
        WHERE raffle_id = ${raffleId} AND user_id = ${session.userId}
      `
      const currentCount = Number(userEntries[0].count)
      if (currentCount + quantity > raffle.max_tickets_per_user) {
        return NextResponse.json(
          {
            error: `You can only purchase ${raffle.max_tickets_per_user} tickets total`,
          },
          { status: 400 },
        )
      }
    }

    // Check if enough tickets available
    if (raffle.total_tickets_available) {
      const ticketsSold = Number(raffle.tickets_sold || 0)
      if (ticketsSold + quantity > raffle.total_tickets_available) {
        return NextResponse.json({ error: "Not enough tickets available" }, { status: 400 })
      }
    }

    const totalAmount = Number(raffle.ticket_price) * quantity

    // If free raffle, create entries directly
    if (totalAmount === 0) {
      const entries = []
      for (let i = 0; i < quantity; i++) {
        const ticketNumber = `${Date.now()}-${session.userId}-${i}`
        const entry = await sql`
          INSERT INTO raffle_entries (
            raffle_id,
            user_id,
            ticket_number,
            payment_amount,
            payment_status
          ) VALUES (
            ${raffleId},
            ${session.userId},
            ${ticketNumber},
            0,
            'completed'
          )
          RETURNING *
        `
        entries.push(entry[0])
      }

      // Update tickets sold
      await sql`
        UPDATE raffles
        SET tickets_sold = tickets_sold + ${quantity}
        WHERE id = ${raffleId}
      `

      return NextResponse.json({ success: true, entries })
    }

    const stripeCustomerId = await getOrCreatePaymentGatewayCustomer(session.userId, eventId, "stripe", stripe, {
      email: session.email,
      name: session.name,
    })

    // Create Stripe checkout session for paid raffles
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${raffle.title} - Raffle Tickets`,
              description: `${quantity} ticket(s)`,
              images: raffle.image_url ? [raffle.image_url] : [],
            },
            unit_amount: Math.round(Number(raffle.ticket_price) * 100),
          },
          quantity,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/raffle/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/raffles`,
      customer: stripeCustomerId,
      metadata: {
        event_id: eventId,
        raffle_id: raffleId,
        user_id: session.userId,
        quantity: quantity.toString(),
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error("[v0] Error purchasing raffle tickets:", error)
    return NextResponse.json({ error: "Failed to purchase tickets" }, { status: 500 })
  }
}
