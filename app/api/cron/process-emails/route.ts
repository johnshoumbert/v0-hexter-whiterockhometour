import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Cron job endpoint for processing pending emails
// Schedule: 0 * * * * (every hour)
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    // Only verify secret if it's set in environment
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log("[v0] Unauthorized cron request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Starting email processing cron job")

    const sql = getDb()

    let pendingEmails: any[] = []
    try {
      pendingEmails = await sql`
        SELECT * FROM email_queue 
        WHERE status = 'pending' 
        ORDER BY created_at ASC 
        LIMIT 50
      `
    } catch (error: any) {
      if (error.code === "42P01") {
        // Table doesn't exist
        console.log("[v0] email_queue table doesn't exist yet")
        return NextResponse.json({
          message: "Email queue table not created yet. Run scripts/create-email-queue-v1.sql",
          processed: 0,
        })
      }
      throw error
    }

    console.log(`[v0] Found ${pendingEmails.length} pending emails`)

    const results = {
      processed: 0,
      success: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Check if SendGrid is configured
    if (!process.env.SENDGRID_API_KEY) {
      console.error("[v0] SendGrid API key not configured")
      return NextResponse.json({
        message: "SendGrid not configured. No emails processed.",
        results,
      })
    }

    // Load SendGrid
    const sgMail = await import("@sendgrid/mail")
    sgMail.default.setApiKey(process.env.SENDGRID_API_KEY)

    // Process each email
    for (const email of pendingEmails) {
      try {
        console.log(`[v0] Processing email ${email.id} to ${email.to_email}`)

        // Update status to processing
        await sql`
          UPDATE email_queue 
          SET status = 'processing', updated_at = NOW()
          WHERE id = ${email.id}
        `

        const message: any = {
          from: email.from_email,
          to: email.to_email,
          subject: email.subject,
        }

        // Use template or HTML content
        if (email.template_id) {
          message.templateId = email.template_id
          message.dynamicTemplateData = email.dynamic_template_data || {}
        } else {
          // Use HTML from dynamic_template_data or create a basic HTML email
          const htmlContent =
            email.dynamic_template_data?.html ||
            `
            <html>
              <body style="font-family: sans-serif; padding: 20px;">
                <h2>${email.subject}</h2>
                <p>${email.dynamic_template_data?.text || "No content provided"}</p>
              </body>
            </html>
          `
          message.html = htmlContent
        }

        if (email.attachments && Array.isArray(email.attachments)) {
          message.attachments = email.attachments.map((att: any) => ({
            filename: att.filename,
            content: att.content,
            type: att.contentType,
            disposition: "attachment",
          }))
          console.log(`[v0] Adding ${email.attachments.length} attachment(s) to email`)
        }

        // Send email
        const response = await sgMail.default.send(message)
        const messageId = response[0]?.headers?.["x-message-id"] || null

        console.log(`[v0] Email sent successfully: ${messageId}`)

        // Update status to sent
        await sql`
          UPDATE email_queue 
          SET 
            status = 'sent',
            sendgrid_message_id = ${messageId},
            processed_at = NOW(),
            updated_at = NOW()
          WHERE id = ${email.id}
        `

        results.success++
      } catch (error: any) {
        console.error(`[v0] Error sending email ${email.id}:`, error)

        // Update status to failed
        await sql`
          UPDATE email_queue 
          SET 
            status = 'failed',
            error_message = ${error.message || String(error)},
            processed_at = NOW(),
            updated_at = NOW()
          WHERE id = ${email.id}
        `

        results.failed++
        results.errors.push(`Email ${email.id}: ${error.message}`)
      }

      results.processed++
    }

    console.log("[v0] Email processing complete:", results)

    return NextResponse.json({
      success: true,
      ...results,
    })
  } catch (error: any) {
    console.error("[v0] Error in email processing cron:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
