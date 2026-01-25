import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Cron job to close auctions and send notifications
// Schedule: */5 * * * * (every 5 minutes to check for closing auctions)
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    // Only verify secret if it's set in environment
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log("[v0] Unauthorized cron request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Starting auction close cron job")

    const sql = getDb()

    const templates = await sql`
      SELECT name, sendgrid_template_id FROM email_templates 
      WHERE name IN ('winner_notification', 'payment_reminder')
    `
    const winnerTemplateId =
      templates.find((t: any) => t.name === "winner_notification")?.sendgrid_template_id || "d-winner-template"
    const paymentReminderTemplateId =
      templates.find((t: any) => t.name === "payment_reminder")?.sendgrid_template_id || "d-payment-reminder"

    const eventsToClose = await sql`
      SELECT id, event_name, end_date
      FROM events
      WHERE end_date < NOW()
        AND closed_date IS NULL
        AND status = 'active'
    `

    console.log(`[v0] Found ${eventsToClose.length} events to close`)

    const results = {
      eventsClosed: 0,
      winnersNotified: 0,
      pendingPayments: 0,
    }

    for (const event of eventsToClose) {
      console.log(`[v0] Processing event: ${event.event_name}`)

      const endedAuctions = await sql`
        SELECT a.id, a.title, a.end_time, a.current_bid
        FROM auctions a
        WHERE a.event_id = ${event.id}
          AND a.end_time < NOW()
          AND a.status = 'active'
      `

      for (const auction of endedAuctions) {
        // Find the winning bid
        const winningBid = await sql`
          SELECT b.*, u.email, u.name as user_name
          FROM bids b
          JOIN users u ON b.user_id = u.id
          WHERE b.auction_id = ${auction.id}
          ORDER BY b.amount DESC
          LIMIT 1
        `

        if (winningBid.length > 0) {
          const winner = winningBid[0]

          // Check if winner record already exists
          const existingWinner = await sql`
            SELECT id FROM winners
            WHERE auction_id = ${auction.id} AND user_id = ${winner.user_id}
          `

          if (existingWinner.length === 0) {
            // Create winner record
            await sql`
              INSERT INTO winners (
                auction_id, user_id, event_id, final_bid, 
                payment_status, created_at
              )
              VALUES (
                ${auction.id}, ${winner.user_id}, ${event.id}, 
                ${winner.amount}, 'pending', NOW()
              )
            `

            await sql`
              INSERT INTO email_queue (
                template_id, subject, to_email, from_email, 
                dynamic_template_data, status
              )
              VALUES (
                ${winnerTemplateId},
                'Congratulations! You Won: ' || ${auction.title},
                ${winner.email},
                ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
                jsonb_build_object(
                  'name', ${winner.user_name},
                  'auctionTitle', ${auction.title},
                  'amount', ${winner.amount},
                  'eventName', ${event.event_name}
                ),
                'pending'
              )
            `

            results.winnersNotified++

            if (!winner.stripe_payment_method_id) {
              await sql`
                INSERT INTO email_queue (
                  template_id, subject, to_email, from_email,
                  dynamic_template_data, status
                )
                VALUES (
                  ${paymentReminderTemplateId},
                  'Payment Required for: ' || ${auction.title},
                  ${winner.email},
                  ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
                  jsonb_build_object(
                    'name', ${winner.user_name},
                    'auctionTitle', ${auction.title},
                    'amount', ${winner.amount},
                    'eventName', ${event.event_name}
                  ),
                  'pending'
                )
              `
              results.pendingPayments++
            }
          }
        }

        // Update auction status to ended
        await sql`
          UPDATE auctions
          SET status = 'ended'
          WHERE id = ${auction.id}
        `
      }

      await sql`
        UPDATE events
        SET closed_date = NOW()
        WHERE id = ${event.id}
      `

      results.eventsClosed++
    }

    console.log("[v0] Auction close job complete:", results)

    return NextResponse.json({
      success: true,
      ...results,
    })
  } catch (error: any) {
    console.error("[v0] Error in auction close cron:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
