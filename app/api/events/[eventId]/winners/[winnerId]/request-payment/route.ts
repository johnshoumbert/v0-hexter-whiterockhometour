import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { checkAdminAccess } from "@/lib/admin-check"
import { generateWinnerInvoiceHTML } from "@/lib/generate-winner-invoice-html"
import { sendEmail } from "@/lib/email"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; winnerId: string }> },
) {
  try {
    const { eventId, winnerId } = await params
    const body = await request.json().catch(() => ({}))
    const { createOnly, sendEmailOption, invoiceId: existingInvoiceId } = body

    console.log("[v0] Request payment for winner:", winnerId, "in event:", eventId)

    const adminCheck = await checkAdminAccess(eventId)
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const winners = await sql`
      SELECT 
        b.id as bid_id,
        b.auction_id,
        b.user_id,
        b.amount as final_bid,
        u.email as user_email,
        u.name as user_name,
        u.phone,
        a.title as auction_title,
        a.pickup_instructions,
        e.event_name,
        e.pickup_instructions as event_pickup_instructions
      FROM bids b
      JOIN users u ON b.user_id = u.id
      JOIN auctions a ON b.auction_id = a.id
      JOIN events e ON b.event_id = e.id
      WHERE b.id = ${winnerId} AND b.event_id = ${eventId}
    `

    if (winners.length === 0) {
      console.log("[v0] Winner not found")
      return NextResponse.json({ error: "Winner not found" }, { status: 404 })
    }

    const winner = winners[0]
    console.log("[v0] Found winner:", winner.user_email)

    // Check if an invoice already exists for this winner
    let invoiceId = existingInvoiceId
    let paymentId = null

    if (!invoiceId) {
      console.log("[v0] No existing invoice ID provided, checking for existing invoices")
      
      // Check if winner already has an invoice (that's not rejected)
      const existingInvoices = await sql`
        SELECT 
          pr.id as invoice_id,
          pr.invoice_number,
          pr.status,
          pr.payment_id,
          p.status as payment_status
        FROM po_requests pr
        LEFT JOIN payments p ON pr.payment_id = p.id
        LEFT JOIN payment_items pi ON p.id = pi.payment_id
        WHERE pi.item_id = ${winner.auction_id}
          AND pr.user_id = ${winner.user_id}
          AND pr.event_id = ${eventId}
          AND pr.status != 'rejected'
        ORDER BY pr.created_at DESC
        LIMIT 1
      `
      
      if (existingInvoices.length > 0) {
        const existing = existingInvoices[0]
        console.log("[v0] Found existing invoice:", existing.invoice_number, "status:", existing.status, "payment status:", existing.payment_status)
        invoiceId = existing.invoice_id
        paymentId = existing.payment_id
        
        // Don't create a new invoice, use the existing one
        if (createOnly) {
          return NextResponse.json({
            success: true,
            invoiceId: invoiceId,
            paymentId: paymentId,
            existing: true,
          })
        }
      }
    }

    if (!invoiceId) {
      console.log("[v0] Creating new invoice for winner")
      
      const invoiceDate = new Date()
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`

      const paymentResult = await sql`
        INSERT INTO payments (
          user_id,
          event_id,
          amount,
          status,
          payment_type,
          payment_gateway,
          created_at,
          updated_at
        )
        VALUES (
          ${winner.user_id},
          ${eventId},
          ${winner.final_bid},
          'pending',
          'invoice',
          'stripe',
          NOW(),
          NOW()
        )
        RETURNING id
      `

      paymentId = paymentResult[0].id
      console.log("[v0] Created payment record:", paymentId)

      await sql`
        INSERT INTO payment_items (
          payment_id,
          item_type,
          item_id,
          item_name,
          quantity,
          unit_price,
          total_amount,
          metadata,
          created_at,
          updated_at
        )
        VALUES (
          ${paymentId},
          'auction',
          ${winner.auction_id},
          ${winner.auction_title},
          1,
          ${winner.final_bid},
          ${winner.final_bid},
          ${JSON.stringify({ bid_id: winner.bid_id })},
          NOW(),
          NOW()
        )
      `

      console.log("[v0] Created payment item for single auction")

      const poRequest = await sql`
        INSERT INTO po_requests (
          invoice_number,
          user_id,
          event_id,
          payment_id,
          item_description,
          quantity,
          unit_price,
          total_amount,
          discount,
          invoice_date,
          due_date,
          status,
          created_at,
          updated_at
        )
        VALUES (
          ${invoiceNumber},
          ${winner.user_id},
          ${eventId},
          ${paymentId},
          ${winner.auction_title},
          1,
          ${winner.final_bid},
          ${winner.final_bid},
          0,
          ${invoiceDate},
          ${new Date(invoiceDate.getTime() + 7 * 24 * 60 * 60 * 1000)},
          'pending',
          NOW(),
          NOW()
        )
        RETURNING id
      `

      invoiceId = poRequest[0].id
      console.log("[v0] Created po_request with ID:", invoiceId, "linked to payment:", paymentId)

      // Create po_requests_item entry for the invoice line item
      await sql`
        INSERT INTO po_requests_item (
          po_request_id,
          item_type,
          item_id,
          item_name,
          item_description,
          quantity,
          unit_price,
          total_amount,
          metadata,
          created_at,
          updated_at
        )
        VALUES (
          ${invoiceId},
          'auction',
          ${winner.auction_id},
          ${winner.auction_title},
          ${winner.auction_title},
          1,
          ${winner.final_bid},
          ${winner.final_bid},
          ${JSON.stringify({ bid_id: winner.bid_id })},
          NOW(),
          NOW()
        )
      `
      
      console.log("[v0] Created po_requests_item for invoice")
    }

    if (createOnly) {
      return NextResponse.json({
        success: true,
        invoiceId: invoiceId,
        paymentId: paymentId,
      })
    }

    const invoices = await sql`
      SELECT 
        pr.id,
        pr.invoice_number,
        pr.invoice_date,
        pr.item_description,
        pr.total_amount,
        pr.payment_id
      FROM po_requests pr
      WHERE pr.id = ${invoiceId}
    `

    if (invoices.length === 0) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const invoice = invoices[0]

    const templates = await sql`
      SELECT template_id FROM email_templates 
      WHERE email_task = 'request-payment' AND is_active = true
      LIMIT 1
    `

    if (templates.length === 0) {
      console.log("[v0] No email template found")
      return NextResponse.json(
        {
          error: "Payment request email template not configured",
        },
        { status: 400 },
      )
    }

    const host = request.headers.get("host")
    const protocol = request.headers.get("x-forwarded-proto") || "https"
    const appUrl = `${protocol}://${host}`
    const paymentUrl = `${appUrl}/pay/${invoice.invoice_number}`

    console.log("[v0] Payment URL:", paymentUrl)

    const pickupInstructions = winner.pickup_instructions || winner.event_pickup_instructions
    const currentYear = new Date().getFullYear().toString()
    const invoiceDateFormatted = new Date(invoice.invoice_date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const invoiceHTML = generateWinnerInvoiceHTML({
      invoiceNumber: invoice.invoice_number,
      invoiceDate: invoiceDateFormatted,
      eventName: winner.event_name,
      winnerName: winner.user_name,
      winnerEmail: winner.user_email,
      auctionTitle: invoice.item_description,
      finalBid: Number(invoice.total_amount),
      pickupInstructions,
    })

    const invoiceBase64 = Buffer.from(invoiceHTML).toString("base64")

    const templateData = {
      auctionTitle: invoice.item_description,
      chargeAmount: Number(invoice.total_amount).toFixed(2),
      link: paymentUrl,
      year: currentYear,
      invoiceNumber: invoice.invoice_number,
      name: winner.user_name,
      ...(pickupInstructions && { pickupInstructions }),
    }

    console.log("[v0] Sending payment request email immediately")

    const emailResult = await sendEmail({
      to: winner.user_email,
      subject: `🧾 Payment Request: ${invoice.item_description}`,
      templateId: templates[0].template_id,
      dynamicTemplateData: templateData,
    })

    const emailStatus = emailResult.success ? "sent" : "failed"

    console.log("[v0] Logging email to queue with status:", emailStatus)

    await sql`
      INSERT INTO email_queue (
        to_email, from_email, subject, template_id, dynamic_template_data, 
        attachments, status, error_message, created_at
      )
      VALUES (
        ${winner.user_email},
        ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
        ${"🧾 Payment Request: " + invoice.item_description},
        ${templates[0].template_id},
        ${JSON.stringify(templateData)},
        ${JSON.stringify([
          {
            filename: `invoice-${invoice.invoice_number}.html`,
            content: invoiceBase64,
            contentType: "text/html",
          },
        ])},
        ${emailStatus},
        ${!emailResult.success ? emailResult.error : null},
        NOW()
      )
    `

    console.log("[v0] Payment request email sent and logged successfully")

    return NextResponse.json({
      success: true,
      message: emailResult.success
        ? "Payment request email sent successfully"
        : "Payment request created but email failed to send",
      invoiceId: invoiceId,
      invoiceNumber: invoice.invoice_number,
      paymentId: invoice.payment_id,
      emailSent: emailResult.success,
    })
  } catch (error) {
    console.error("[v0] Request payment error:", error)
    return NextResponse.json(
      {
        error: "Failed to send payment request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
