import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { sendEmail } from "@/lib/email"
import PaymentReceipt from "@/emails/payment-receipt"
import { getSession } from "@/lib/auth"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; paymentId: string }> },
) {
  try {
    const { eventId, paymentId } = await params
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get payment details
    const paymentResult = await sql`
      SELECT 
        p.id,
        p.amount,
        p.created_at,
        p.stripe_payment_intent,
        u.name as customer_name,
        u.email as customer_email,
        e.event_name,
        o.name as organization_name,
        CASE 
          WHEN p.auction_id IS NOT NULL THEN 'auction'
          ELSE 'donation'
        END as payment_type
      FROM payments p
      JOIN users u ON p.user_id = u.id
      JOIN events e ON p.event_id = e.id
      LEFT JOIN organizations o ON e.organization_id = o.id
      WHERE p.id = ${paymentId} AND p.event_id = ${eventId}
    `

    if (paymentResult.length === 0) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    const payment = paymentResult[0]

    await sendEmail({
      to: payment.customer_email,
      subject: `Payment Receipt - ${payment.event_name}`,
      react: PaymentReceipt({
        customerName: payment.customer_name,
        customerEmail: payment.customer_email,
        paymentType: payment.payment_type,
        itemName: payment.payment_type === "donation" ? "Donation" : "Payment",
        amount: Number.parseFloat(payment.amount),
        paymentDate: new Date(payment.created_at).toLocaleString(),
        paymentId: payment.id,
        eventName: payment.event_name,
        organizationName: payment.organization_name,
      }),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Send receipt error:", error)
    return NextResponse.json({ error: "Failed to send receipt" }, { status: 500 })
  }
}
