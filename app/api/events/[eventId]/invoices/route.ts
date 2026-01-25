import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params

    console.log("[v0] Fetching all invoices for event:", eventId)

    const invoices = await sql`
      SELECT 
        pr.id,
        pr.invoice_number,
        pr.invoice_date,
        pr.due_date,
        pr.name,
        pr.email,
        pr.phone,
        pr.school_name,
        pr.total_amount,
        pr.status,
        pr.user_id,
        pr.created_at,
        pr.item_description,
        p.id as payment_id,
        p.status as payment_status,
        p.stripe_payment_intent
      FROM po_requests pr
      LEFT JOIN payments p ON pr.payment_id = p.id AND p.status = 'succeeded'
      WHERE pr.event_id = ${eventId}
      ORDER BY pr.created_at DESC
    `

    console.log("[v0] Invoices fetched:", invoices.length)

    return NextResponse.json({
      invoices: invoices,
      total: invoices.length,
    })
  } catch (error: any) {
    console.error("[v0] Error fetching invoices:", error)
    return NextResponse.json({ error: "Failed to fetch invoices", details: error.message }, { status: 500 })
  }
}
