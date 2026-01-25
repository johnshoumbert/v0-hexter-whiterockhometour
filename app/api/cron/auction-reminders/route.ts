import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Cron job to send auction ending reminders
// Schedule: */5 * * * * (every 5 minutes to check for upcoming auction endings)
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log("[v0] Unauthorized cron request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Starting auction reminder cron job")

    const sql = getDb()

    const templateResult = await sql`
      SELECT sendgrid_template_id FROM email_templates WHERE name = 'auction_reminder' LIMIT 1
    `
    const templateId = templateResult[0]?.sendgrid_template_id || "d-auction-reminder"

    const results = {
      oneHourReminders: 0,
      thirtyMinReminders: 0,
      fiveMinReminders: 0,
    }

    const oneHourAuctions = await sql`
      SELECT a.id, a.title, a.end_time, a.event_id, e.event_name
      FROM auctions a
      JOIN events e ON a.event_id = e.id
      WHERE a.status = 'active'
        AND a.end_time > NOW() + INTERVAL '55 minutes'
        AND a.end_time < NOW() + INTERVAL '65 minutes'
    `

    const thirtyMinAuctions = await sql`
      SELECT a.id, a.title, a.end_time, a.event_id, e.event_name
      FROM auctions a
      JOIN events e ON a.event_id = e.id
      WHERE a.status = 'active'
        AND a.end_time > NOW() + INTERVAL '28 minutes'
        AND a.end_time < NOW() + INTERVAL '32 minutes'
    `

    const fiveMinAuctions = await sql`
      SELECT a.id, a.title, a.end_time, a.event_id, e.event_name
      FROM auctions a
      JOIN events e ON a.event_id = e.id
      WHERE a.status = 'active'
        AND a.end_time > NOW() + INTERVAL '4 minutes'
        AND a.end_time < NOW() + INTERVAL '6 minutes'
    `

    for (const auction of oneHourAuctions) {
      // Get all bidders for this auction
      const bidders = await sql`
        SELECT DISTINCT u.email, u.name
        FROM bids b
        JOIN users u ON b.user_id = u.id
        WHERE b.auction_id = ${auction.id}
      `

      for (const bidder of bidders) {
        await sql`
          INSERT INTO email_queue (
            template_id, subject, to_email, from_email,
            dynamic_template_data, status
          )
          VALUES (
            ${templateId},
            'Auction Ending in 1 Hour: ' || ${auction.title},
            ${bidder.email},
            ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
            jsonb_build_object(
              'name', ${bidder.name},
              'auctionTitle', ${auction.title},
              'timeRemaining', '1 hour',
              'eventName', ${auction.event_name}
            ),
            'pending'
          )
        `
      }
      results.oneHourReminders += bidders.length
    }

    for (const auction of thirtyMinAuctions) {
      const bidders = await sql`
        SELECT DISTINCT u.email, u.name
        FROM bids b
        JOIN users u ON b.user_id = u.id
        WHERE b.auction_id = ${auction.id}
      `

      for (const bidder of bidders) {
        await sql`
          INSERT INTO email_queue (
            template_id, subject, to_email, from_email,
            dynamic_template_data, status
          )
          VALUES (
            ${templateId},
            'Auction Ending in 30 Minutes: ' || ${auction.title},
            ${bidder.email},
            ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
            jsonb_build_object(
              'name', ${bidder.name},
              'auctionTitle', ${auction.title},
              'timeRemaining', '30 minutes',
              'eventName', ${auction.event_name}
            ),
            'pending'
          )
        `
      }
      results.thirtyMinReminders += bidders.length
    }

    for (const auction of fiveMinAuctions) {
      const bidders = await sql`
        SELECT DISTINCT u.email, u.name
        FROM bids b
        JOIN users u ON b.user_id = u.id
        WHERE b.auction_id = ${auction.id}
      `

      for (const bidder of bidders) {
        await sql`
          INSERT INTO email_queue (
            template_id, subject, to_email, from_email,
            dynamic_template_data, status
          )
          VALUES (
            ${templateId},
            'Last Chance! Auction Ending in 5 Minutes: ' || ${auction.title},
            ${bidder.email},
            ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
            jsonb_build_object(
              'name', ${bidder.name},
              'auctionTitle', ${auction.title},
              'timeRemaining', '5 minutes',
              'eventName', ${auction.event_name}
            ),
            'pending'
          )
        `
      }
      results.fiveMinReminders += bidders.length
    }

    console.log("[v0] Auction reminder job complete:", results)

    return NextResponse.json({
      success: true,
      ...results,
    })
  } catch (error: any) {
    console.error("[v0] Error in auction reminder cron:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
