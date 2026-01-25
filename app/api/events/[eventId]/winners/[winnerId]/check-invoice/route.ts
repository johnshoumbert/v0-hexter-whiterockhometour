import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { checkAdminAccess } from "@/lib/admin-check"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; winnerId: string }> },
) {
  try {
    const { eventId, winnerId } = await params

    console.log("[v0] Checking invoice for winnerId:", winnerId, "eventId:", eventId)

    const adminCheck = await checkAdminAccess(eventId)
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get the user_id from the winner (bid)
    const winners = await sql`
      SELECT b.user_id, b.auction_id
      FROM bids b
      WHERE b.id = ${winnerId} AND b.event_id = ${eventId}
    `

    console.log("[v0] Found winners:", winners.length)

    if (winners.length === 0) {
      return NextResponse.json({ error: "Winner not found" }, { status: 404 })
    }

    const winner = winners[0]
    console.log("[v0] Winner user_id:", winner.user_id, "auction_id:", winner.auction_id)

    const existingInvoices = await sql`
      SELECT 
        pr.id as invoice_id,
        pr.invoice_number,
        pr.status,
        pr.payment_id,
        p.status as payment_status,
        pi.metadata
      FROM po_requests pr
      LEFT JOIN payments p ON pr.payment_id = p.id
      LEFT JOIN payment_items pi ON p.id = pi.payment_id
      WHERE pr.user_id = ${winner.user_id}
        AND pr.event_id = ${eventId}
        AND pr.status IN ('pending', 'sent')
        AND pi.metadata->>'bid_id' = ${winnerId}
      ORDER BY pr.created_at DESC
      LIMIT 1
    `

    console.log("[v0] Existing invoices found:", existingInvoices.length)
    if (existingInvoices.length > 0) {
      console.log("[v0] Invoice details:", existingInvoices[0])
    }

    if (existingInvoices.length > 0) {
      const invoice = existingInvoices[0]
      return NextResponse.json({
        exists: true,
        invoiceId: invoice.invoice_id,
        invoiceNumber: invoice.invoice_number,
        status: invoice.status,
        paymentStatus: invoice.payment_status,
      })
    }

    return NextResponse.json({
      exists: false,
      invoiceId: null,
    })
  } catch (error) {
    console.error("[v0] Check invoice error:", error)
    return NextResponse.json(
      {
        error: "Failed to check invoice",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
