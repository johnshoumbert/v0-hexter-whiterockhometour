import { type NextRequest, NextResponse } from "next/server"
import sgMail from "@sendgrid/mail"

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

export async function POST(request: NextRequest) {
  try {
    const { to, cc, subject, ticketNumber, requesterName, requesterEmail, category, message } = await request.json()

    console.log("[v0] Preparing to send email:", { to, cc, subject })

    if (!process.env.SENDGRID_API_KEY) {
      console.error("[v0] SendGrid API key not configured")
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 })
    }

    if (!process.env.SENDGRID_FROM_EMAIL) {
      console.error("[v0] SendGrid FROM email not configured")
      return NextResponse.json({ error: "Email service not configured properly" }, { status: 500 })
    }

    console.log("[v0] Using SendGrid FROM email:", process.env.SENDGRID_FROM_EMAIL)

    const emailContent = {
      to,
      cc,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">
            Support Ticket #${ticketNumber}
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
      `,
    }

    console.log("[v0] Sending email via SendGrid...")
    await sgMail.send(emailContent)
    console.log("[v0] Email sent successfully via SendGrid")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error sending support email:", error)
    // Log more details about the error
    if (error && typeof error === "object" && "response" in error) {
      console.error("[v0] SendGrid error response:", (error as any).response?.body)
    }
    return NextResponse.json({ error: "Failed to send email", details: String(error) }, { status: 500 })
  }
}
