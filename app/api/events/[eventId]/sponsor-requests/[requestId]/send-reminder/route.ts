import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/email"

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string; requestId: string }> }) {
  try {
    const { eventId, requestId } = await params

    const requestData = await sql`
      SELECT sr.*, sl.amount as level_amount
      FROM sponsor_requests sr
      LEFT JOIN sponsor_levels sl ON sl.event_id = sr.event_id AND sl.level = sr.sponsorship_level
      WHERE sr.id = ${requestId} AND sr.event_id = ${eventId} AND sr.payment_method = 'pay_later'
      LIMIT 1
    `

    if (requestData.length === 0) {
      return NextResponse.json({ error: "Sponsor request not found" }, { status: 404 })
    }

    const sponsorRequest = requestData[0]
    const amount = sponsorRequest.custom_amount || sponsorRequest.level_amount

    const eventData = await sql`SELECT event_name, domain FROM events WHERE id = ${eventId} LIMIT 1`
    const event = eventData[0]

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://myschoolauction.com"
    const eventDomain = event?.domain ? `https://${event.domain}` : appUrl
    const payNowUrl = `${eventDomain}/sponsor/checkout/${requestId}`

    await sendEmail({
      to: sponsorRequest.contact_email,
      subject: `Payment Reminder - ${event?.event_name} Sponsorship`,
      templateId: process.env.SENDGRID_SPONSOR_REMINDER_TEMPLATE_ID || "",
      dynamicTemplateData: {
        eventTitle: event?.event_name,
        companyName: sponsorRequest.company_name,
        sponsorshipLevel: sponsorRequest.sponsorship_level,
        amount: amount,
        payNowUrl: payNowUrl,
      },
    })

    await sql`
      UPDATE sponsor_requests
      SET reminder_emails_sent = COALESCE(reminder_emails_sent, 0) + 1,
          last_reminder_sent_at = CURRENT_TIMESTAMP
      WHERE id = ${requestId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error sending reminder:", error)
    return NextResponse.json({ error: "Failed to send reminder" }, { status: 500 })
  }
}
