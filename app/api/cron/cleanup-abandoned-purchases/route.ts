import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Running cleanup of abandoned ticket purchases")

    // Delete ticket_purchases that have been pending for more than 24 hours
    const deletedPurchases = await sql`
      DELETE FROM ticket_purchases
      WHERE status = 'pending'
      AND created_at < NOW() - INTERVAL '24 hours'
      RETURNING id, event_id, user_id, created_at
    `

    console.log("[v0] Deleted abandoned ticket purchases:", deletedPurchases.length)

    return NextResponse.json({
      success: true,
      deletedCount: deletedPurchases.length,
      purchases: deletedPurchases,
    })
  } catch (error) {
    console.error("[v0] Error cleaning up abandoned purchases:", error)
    return NextResponse.json({ error: "Failed to cleanup purchases" }, { status: 500 })
  }
}
