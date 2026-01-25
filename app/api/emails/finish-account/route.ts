import { NextResponse } from "next/server"
import { sendEmail } from "@/lib/email"
import { sql } from "@/lib/db"

// Send "Finish Creating Your Account" email
export async function POST(request: Request) {
  try {
    const { email, name, userId } = await request.json()

    if (!email || !name) {
      return NextResponse.json({ error: "Email and name are required" }, { status: 400 })
    }

    const sendResult = await sendEmail({
      to: email,
      subject: "Finish Creating Your MySchoolAuction Account",
      templateName: "finish-account",
      dynamicTemplateData: {
        name,
        userId: userId || "",
      },
    })

    const status = sendResult.success ? "sent" : "failed"
    const errorMessage = !sendResult.success ? sendResult.error : null

    const templateResult = await sql`
      SELECT template_id FROM email_templates 
      WHERE email_task = 'finish-account' 
      AND is_active = true
      LIMIT 1
    `
    const templateId = templateResult[0]?.template_id || "d-finish-account"

    await sql`
      INSERT INTO email_queue (
        template_id, subject, to_email, from_email,
        dynamic_template_data, status, error_message
      )
      VALUES (
        ${templateId},
        'Finish Creating Your MySchoolAuction Account',
        ${email},
        ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
        jsonb_build_object(
          'name', ${name},
          'userId', ${userId || ""}
        ),
        ${status},
        ${errorMessage}
      )
    `

    if (!sendResult.success) {
      console.warn("[v0] Email sending failed, but recorded in queue:", sendResult.error)
    }

    return NextResponse.json({
      success: sendResult.success,
      message: sendResult.success ? "Email sent" : "Email queued with error",
    })
  } catch (error: any) {
    console.error("[v0] Error sending finish account email:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
