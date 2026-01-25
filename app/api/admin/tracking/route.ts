import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get("dateRange") || "30"
    const invoiceId = searchParams.get("invoiceId")

    // Calculate date filter
    let dateFilter = ""
    if (dateRange !== "all") {
      const days = Number.parseInt(dateRange)
      dateFilter = `AND created_at >= NOW() - INTERVAL '${days} days'`
    }

    // Invoice filter
    const invoiceFilter = invoiceId && invoiceId !== "all" ? `AND invoice_id = '${invoiceId}'` : ""

    // Fetch funnel data from multiple sources
    // EMAIL_SENT: Count from email_queue where template is payment request
    const emailSentResult = await sql`
      SELECT COUNT(*) as count
      FROM email_queue
      WHERE template_id = 'payment-request'
      ${dateFilter ? sql.unsafe(dateFilter) : sql``}
    `

    // INVOICE_VIEWED: We'll need to create a tracking table for this
    // For now, we'll estimate based on invoice views (could track with analytics)
    const invoiceViewedResult = await sql`
      SELECT COUNT(DISTINCT user_id) as count
      FROM po_requests
      WHERE status != 'draft'
      ${dateFilter ? sql.unsafe(dateFilter) : sql``}
      ${invoiceFilter ? sql.unsafe(invoiceFilter) : sql``}
    `

    // CHECKOUT_STARTED: Count payments with pending status
    const checkoutStartedResult = await sql`
      SELECT COUNT(*) as count
      FROM payments
      WHERE payment_type = 'invoice'
      ${dateFilter ? sql.unsafe(dateFilter) : sql``}
    `

    // PAYMENT_SUCCEEDED: Count completed invoice payments
    const paymentSucceededResult = await sql`
      SELECT COUNT(*) as count
      FROM payments
      WHERE payment_type = 'invoice' 
      AND status IN ('completed', 'succeeded')
      ${dateFilter ? sql.unsafe(dateFilter) : sql``}
    `

    // Fetch recent tracking events
    const recentEvents = await sql`
      SELECT 
        'PAYMENT_SUCCEEDED' as event_type,
        p.id,
        pr.invoice_number,
        u.email as user_email,
        p.created_at as timestamp,
        CONCAT('$', p.amount::text) as metadata
      FROM payments p
      LEFT JOIN po_requests pr ON pr.payment_id = p.id
      LEFT JOIN users u ON u.id = p.user_id
      WHERE p.payment_type = 'invoice'
      ${dateFilter ? sql.unsafe(dateFilter) : sql``}
      ${invoiceFilter ? sql.unsafe(invoiceFilter.replace("invoice_id", "pr.id")) : sql``}
      ORDER BY p.created_at DESC
      LIMIT 50
    `

    const funnel = {
      email_sent: Number(emailSentResult[0]?.count || 0),
      invoice_viewed: Number(invoiceViewedResult[0]?.count || 0),
      checkout_started: Number(checkoutStartedResult[0]?.count || 0),
      payment_succeeded: Number(paymentSucceededResult[0]?.count || 0),
    }

    return NextResponse.json({
      funnel,
      recentEvents,
    })
  } catch (error: any) {
    console.error("[v0] Error fetching tracking data:", error)
    return NextResponse.json({ error: "Failed to fetch tracking data", details: error.message }, { status: 500 })
  }
}
