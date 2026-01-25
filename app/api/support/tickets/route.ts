import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.NEON_DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventId, userId, requesterName, requesterEmail, category, message } = body

    console.log("[v0] Creating support ticket with data:", { eventId, userId, requesterName, requesterEmail, category })

    if (!requesterName || !requesterEmail || !category || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Insert support ticket
    const result = await sql`
      INSERT INTO support_tickets (
        event_id,
        user_id,
        requester_name,
        requester_email,
        category,
        message,
        status
      ) VALUES (
        ${eventId || null},
        ${userId || null},
        ${requesterName},
        ${requesterEmail},
        ${category},
        ${message},
        'open'
      )
      RETURNING id, ticket_number
    `

    const ticket = result[0]
    console.log("[v0] Support ticket created:", { id: ticket.id, ticketNumber: ticket.ticket_number })

    try {
      if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
        console.error("[v0] SendGrid not configured - skipping email")
      } else {
        console.log("[v0] Attempting to send support ticket email...")

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">
              Support Ticket #${ticket.ticket_number}
            </h2>
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Category:</strong> ${category}</p>
              <p><strong>Requester:</strong> ${requesterName}</p>
              <p><strong>Email:</strong> ${requesterEmail}</p>
            </div>
            <div style="margin: 20px 0;">
              <h3 style="color: #333;">Message:</h3>
              <p style="line-height: 1.6; color: #555;">${message.replace(/\n/g, "<br>")}</p>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #888; font-size: 12px;">
              This email was sent from MySchoolAuction Support System.
            </p>
          </div>
        `

        const sendGridResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [
              {
                to: [{ email: "shoumbertllc@gmail.com" }],
                cc: [{ email: requesterEmail }],
              },
            ],
            from: { email: process.env.SENDGRID_FROM_EMAIL },
            subject: `MySchoolAuction - Support Ticket #${ticket.ticket_number}`,
            content: [
              {
                type: "text/html",
                value: emailHtml,
              },
            ],
          }),
        })

        if (!sendGridResponse.ok) {
          console.error("[v0] SendGrid error:", await sendGridResponse.text())
        } else {
          console.log("[v0] Support ticket email sent successfully")
        }
      }
    } catch (emailError) {
      console.error("[v0] Failed to send support ticket email:", emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
    })
  } catch (error) {
    console.error("[v0] Error creating support ticket:", error)
    return NextResponse.json({ error: "Failed to create support ticket" }, { status: 500 })
  }
}
