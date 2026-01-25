import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdmin } from "@/lib/admin-check"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params

    const authResult = await requireAdmin(eventId)
    if (authResult) return authResult

    console.log("[v0] Exporting winners CSV for event:", eventId)

    const winners = await sql`
      SELECT 
        w.id,
        w.final_bid,
        w.payment_status,
        w.delivered,
        w.created_at,
        w.user_id,
        a.id as auction_id,
        a.title as auction_title,
        a.end_time as auction_end_time,
        u.name as winner_name,
        u.email as winner_email,
        u.phone as winner_phone,
        e.domain as event_domain
      FROM winners w
      JOIN auctions a ON w.auction_id = a.id
      JOIN users u ON w.user_id = u.id
      JOIN events e ON w.event_id = e.id
      WHERE w.event_id = ${eventId}
      ORDER BY w.created_at DESC
    `

    console.log("[v0] Found", winners.length, "winners to export")

    const winnersWithAuth = await Promise.all(
      winners.map(async (winner) => {
        const bidInfo = await sql`
          SELECT authorized, stripe_payment_method_id
          FROM bids
          WHERE auction_id = ${winner.auction_id}
            AND user_id = ${winner.user_id}
          ORDER BY amount DESC
          LIMIT 1
        `
        return {
          ...winner,
          bid_authorized: bidInfo[0]?.authorized || false,
          stripe_payment_method_id: bidInfo[0]?.stripe_payment_method_id || null,
        }
      }),
    )

    // Generate CSV
    const csvRows = [
      // Header row
      [
        "Winner ID",
        "Winner Name",
        "Winner Email",
        "Winner Phone",
        "Item Name",
        "Item Link",
        "Amount",
        "Authorized",
        "Payment Status",
        "Delivery Status",
        "Created At",
        "Auction End Time",
        "Payment Link URL",
      ].join(","),
    ]

    // Data rows
    for (const winner of winnersWithAuth) {
      const itemLink = winner.event_domain
        ? `https://${winner.event_domain}/auctions/${winner.auction_id}`
        : `${process.env.NEXT_PUBLIC_APP_URL || "https://myschoolauction.com"}/auctions/${winner.auction_id}`

      const paymentLinkUrl =
        winner.payment_status !== "completed"
          ? `${process.env.NEXT_PUBLIC_APP_URL || "https://myschoolauction.com"}/user/wins`
          : "N/A - Paid"

      csvRows.push(
        [
          winner.id,
          `"${winner.winner_name || "N/A"}"`,
          winner.winner_email || "N/A",
          winner.winner_phone || "N/A",
          `"${winner.auction_title}"`,
          itemLink,
          winner.final_bid,
          winner.bid_authorized ? "Yes" : "No",
          winner.payment_status || "pending",
          winner.delivered ? "Delivered" : "Pending",
          new Date(winner.created_at).toLocaleString(),
          new Date(winner.auction_end_time).toLocaleString(),
          paymentLinkUrl,
        ].join(","),
      )
    }

    const csv = csvRows.join("\n")

    console.log("[v0] CSV generated successfully with", csvRows.length - 1, "data rows")

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="winners-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("[v0] Export winners CSV error:", error)
    return NextResponse.json(
      { error: "Failed to export winners", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
