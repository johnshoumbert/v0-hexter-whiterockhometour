import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    const { invoiceId } = await params
    const body = await request.json()
    const { name, email, phone, items, total_amount } = body

    console.log("[v0] Updating invoice:", invoiceId)

    // Update po_requests
    await sql`
      UPDATE po_requests
      SET 
        name = ${name},
        email = ${email},
        phone = ${phone || null},
        total_amount = ${total_amount},
        updated_at = NOW()
      WHERE id = ${invoiceId}
    `

    // Delete existing items
    await sql`
      DELETE FROM po_requests_item
      WHERE po_request_id = ${invoiceId}
    `

    // Insert new items
    for (const item of items) {
      await sql`
        INSERT INTO po_requests_item (
          po_request_id,
          item_type,
          item_id,
          item_name,
          item_description,
          quantity,
          unit_price,
          total_amount,
          metadata,
          created_at,
          updated_at
        )
        VALUES (
          ${invoiceId},
          ${item.item_type || 'custom'},
          ${item.item_id || null},
          ${item.item_name},
          ${item.item_description || ''},
          ${item.quantity},
          ${item.unit_price},
          ${item.total_amount},
          ${item.metadata ? JSON.stringify(item.metadata) : null},
          NOW(),
          NOW()
        )
      `
    }

    console.log("[v0] Invoice updated successfully")

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error updating invoice:", error)
    return NextResponse.json({ error: "Failed to update invoice", details: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    const { invoiceId } = await params

    console.log("[v0] Deleting invoice:", invoiceId)

    // Check if invoice has been paid
    const invoice = await sql`
      SELECT 
        pr.payment_id, 
        pr.invoice_number, 
        pr.status,
        p.status as payment_status
      FROM po_requests pr
      LEFT JOIN payments p ON pr.payment_id = p.id
      WHERE pr.id = ${invoiceId}
      LIMIT 1
    `

    console.log("[v0] Invoice query result:", invoice.length, invoice.length > 0 ? invoice[0] : null)

    if (invoice.length === 0) {
      console.error("[v0] Invoice not found:", invoiceId)
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Only prevent deletion if payment was actually completed
    if (invoice[0].payment_status === "succeeded") {
      console.error("[v0] Cannot delete paid invoice:", invoice[0].invoice_number)
      return NextResponse.json({ error: "Cannot delete paid invoice" }, { status: 400 })
    }

    console.log("[v0] Invoice can be deleted, proceeding...")

    // Delete invoice items first
    await sql`
      DELETE FROM po_requests_item
      WHERE po_request_id = ${invoiceId}
    `

    // Delete invoice
    await sql`
      DELETE FROM po_requests
      WHERE id = ${invoiceId}
    `

    console.log("[v0] Invoice deleted successfully")

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error deleting invoice:", error)
    return NextResponse.json({ error: "Failed to delete invoice", details: error.message }, { status: 500 })
  }
}
