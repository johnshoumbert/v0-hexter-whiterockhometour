import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { eventId } = await params
    const { paymentIntentId } = await request.json()

    console.log("[v0] Cleaning up pending ticket purchases for payment intent:", paymentIntentId)

    // Delete ticket_purchases that are still pending for this payment intent
    const deletedPurchases = await sql`
      DELETE FROM ticket_purchases
      WHERE stripe_payment_intent = ${paymentIntentId}
      AND status = 'pending'
      AND event_id = ${eventId}
      AND user_id = ${session.id}
      RETURNING id
    `

    console.log("[v0] Deleted pending ticket purchases:", deletedPurchases.length)

    return NextResponse.json({
      success: true,
      deletedCount: deletedPurchases.length,
    })
  } catch (error) {
    console.error("[v0] Error cleaning up pending purchases:", error)
    return NextResponse.json({ error: "Failed to cleanup purchases" }, { status: 500 })
  }
}
