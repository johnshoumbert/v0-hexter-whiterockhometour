import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { sendEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const { userId, email, name, temporaryPassword } = await request.json()

    if (!userId || !email || !name || !temporaryPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const tokenId = crypto.randomUUID()
    const resetToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await sql`
      INSERT INTO password_reset_tokens (
        token_id, email, reset_token, expires_at, created_at
      )
      VALUES (
        ${tokenId}, ${email}, ${resetToken}, ${expiresAt.toISOString()}, NOW()
      )
    `

    const appDomain = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const magicLink = `${appDomain}/kiosk/verify?token=${resetToken}`

    const sendResult = await sendEmail({
      to: email,
      subject: "Complete Your Event Registration",
      templateName: "kiosk-registration",
      dynamicTemplateData: {
        name,
        temporaryPassword,
        magicLink,
      },
    })

    const emailStatus = sendResult.success ? "sent" : "failed"
    const errorMessage = !sendResult.success ? sendResult.error : null

    const dynamicData = JSON.stringify({
      name,
      temporaryPassword,
      magicLink,
    })

    await sql`
      INSERT INTO email_queue (
        template_id, subject, to_email, from_email,
        dynamic_template_data, status, error_message
      )
      VALUES (
        'kiosk-registration',
        'Complete Your Event Registration',
        ${email},
        ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
        ${dynamicData}::jsonb,
        ${emailStatus},
        ${errorMessage}
      )
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error sending magic link:", error)
    return NextResponse.json({ error: "Failed to send magic link" }, { status: 500 })
  }
}
