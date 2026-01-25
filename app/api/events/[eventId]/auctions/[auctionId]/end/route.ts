import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { sendEmail } from "@/lib/email"

async function getEventStripe(eventId: string): Promise<Stripe> {
  try {
    const result = await sql`
      SELECT value FROM event_settings 
      WHERE event_id = ${eventId} AND page = 'payment' AND object = 'stripe_config'
    `

    if (result && result.length > 0) {
      const config = result[0].value
      if (config.secret_key) {
        return new Stripe(config.secret_key, { apiVersion: "2024-11-20.acacia" })
      }
    }
  } catch (error) {
    console.error("[v0] Error fetching event Stripe config:", error)
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe secret key not configured")
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; auctionId: string }> },
) {
  try {
    const user = await getSession()
    if (!user || (!user.is_admin && !user.isEventAdmin)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { eventId, auctionId } = await params

    // Get event details
    const events = await sql`
      SELECT * FROM events WHERE id = ${eventId}
    `

    if (events.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    const event = events[0]
    const eventDomain = event.domain
      ? `https://${event.domain}`
      : process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin")

    // Get auction details
    const auctions = await sql`
      SELECT * FROM auctions WHERE id = ${auctionId} AND event_id = ${eventId}
    `

    if (auctions.length === 0) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 })
    }

    const auction = auctions[0]

    // End the auction by setting end_time to now
    await sql`
      UPDATE auctions 
      SET end_time = NOW(), status = 'ended'
      WHERE id = ${auctionId}
    `

    // Find the winning bid
    const winningBids = await sql`
      SELECT 
        b.id as bid_id,
        b.user_id,
        b.amount,
        b.stripe_payment_method_id,
        b.authorized,
        u.email as user_email,
        u.name as user_name,
        u.stripe_customer_id
      FROM bids b
      JOIN users u ON b.user_id = u.id
      WHERE b.auction_id = ${auctionId}
      ORDER BY b.amount DESC
      LIMIT 1
    `

    if (winningBids.length === 0) {
      return NextResponse.json({
        message: "Auction ended successfully (no bids placed)",
      })
    }

    const winner = winningBids[0]

    // Fetch the email template for auction-ended
    const templates = await sql`
      SELECT template_id FROM email_templates 
      WHERE email_task = 'auction-ended'
      LIMIT 1
    `

    const templateId = templates.length > 0 ? templates[0].template_id : null

    // Send winner notification email
    try {
      await sendEmail({
        to: winner.user_email,
        templateId: templateId,
        dynamicTemplateData: {
          name: winner.user_name,
          auctionTitle: auction.title,
          amount: Number(winner.amount).toFixed(2),
          eventName: event.event_name,
          link: `${eventDomain}/user/wins`,
        },
      })

      // Record email in queue
      await sql`
        INSERT INTO email_queue (
          to_email, 
          from_email,
          template_id, 
          subject,
          dynamic_template_data, 
          status, 
          created_at
        )
        VALUES (
          ${winner.user_email},
          ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
          ${templateId},
          'You Won! Auction Ended',
          ${JSON.stringify({
            name: winner.user_name,
            auctionTitle: auction.title,
            amount: Number(winner.amount).toFixed(2),
            eventName: event.event_name,
            link: `${eventDomain}/user/wins`,
          })}::jsonb,
          'sent',
          NOW()
        )
      `
    } catch (emailError) {
      console.error("[v0] Failed to send winner email:", emailError)
    }

    // Attempt to charge winner if they authorized payment
    let paymentStatus = "not_attempted"
    let paymentMessage = ""

    if (winner.authorized && winner.stripe_payment_method_id && winner.stripe_customer_id) {
      try {
        const stripe = await getEventStripe(eventId)

        // Check if payment already exists
        const existingPayments = await sql`
          SELECT * FROM payments 
          WHERE user_id = ${winner.user_id} 
            AND auction_id = ${auctionId} 
            AND status = 'succeeded'
        `

        if (existingPayments.length === 0) {
          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(Number(winner.amount) * 100),
            currency: "usd",
            customer: winner.stripe_customer_id,
            payment_method: winner.stripe_payment_method_id,
            off_session: true,
            confirm: true,
            metadata: {
              application: "MySchoolAuction.com",
              auctionId: auctionId,
              bidId: winner.bid_id,
              userId: winner.user_id,
              eventId: eventId,
              event_name: event.event_name,
            },
            description: `Payment for auction: ${auction.title}`,
          })

          if (paymentIntent.status === "succeeded") {
            await sql`
              INSERT INTO payments (user_id, auction_id, event_id, amount, stripe_payment_intent, status, created_at)
              VALUES (
                ${winner.user_id},
                ${auctionId},
                ${eventId},
                ${winner.amount},
                ${paymentIntent.id},
                'succeeded',
                NOW()
              )
            `
            paymentStatus = "succeeded"
            paymentMessage = "Winner charged successfully"
          } else {
            paymentStatus = "failed"
            paymentMessage = `Payment status: ${paymentIntent.status}`
          }
        } else {
          paymentStatus = "already_paid"
          paymentMessage = "Winner already paid"
        }
      } catch (chargeError: any) {
        console.error("[v0] Failed to charge winner:", chargeError)
        paymentStatus = "failed"
        paymentMessage = chargeError.message || "Payment failed"

        await sql`
          INSERT INTO payments (user_id, auction_id, event_id, amount, status, created_at)
          VALUES (
            ${winner.user_id},
            ${auctionId},
            ${eventId},
            ${winner.amount},
            'failed',
            NOW()
          )
        `
      }
    } else {
      paymentMessage = "Winner has not authorized payment"
    }

    return NextResponse.json({
      message: "Auction ended successfully",
      winner: {
        email: winner.user_email,
        name: winner.user_name,
        amount: winner.amount,
      },
      payment: {
        status: paymentStatus,
        message: paymentMessage,
      },
    })
  } catch (error) {
    console.error("[v0] End auction error:", error)
    return NextResponse.json(
      { error: "Failed to end auction", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
