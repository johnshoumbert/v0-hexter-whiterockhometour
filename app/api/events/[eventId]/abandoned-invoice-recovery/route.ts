import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { sendEmail } from "@/lib/email"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request, { params }: { params: { eventId: string } }) {
  try {
    const { eventId } = await params
    const body = await request.json()
    const { secret } = body

    if (!secret) {
      return NextResponse.json({ error: "Secret key required" }, { status: 400 })
    }

    console.log(`[v0] Abandoned invoice recovery triggered for event: ${eventId}`)

    const sql = getDb()

    const eventCheck = await sql`
      SELECT id, event_name, recovery_secret
      FROM events
      WHERE id = ${eventId}
      LIMIT 1
    `

    if (eventCheck.length === 0) {
      console.log("[v0] Event not found")
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    if (eventCheck[0].recovery_secret !== secret) {
      console.log("[v0] Invalid secret key")
      return NextResponse.json({ error: "Invalid secret key" }, { status: 403 })
    }

    const templates = await sql`
      SELECT template_id FROM email_templates 
      WHERE email_task = 'abandoned-invoice-reminder' AND is_active = true
      LIMIT 1
    `

    if (templates.length === 0) {
      console.log("[v0] No abandoned invoice reminder template configured")
      return NextResponse.json({
        message: "Abandoned invoice reminder template not configured",
        remindersSent: 0,
      })
    }

    const templateId = templates[0].template_id

    const abandonedInvoices = await sql`
      SELECT DISTINCT
        pr.id as invoice_id,
        pr.invoice_number,
        pr.total_amount,
        pr.due_date,
        pr.created_at as invoice_created_at,
        pr.reminder_count,
        pr.last_reminder_sent_at,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        e.id as event_id,
        e.event_name,
        it_viewed.created_at as last_viewed_at,
        it_checkout.created_at as last_checkout_at
      FROM po_requests pr
      JOIN users u ON pr.user_id = u.id
      JOIN events e ON pr.event_id = e.id
      LEFT JOIN LATERAL (
        SELECT created_at
        FROM invoice_tracking
        WHERE invoice_id = pr.id AND event_type = 'viewed'
        ORDER BY created_at DESC
        LIMIT 1
      ) it_viewed ON true
      LEFT JOIN LATERAL (
        SELECT created_at
        FROM invoice_tracking
        WHERE invoice_id = pr.id AND event_type = 'checkout_started'
        ORDER BY created_at DESC
        LIMIT 1
      ) it_checkout ON true
      WHERE pr.event_id = ${eventId}
        AND pr.status = 'pending'
        AND it_viewed.created_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM invoice_tracking
          WHERE invoice_id = pr.id AND event_type = 'payment_completed'
        )
        AND (
          (pr.reminder_count = 0 AND it_viewed.created_at < NOW() - INTERVAL '24 hours')
          OR (pr.reminder_count = 1 AND pr.last_reminder_sent_at < NOW() - INTERVAL '3 days')
          OR (pr.reminder_count = 2 AND pr.last_reminder_sent_at < NOW() - INTERVAL '5 days')
        )
        AND pr.reminder_count < 3
        AND (pr.due_date IS NULL OR pr.due_date > NOW())
    `

    console.log(`[v0] Found ${abandonedInvoices.length} abandoned invoices for event ${eventId}`)

    const results = {
      remindersSent: 0,
      errors: [] as string[],
    }

    const host = request.headers.get("host") || "myschoolauction.com"
    const protocol = request.headers.get("x-forwarded-proto") || "https"

    for (const invoice of abandonedInvoices) {
      try {
        const paymentUrl = `${protocol}://${host}/pay/${invoice.invoice_number}`
        const daysAgo = Math.floor((Date.now() - new Date(invoice.last_viewed_at).getTime()) / (1000 * 60 * 60 * 24))

        let reminderType = "first"
        if (invoice.reminder_count === 1) reminderType = "second"
        if (invoice.reminder_count === 2) reminderType = "final"

        const templateData = {
          name: invoice.user_name,
          invoiceNumber: invoice.invoice_number,
          amount: Number(invoice.total_amount).toFixed(2),
          link: paymentUrl,
          eventName: invoice.event_name,
          daysAgo: daysAgo.toString(),
          reminderType: reminderType,
          dueDate: invoice.due_date
            ? new Date(invoice.due_date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : null,
        }

        console.log(`[v0] Sending ${reminderType} reminder for invoice ${invoice.invoice_number}`)

        const emailResult = await sendEmail({
          to: invoice.user_email,
          subject: `Reminder: Complete Your Payment - ${invoice.event_name}`,
          templateId: templateId,
          dynamicTemplateData: templateData,
        })

        const emailStatus = emailResult.success ? "sent" : "failed"

        await sql`
          INSERT INTO email_queue (
            to_email, from_email, subject, template_id, dynamic_template_data,
            status, error_message, created_at
          )
          VALUES (
            ${invoice.user_email},
            ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
            ${"Reminder: Complete Your Payment - " + invoice.event_name},
            ${templateId},
            ${JSON.stringify(templateData)},
            ${emailStatus},
            ${!emailResult.success ? emailResult.error : null},
            NOW()
          )
        `

        if (emailResult.success) {
          await sql`
            UPDATE po_requests
            SET 
              last_reminder_sent_at = NOW(),
              reminder_count = reminder_count + 1
            WHERE id = ${invoice.invoice_id}
          `

          results.remindersSent++
        } else {
          results.errors.push(`Invoice ${invoice.invoice_number}: ${emailResult.error}`)
        }
      } catch (error: any) {
        console.error(`[v0] Error processing invoice ${invoice.invoice_number}:`, error)
        results.errors.push(`Invoice ${invoice.invoice_number}: ${error.message}`)
      }
    }

    console.log("[v0] Abandoned invoice recovery complete:", results)

    return NextResponse.json({
      success: true,
      eventId,
      ...results,
    })
  } catch (error: any) {
    console.error("[v0] Error in abandoned invoice recovery:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
