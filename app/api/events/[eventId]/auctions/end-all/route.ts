import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { sendEmail } from "@/lib/email"
import { getEventStripe } from "@/lib/stripe"

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const user = await getSession()
    if (!user || (!user.is_admin && !user.isEventAdmin)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { eventId } = await params

    // Get event details
    const events = await sql`
      SELECT * FROM events WHERE id = ${eventId}
    `

    if (events.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    const event = events[0]
    const isManualInvoice = event.invoice_enabled

    console.log("[v0] Ending all auctions for event:", event.event_name)
    console.log("[v0] Invoice enabled:", isManualInvoice)

    await sql`
      UPDATE bids 
      SET is_winning_bid = FALSE
      WHERE event_id = ${eventId}
        AND is_winning_bid = TRUE
    `

    // Update all auction items for this event to ended status
    await sql`
      UPDATE auctions 
      SET status = 'ended', end_time = NOW()
      WHERE event_id = ${eventId} 
        AND status != 'ended'
    `

    await sql`
      UPDATE bids 
      SET is_winning_bid = TRUE
      WHERE id IN (
        SELECT DISTINCT ON (b.auction_id) b.id
        FROM bids b
        JOIN auctions a ON b.auction_id = a.id
        WHERE a.event_id = ${eventId}
          AND a.status = 'ended'
        ORDER BY b.auction_id, b.amount DESC, b.created_at ASC
      )
    `

    // Get all winning bids
    const winners = await sql`
      SELECT 
        b.id as bid_id,
        b.user_id,
        b.amount,
        b.stripe_payment_method_id,
        b.authorized,
        b.auction_id,
        a.title as auction_title,
        u.email as user_email,
        u.name as user_name,
        u.stripe_customer_id
      FROM bids b
      JOIN auctions a ON b.auction_id = a.id
      JOIN users u ON b.user_id = u.id
      WHERE b.is_winning_bid = TRUE
        AND a.event_id = ${eventId}
    `

    console.log("[v0] Found", winners.length, "winners")

    const results = {
      totalWinners: winners.length,
      charged: 0,
      failed: 0,
      skipped: 0,
      errors: [] as any[],
    }

    // If NOT manual invoice, charge winners with saved payment methods
    if (!isManualInvoice) {
      const stripe = await getEventStripe(eventId)

      for (const winner of winners) {
        // Only charge if authorized and has payment method
        if (!winner.authorized || !winner.stripe_payment_method_id || !winner.stripe_customer_id) {
          results.skipped++
          console.log("[v0] Skipping winner (not authorized):", winner.user_email)
          continue
        }

        // Check if already paid
        const existingPayment = await sql`
          SELECT * FROM payments 
          WHERE user_id = ${winner.user_id} 
            AND auction_id = ${winner.auction_id} 
            AND status = 'succeeded'
        `

        if (existingPayment.length > 0) {
          results.skipped++
          console.log("[v0] Skipping winner (already paid):", winner.user_email)
          continue
        }

        try {
          console.log("[v0] Charging winner:", winner.user_email, "for", winner.auction_title)

          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(Number(winner.amount) * 100),
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
            await sql`
              INSERT INTO payments (
                user_id, 
                auction_id, 
                event_id, 
                amount, 
                stripe_payment_intent, 
                status, 
                created_at
              )
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

            results.charged++
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

          await sql`
            INSERT INTO payments (
              user_id, 
              auction_id, 
              event_id, 
              amount, 
              status, 
              created_at
            )
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
    } else {
      results.skipped = winners.length
      console.log("[v0] Skipped charging (manual invoice mode)")
    }

    // Send winner notification emails
    const templates = await sql`
      SELECT template_id FROM email_templates 
      WHERE email_task = 'auction-ended'
      LIMIT 1
    `

    const templateId = templates.length > 0 ? templates[0].template_id : null

    for (const winner of winners) {
      try {
        await sendEmail({
          to: winner.user_email,
          templateId: templateId,
          dynamicTemplateData: {
            name: winner.user_name,
            auctionTitle: winner.auction_title,
            amount: Number(winner.amount).toFixed(2),
            eventName: event.event_name,
          },
        })
      } catch (emailError) {
        console.error("[v0] Failed to send winner email:", emailError)
      }
    }

    return NextResponse.json({
      message: "All auctions ended successfully",
      results,
    })
  } catch (error) {
    console.error("[v0] End all auctions error:", error)
    return NextResponse.json(
      {
        error: "Failed to end auctions",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
