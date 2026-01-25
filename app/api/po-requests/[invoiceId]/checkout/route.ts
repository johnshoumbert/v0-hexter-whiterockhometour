import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getEventStripe } from "@/lib/stripe"

export async function POST(request: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    const { invoiceId } = await params
    const body = await request.json()
    const { amount } = body

    console.log("[v0] Invoice checkout API called")
    console.log("[v0] Invoice checkout - invoiceId:", invoiceId)
    console.log("[v0] Invoice checkout - amount:", amount)

    if (!invoiceId) {
      console.error("[v0] Missing invoiceId parameter")
      return NextResponse.json({ error: "Missing invoice ID" }, { status: 400 })
    }

    if (!amount || amount <= 0) {
      console.error("[v0] Invalid amount:", amount)
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    // Fetch invoice and event details
    console.log("[v0] Fetching invoice details for:", invoiceId)
    const invoiceResult = await sql`
      SELECT 
        pr.id,
        pr.event_id,
        pr.user_id,
        pr.invoice_number,
        pr.total_amount,
        pr.name,
        pr.email,
        e.event_name,
        u.name as user_name,
        u.email as user_email
      FROM po_requests pr
      JOIN events e ON pr.event_id = e.id
      LEFT JOIN users u ON pr.user_id = u.id
      WHERE pr.id = ${invoiceId}
    `

    console.log("[v0] Invoice query result count:", invoiceResult.length)

    if (invoiceResult.length === 0) {
      console.error("[v0] Invoice not found in database")
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const invoice = invoiceResult[0]
    const finalUserName = invoice.user_name || invoice.name || "Guest"
    const finalUserEmail = invoice.user_email || invoice.email
    console.log("[v0] Invoice found:", invoice.invoice_number, "for event:", invoice.event_name, "user:", finalUserName)

    // Get event-specific Stripe instance
    const { stripe, keySource } = await getEventStripe(invoice.event_id)
    console.log("[v0] Using event-specific Stripe configuration from:", keySource)

    const amountInCents = Math.round(amount * 100)
    console.log("[v0] Creating payment intent for amount:", amount, "($" + amountInCents + " cents)")

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      metadata: {
        type: "invoice",
        invoice_id: invoiceId,
        invoice_number: invoice.invoice_number,
        event_id: invoice.event_id,
        event_name: invoice.event_name,
        user_id: invoice.user_id || "guest",
        user_name: finalUserName,
        user_email: finalUserEmail,
      },
      receipt_email: finalUserEmail,
      description: `Invoice ${invoice.invoice_number} - ${invoice.event_name}`,
    })

    console.log("[v0] Payment intent created successfully:", paymentIntent.id)

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount: amount,
      totalAmount: amount.toFixed(2),
      invoiceId: invoiceId,
      invoiceNumber: invoice.invoice_number,
    })
  } catch (error: any) {
    console.error("[v0] Error creating invoice payment intent:", error)
    console.error("[v0] Error stack:", error.stack)
    return NextResponse.json({ error: "Failed to create payment intent", details: error.message }, { status: 500 })
  }
}
