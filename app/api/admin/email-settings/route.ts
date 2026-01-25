import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

const EMAIL_TYPES = [
  {
    type: 'auction_ended_winner',
    name: 'Auction Ended - Winner',
    description: 'Sent to users who won an auction item',
    envVar: 'SENDGRID_AUCTION_WINNER_TEMPLATE_ID'
  },
  {
    type: 'auction_ended_payment_pending',
    name: 'Auction Ended - Payment Pending',
    description: 'Sent to winners with pending payment (risk of losing item)',
    envVar: 'SENDGRID_PAYMENT_PENDING_TEMPLATE_ID'
  },
  {
    type: 'auction_reminder_1hour',
    name: 'Auction Ending Soon - 1 Hour',
    description: 'Sent to all bidders 1 hour before auction ends',
    envVar: 'SENDGRID_REMINDER_1HOUR_TEMPLATE_ID'
  },
  {
    type: 'auction_reminder_30min',
    name: 'Auction Ending Soon - 30 Minutes',
    description: 'Sent to all bidders 30 minutes before auction ends',
    envVar: 'SENDGRID_REMINDER_30MIN_TEMPLATE_ID'
  },
  {
    type: 'auction_reminder_5min',
    name: 'Auction Ending Soon - 5 Minutes',
    description: 'Sent to all bidders 5 minutes before auction ends',
    envVar: 'SENDGRID_REMINDER_5MIN_TEMPLATE_ID'
  },
  {
    type: 'finish_account',
    name: 'Finish Creating Account',
    description: 'Sent to users who started registration but did not complete',
    envVar: 'SENDGRID_FINISH_ACCOUNT_TEMPLATE_ID'
  },
  {
    type: 'bid_confirmation',
    name: 'Bid Confirmation',
    description: 'Sent immediately after a user places a bid',
    envVar: 'SENDGRID_BID_CONFIRMATION_TEMPLATE_ID'
  },
  {
    type: 'outbid_notification',
    name: 'Outbid Notification',
    description: 'Sent when a user is outbid on an item',
    envVar: 'SENDGRID_OUTBID_TEMPLATE_ID'
  }
]

export async function GET(request: NextRequest) {
  try {
    const sql = getDb()

    // Get all events with their email settings
    const events = await sql`
      SELECT 
        e.id,
        e.event_name,
        json_agg(
          json_build_object(
            'email_type', es.email_type,
            'enabled', es.enabled,
            'template_id', es.template_id
          )
        ) as settings
      FROM events e
      LEFT JOIN email_settings es ON e.id = es.event_id
      GROUP BY e.id, e.event_name
      ORDER BY e.event_name
    `

    // Get global template IDs from environment variables
    const globalTemplates = EMAIL_TYPES.map(et => ({
      ...et,
      templateId: process.env[et.envVar] || null
    }))

    return NextResponse.json({ 
      emailTypes: EMAIL_TYPES,
      globalTemplates,
      events 
    })
  } catch (error) {
    console.error("[v0] Error fetching email settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch email settings" },
      { status: 500 }
    )
  }
}
