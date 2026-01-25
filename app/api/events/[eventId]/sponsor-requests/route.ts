import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { sendEmail } from "@/lib/email"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params

    const requests = await sql`
      SELECT 
        sr.*,
        pr.id as invoice_id,
        pr.invoice_number,
        CASE
          WHEN pr.status = 'paid' OR pr.status = 'succeeded' OR pr.status = 'completed' THEN 'paid'
          WHEN pr.id IS NOT NULL THEN pr.status
          ELSE 'unpaid'
        END as payment_status
      FROM sponsor_requests sr
      LEFT JOIN po_requests pr ON pr.item_description LIKE '%' || sr.id || '%' AND pr.event_id = sr.event_id
      WHERE sr.event_id = ${eventId}
      ORDER BY sr.created_at DESC
    `

    return NextResponse.json({ requests })
  } catch (error: any) {
    console.error("[v0] Error fetching sponsor requests:", error)

    if (error.message?.includes("relation") && error.message?.includes("does not exist")) {
      return NextResponse.json({ requests: [] })
    }

    return NextResponse.json({ error: "Failed to fetch sponsor requests" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { eventId } = await params
    const body = await request.json()

    const result = await sql`
      INSERT INTO sponsor_requests (
        event_id,
        user_id,
        contact_name,
        contact_email,
        contact_phone,
        company_name,
        company_address,
        company_website,
        sponsorship_level,
        custom_amount,
        payment_method,
        logo_url,
        notes
      ) VALUES (
        ${eventId},
        ${session.userId},
        ${body.contact_name},
        ${body.contact_email},
        ${body.contact_phone || null},
        ${body.company_name},
        ${body.company_address || null},
        ${body.company_website || null},
        ${body.sponsorship_level},
        ${body.custom_amount || null},
        ${body.payment_method},
        ${body.logo_url || null},
        ${body.notes || null}
      )
      RETURNING *
    `

    const sponsorRequest = result[0]

    const eventResult = await sql`
      SELECT event_name, start_date FROM events WHERE id = ${eventId} LIMIT 1
    `
    const event = eventResult[0]

    const adminEmails = await sql`
      SELECT u.email 
      FROM event_admins ea
      JOIN users u ON ea.user_id = u.id
      WHERE ea.event_id = ${eventId} AND u.email IS NOT NULL
    `
    const eventAdminEmail = adminEmails[0]?.email || process.env.SENDGRID_FROM_EMAIL || "admin@myschoolauction.com"

    // Send requestor email only for "pay_later" payment method
    if (body.payment_method === "pay_later") {
      const requestorTemplateResult = await sql`
        SELECT template_id FROM email_templates 
        WHERE email_task = 'new-sponsor-request-requestor'
        AND is_active = true
        LIMIT 1
      `

      if (requestorTemplateResult.length > 0) {
        const requestorEmailResult = await sendEmail({
          to: body.contact_email,
          subject: "Sponsorship Request Received - Payment Required",
          templateName: "new-sponsor-request-requestor",
          dynamicTemplateData: {
            contact_name: body.contact_name,
            company_name: body.company_name,
            sponsorship_level: body.sponsorship_level,
            event_name: event?.event_name || "Event",
            payment_method: body.payment_method,
            admin_email: eventAdminEmail,
            request_id: sponsorRequest.id,
          },
        })

        const requestorTemplateId = requestorTemplateResult[0].template_id

        await sql`
          INSERT INTO email_queue (
            template_id, subject, to_email, from_email,
            dynamic_template_data, status, error_message
          )
          VALUES (
            ${requestorTemplateId},
            'Sponsorship Request Received - Payment Required',
            ${body.contact_email},
            ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
            ${JSON.stringify({
              contact_name: body.contact_name,
              company_name: body.company_name,
              sponsorship_level: body.sponsorship_level,
              event_name: event?.event_name || "Event",
              payment_method: body.payment_method,
              admin_email: eventAdminEmail,
              request_id: sponsorRequest.id,
            })}::jsonb,
            ${requestorEmailResult.success ? "sent" : "failed"},
            ${!requestorEmailResult.success ? requestorEmailResult.error : null}
          )
        `
      } else {
        console.log("[v0] Requestor email template not configured, skipping requestor notification email")
      }
    }

    // Check if admin email template exists
    const adminTemplateResult = await sql`
      SELECT template_id FROM email_templates 
      WHERE email_task = 'new-sponsor-request-admin'
      AND is_active = true
      LIMIT 1
    `

    if (adminTemplateResult.length > 0) {
      const adminEmailResult = await sendEmail({
        to: eventAdminEmail,
        subject: "New Sponsorship Request",
        templateName: "new-sponsor-request-admin",
        dynamicTemplateData: {
          contact_name: body.contact_name,
          contact_email: body.contact_email,
          company_name: body.company_name,
          sponsorship_level: body.sponsorship_level,
          event_name: event?.event_name || "Event",
          payment_method: body.payment_method,
          request_id: sponsorRequest.id,
        },
      })

      const adminTemplateId = adminTemplateResult[0].template_id

      await sql`
        INSERT INTO email_queue (
          template_id, subject, to_email, from_email,
          dynamic_template_data, status, error_message
        )
        VALUES (
          ${adminTemplateId},
          'New Sponsorship Request',
          ${eventAdminEmail},
          ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
          ${JSON.stringify({
            contact_name: body.contact_name,
            contact_email: body.contact_email,
            company_name: body.company_name,
            sponsorship_level: body.sponsorship_level,
            event_name: event?.event_name || "Event",
            payment_method: body.payment_method,
            request_id: sponsorRequest.id,
          })}::jsonb,
          ${adminEmailResult.success ? "sent" : "failed"},
          ${!adminEmailResult.success ? adminEmailResult.error : null}
        )
      `
    } else {
      console.log("[v0] Admin sponsor email template not configured, skipping admin notification email")
    }

    return NextResponse.json(
      {
        id: sponsorRequest.id,
        request: sponsorRequest,
        event_admin_email: eventAdminEmail,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[v0] Error creating sponsor request:", error)
    return NextResponse.json({ error: "Failed to create sponsor request" }, { status: 500 })
  }
}
