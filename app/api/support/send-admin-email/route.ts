import { type NextRequest, NextResponse } from "next/server"
import sgMail from "@sendgrid/mail"

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

export async function POST(request: NextRequest) {
  try {
    const { to, adminName, userName, userEmail, message } = await request.json()

    if (!process.env.SENDGRID_API_KEY) {
      console.error("[v0] SendGrid API key not configured")
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 })
    }

    const emailContent = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com",
      replyTo: userEmail,
      subject: `New Message from ${userName} via MySchoolAuction`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">
            New Message from Event Attendee
          </h2>
          <p>Hi ${adminName},</p>
          <p>You have received a new message from an event attendee:</p>
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>From:</strong> ${userName}</p>
            <p><strong>Email:</strong> ${userEmail}</p>
          </div>
          <div style="margin: 20px 0;">
            <h3 style="color: #333;">Message:</h3>
            <p style="line-height: 1.6; color: #555;">${message.replace(/\n/g, "<br>")}</p>
          </div>
          <p>You can reply directly to this email to respond to ${userName}.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #888; font-size: 12px;">
            This email was sent from MySchoolAuction.
          </p>
        </div>
      `,
    }

    await sgMail.send(emailContent)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error sending admin email:", error)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}
