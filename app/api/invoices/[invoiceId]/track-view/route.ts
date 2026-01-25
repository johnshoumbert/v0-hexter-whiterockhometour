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

    if (invoiceData.status === "paid" || invoiceData.status === "completed") {
      return NextResponse.json({ tracked: false, reason: "already_paid" })
    }

    const existingView = await sql`
      SELECT id FROM invoice_tracking
      WHERE invoice_id = ${invoiceId}
        AND event_type = 'viewed'
        AND created_at > NOW() - INTERVAL '1 hour'
      LIMIT 1
    `

    if (existingView.length > 0) {
      return NextResponse.json({ tracked: false, reason: "recently_tracked" })
    }

    const userAgent = request.headers.get("user-agent") || "unknown"
    const referer = request.headers.get("referer") || ""
    
    const metadata = JSON.stringify({
      user_agent: userAgent,
      referer: referer
    })
    
    await sql`
      INSERT INTO invoice_tracking (
        invoice_id, user_id, event_id, event_type, metadata, created_at
      )
      VALUES (
        ${invoiceId},
        ${invoiceData.user_id},
        ${invoiceData.event_id},
        'viewed',
        ${metadata}::jsonb,
        NOW()
      )
    `

    console.log("[v0] Invoice view tracked:", invoiceId)

    return NextResponse.json({ tracked: true })
  } catch (error) {
    console.error("[v0] Error tracking invoice view:", error)
    return NextResponse.json({ error: "Failed to track view" }, { status: 500 })
  }
}
