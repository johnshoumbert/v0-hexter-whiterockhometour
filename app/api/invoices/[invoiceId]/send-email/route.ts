import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getSession } from "@/lib/session"
import sgMail from "@sendgrid/mail"

const sql = neon(process.env.NEON_DATABASE_URL!)

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  try {
    const session = await getSession()
    const { invoiceId } = await params

    console.log("[v0] Resend invoice email request:", { invoiceId })

    if (!session?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get invoice details
    const invoices = await sql`
      SELECT 
        pr.*,
        u.email as user_email,
        u.name as user_name,
        e.event_name
      FROM po_requests pr
      JOIN users u ON pr.user_id = u.id
      JOIN events e ON pr.event_id = e.id
      WHERE pr.id = ${invoiceId}
    `

    if (invoices.length === 0) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const invoice = invoices[0]

    // Send email if SendGrid is configured
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://myschoolauction.com"
      const paymentUrl = `${appUrl}/pay/${invoice.invoice_number}`

      const msg = {
        to: invoice.user_email,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: `Payment Request - ${invoice.event_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Payment Request</h2>
            <p>Dear ${invoice.user_name},</p>
            <p>You have a payment request for <strong>${invoice.event_name}</strong>.</p>
            <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
            <p><strong>Amount Due:</strong> $${Number(invoice.total_amount).toFixed(2)}</p>
            <p style="margin: 30px 0;">
              <a href="${paymentUrl}" 
                 style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Pay Now
              </a>
            </p>
            <p>Or copy this link: <a href="${paymentUrl}">${paymentUrl}</a></p>
            <p>Thank you!</p>
          </div>
        `,
      }

      await sgMail.send(msg)
      console.log("[v0] Payment request email sent to:", invoice.user_email)
    } else {
      console.log("[v0] SendGrid not configured, skipping email")
    }

    return NextResponse.json({ 
      success: true, 
      message: "Payment request email sent successfully" 
    })
  } catch (error: any) {
    console.error("[v0] Error sending invoice email:", error)
    return NextResponse.json({ 
      error: "Failed to send email", 
      details: error.message 
    }, { status: 500 })
  }
}
