import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    const { invoiceId } = await params

    const invoice = await sql`
      SELECT pr.id, pr.user_id, pr.event_id, pr.status
      FROM po_requests pr
      WHERE pr.id = ${invoiceId}
    `

    if (invoice.length === 0) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const invoiceData = invoice[0]

    await sql`
      INSERT INTO invoice_tracking (
        invoice_id, user_id, event_id, event_type, metadata, created_at
      )
      VALUES (
        ${invoiceId},
        ${invoiceData.user_id},
        ${invoiceData.event_id},
        'checkout_started',
        jsonb_build_object(
          'user_agent', ${request.headers.get("user-agent") || "unknown"}
        ),
        NOW()
      )
    `

    console.log("[v0] Checkout attempt tracked:", invoiceId)

    return NextResponse.json({ tracked: true })
  } catch (error) {
    console.error("[v0] Error tracking checkout:", error)
    return NextResponse.json({ error: "Failed to track checkout" }, { status: 500 })
  }
}
