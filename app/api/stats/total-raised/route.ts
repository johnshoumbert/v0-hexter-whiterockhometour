import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("eventId")

    console.log("[v0] Total raised API called with eventId:", eventId)

    let paymentsQuery
    if (eventId) {
      paymentsQuery = sql`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM payments
        WHERE event_id = ${eventId}
        AND status IN ('pending', 'completed')
      `
    } else {
      paymentsQuery = sql`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM payments
        WHERE status IN ('pending', 'completed')
      `
    }

    const paymentsResult = await paymentsQuery
    const paymentsTotal = Number(paymentsResult[0]?.total || 0)
    console.log("[v0] Payments total:", paymentsTotal)

    let bidsQuery
    if (eventId) {
      bidsQuery = sql`
        SELECT COALESCE(SUM(max_bid), 0) as total
        FROM (
          SELECT auction_id, MAX(amount) as max_bid
          FROM bids
          WHERE event_id = ${eventId}
          GROUP BY auction_id
        ) as auction_bids
      `
    } else {
      bidsQuery = sql`
        SELECT COALESCE(SUM(max_bid), 0) as total
        FROM (
          SELECT auction_id, MAX(amount) as max_bid
          FROM bids
          GROUP BY auction_id
        ) as auction_bids
      `
    }

    const bidsResult = await bidsQuery
    const bidsTotal = Number(bidsResult[0]?.total || 0)
    console.log("[v0] Current bids total:", bidsTotal)

    const total = paymentsTotal + bidsTotal
    console.log("[v0] Total raised calculated (payments + bids):", total)

    return NextResponse.json({
      total,
      breakdown: {
        payments: paymentsTotal,
        currentBids: bidsTotal,
      },
    })
  } catch (error) {
    console.error("[v0] Error fetching total raised:", error)
    return NextResponse.json({ error: "Internal server error", total: 0 }, { status: 500 })
  }
}
