import { type NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  console.log("[v0] Contact API route called")
  try {
    const body = await request.json()
    const { name, email, subject, message } = body

    console.log("[v0] Contact form submission:", { name, email, subject })

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
            .content { background-color: #ffffff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #555; }
            .value { margin-top: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>New Contact Form Submission</h2>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">From:</div>
                <div class="value">${name} (${email})</div>
              </div>
              <div class="field">
                <div class="label">Subject:</div>
                <div class="value">${subject}</div>
              </div>
              <div class="field">
                <div class="label">Message:</div>
                <div class="value">${message || 'No message provided'}</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    console.log("[v0] Attempting to send email notifications")
    const results = await Promise.all([
      sendEmail({
        to: "support@myschoolauction.com",
        subject: `Contact Form: ${subject}`,
        html: emailHtml,
      }),
      sendEmail({
        to: "john.shoumbert@gmail.com",
        subject: `Contact Form: ${subject}`,
        html: emailHtml,
      }),
    ])

    console.log("[v0] Email send results:", results)

    const allSuccess = results.every((r) => r.success)
    if (!allSuccess) {
      console.warn(
        "[v0] Some emails failed to send:",
        results.filter((r) => !r.success),
      )
    } else {
      console.log("[v0] All emails sent successfully")
    }

    return NextResponse.json({
      success: true,
      message: "Thank you for contacting us! We will get back to you soon.",
      emailResults: results,
    })
  } catch (error) {
    console.error("[v0] Error processing contact form:", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}
