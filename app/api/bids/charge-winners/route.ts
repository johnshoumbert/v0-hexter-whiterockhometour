import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { sendEmail } from "@/lib/email"
import BidWinnerNotification from "@/emails/bid-winner-notification"
import BidPaymentFailure from "@/emails/bid-payment-failure"

async function getEventStripe(eventId: string): Promise<Stripe> {
  try {
    // Fetch event-specific Stripe config
    const result = await sql`
      SELECT value FROM event_settings 
      WHERE event_id = ${eventId} AND page = 'payment' AND object = 'stripe_config'
    `

    if (result && result.length > 0) {
      const config = result[0].value
      if (config.secret_key) {
        console.log("[v0] Using event-specific Stripe secret key")
        return new Stripe(config.secret_key, { apiVersion: "2024-11-20.acacia" })
      }
    }
  } catch (error) {
    console.error("[v0] Error fetching event Stripe config:", error)
  }

  // Fallback to environment variable
  console.log("[v0] Using environment variable Stripe secret key")
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe secret key not configured")
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" })
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user || !user.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { eventId } = await request.json()

    if (!eventId) {
      return NextResponse.json({ error: "Event ID is required" }, { status: 400 })
    }

    const stripe = await getEventStripe(eventId)

    // Get event settings
    const events = await sql`
      SELECT * FROM events WHERE id = ${eventId}
    `

    if (events.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    const event = events[0]

    if (!event.auto_charge) {
      return NextResponse.json({ error: "Auto-charge is not enabled for this event" }, { status: 400 })
    }

    // Find all winning bids for ended auctions in this event
    const winners = await sql`
      SELECT 
        b.id as bid_id,
        b.user_id,
        b.amount,
        b.stripe_payment_method_id,
        b.authorized,
        a.id as auction_id,
        a.title as auction_title,
        a.end_time,
        u.email as user_email,
        u.name as user_name,
        u.stripe_customer_id
      FROM bids b
      JOIN auctions a ON b.auction_id = a.id
      JOIN users u ON b.user_id = u.id
      WHERE a.event_id = ${eventId}
        AND a.status = 'ended'
        AND a.end_time < NOW()
        AND b.amount = (
          SELECT MAX(amount) 
          FROM bids 
          WHERE auction_id = a.id
        )
        AND b.authorized = true
        AND b.stripe_payment_method_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM payments 
          WHERE user_id = b.user_id 
            AND auction_id = a.id 
            AND status = 'succeeded'
        )
    `

    console.log("[v0] Found", winners.length, "winners to charge for event:", eventId)

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as any[],
    }

    // Process each winner
    for (const winner of winners) {
      try {
        console.log("[v0] Charging winner:", winner.user_email, "for auction:", winner.auction_title)

        // Create payment intent with saved payment method
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(Number(winner.amount) * 100), // Convert to cents
          currency: "usd",
          customer: winner.stripe_customer_id,
          payment_method: winner.stripe_payment_method_id,
          off_session: true,
          confirm: true,
          metadata: {
            application: "MySchoolAuction.com",
            auctionId: winner.auction_id,
            bidId: winner.bid_id,
            userId: winner.user_id,
            eventId: eventId,
            event_name: event.event_name,
          },
          description: `Payment for auction: ${winner.auction_title}`,
        })

        if (paymentIntent.status === "succeeded") {
          // Record payment
          await sql`
            INSERT INTO payments (user_id, auction_id, event_id, amount, stripe_payment_intent, status, created_at)
            VALUES (
              ${winner.user_id},
              ${winner.auction_id},
              ${eventId},
              ${winner.amount},
              ${paymentIntent.id},
              'succeeded',
              NOW()
            )
          `

          // Send success email
          await sendEmail({
            to: winner.user_email,
            subject: `Congratulations! You won: ${winner.auction_title}`,
            react: BidWinnerNotification({
              name: winner.user_name,
              auctionTitle: winner.auction_title,
              amount: Number(winner.amount),
              eventName: event.event_name,
            }),
          })

          results.successful++
          console.log("[v0] Successfully charged:", winner.user_email)
        } else {
          throw new Error(`Payment status: ${paymentIntent.status}`)
        }
      } catch (error: any) {
        console.error("[v0] Failed to charge winner:", winner.user_email, error)
        results.failed++
        results.errors.push({
          user: winner.user_email,
          auction: winner.auction_title,
          error: error.message,
        })

        // Send failure email to user
        await sendEmail({
          to: winner.user_email,
          subject: `Payment Required: ${winner.auction_title}`,
          react: BidPaymentFailure({
            name: winner.user_name,
            auctionTitle: winner.auction_title,
            amount: Number(winner.amount),
            eventName: event.event_name,
            reason: error.message,
          }),
        })

        // Record failed payment
        await sql`
          INSERT INTO payments (user_id, auction_id, event_id, amount, status, created_at)
          VALUES (
            ${winner.user_id},
            ${winner.auction_id},
            ${eventId},
            ${winner.amount},
            'failed',
            NOW()
          )
        `
      }
    }

    return NextResponse.json({
      message: "Winners charged",
      results,
    })
  } catch (error) {
    console.error("[v0] Charge winners error:", error)
    return NextResponse.json({ error: "Failed to charge winners" }, { status: 500 })
  }
}
