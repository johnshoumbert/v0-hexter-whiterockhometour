import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; couponId: string }> },
) {
  try {
    const { eventId, couponId } = await params

    if (!process.env.NEON_DATABASE_URL) {
      return NextResponse.json({ error: "Database connection not configured" }, { status: 500 })
    }

    const sql = neon(process.env.NEON_DATABASE_URL)

    const usages = await sql`
      SELECT 
        cu.id,
        cu.user_id,
        cu.order_type,
        cu.order_id,
        cu.discount_applied,
        cu.created_at,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        p.id as payment_id,
        p.amount as payment_amount,
        p.status,
        p.payment_type,
        p.payment_method,
        p.payment_gateway,
        p.stripe_payment_intent,
        p.stripe_session_id,
        p.auction_id,
        p.message,
        p.gateway_transaction_id,
        dc.code as coupon_code,
        dc.discount_type,
        dc.discount_amount as coupon_discount_amount,
        dc.discount_percentage
      FROM coupon_usage cu
      JOIN users u ON cu.user_id = u.id
      JOIN discount_codes dc ON cu.coupon_id = dc.id
      LEFT JOIN payments p ON p.id = cu.order_id
      WHERE cu.event_id = ${eventId}
      AND cu.coupon_id = ${couponId}
      ORDER BY cu.created_at DESC
    `

    return NextResponse.json({ usages })
  } catch (error) {
    console.error("[v0] Error fetching coupon usage:", error)
    return NextResponse.json({ error: "Failed to fetch coupon usage" }, { status: 500 })
  }
}
