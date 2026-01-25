import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    const { invoiceId } = await params

    console.log("[v0] Fetching items for invoice:", invoiceId)

    const items = await sql`
      SELECT 
        id,
        item_type,
        item_id,
        item_name,
        item_description,
        quantity,
        unit_price,
        total_amount,
        metadata
      FROM po_requests_item
      WHERE po_request_id = ${invoiceId}
      ORDER BY created_at ASC
    `

    console.log("[v0] Found items:", items.length)

    return NextResponse.json({ items })
  } catch (error: any) {
    console.error("[v0] Error fetching invoice items:", error)
    return NextResponse.json({ error: "Failed to fetch invoice items", details: error.message }, { status: 500 })
  }
}
