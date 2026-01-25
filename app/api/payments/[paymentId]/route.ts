import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  try {
    const { paymentId } = await params

    console.log("[v0] Fetching payment data for ID:", paymentId)

    const payments = await sql`
      SELECT 
        p.id,
        p.amount,
        p.payment_method,
        p.status,
        p.created_at,
        p.stripe_payment_intent,
        p.gateway_transaction_id,
        u.name as payer_name,
        u.email as payer_email
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = ${paymentId}
    `

    if (payments.length === 0) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    const payment = payments[0]

    const paymentData = {
      paymentDate: payment.created_at,
      paymentMethod: payment.payment_method || "card",
      payerName: payment.payer_name || "Customer",
      payerEmail: payment.payer_email || "",
      transactionId: payment.stripe_payment_intent || payment.gateway_transaction_id || payment.id,
      amount: Number(payment.amount),
      status: payment.status,
    }

    console.log("[v0] Payment data:", paymentData)

    return NextResponse.json(paymentData)
  } catch (error) {
    console.error("[v0] Payment fetch error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch payment",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
