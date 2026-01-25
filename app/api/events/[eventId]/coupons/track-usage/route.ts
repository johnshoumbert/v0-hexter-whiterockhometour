import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getUserSession } from "@/lib/session"

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const session = await getUserSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = getDb()
    const body = await request.json()
    const { couponId, orderType, orderId, discountApplied } = body

    console.log("[v0] Tracking coupon usage:", { couponId, orderType, orderId })

    // Create usage record
    await sql`
      INSERT INTO coupon_usage (
        coupon_id,
        user_id,
        event_id,
        order_type,
        order_id,
        discount_applied
      ) VALUES (
        ${couponId},
        ${session.userId},
        ${eventId},
        ${orderType},
        ${orderId},
        ${discountApplied}
      )
    `

    // Increment usage count
    await sql`
      UPDATE discount_codes
      SET current_uses = current_uses + 1
      WHERE id = ${couponId}
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error tracking coupon usage:", error)
    return NextResponse.json({ error: "Failed to track usage" }, { status: 500 })
  }
}
