import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    const { invoiceId } = await params

    const invoices = await sql`
      SELECT 
        pr.id,
        pr.invoice_number,
        pr.total_amount,
        pr.status,
        pr.due_date,
        pr.invoice_date,
        pr.item_description,
        pr.unit_price,
        pr.quantity,
        pr.discount,
        pr.discount_code,
        pr.payment_terms,
        pr.created_at,
        pr.payment_id,
        pr.event_id,
        u.name,
        u.email,
        u.phone,
        e.event_name as school_name,
        p.status as payment_status
      FROM po_requests pr
      LEFT JOIN users u ON pr.user_id = u.id
      LEFT JOIN events e ON pr.event_id = e.id
      LEFT JOIN payments p ON pr.payment_id = p.id
      WHERE pr.id = ${invoiceId}
    `

    if (invoices.length === 0) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const invoice = invoices[0]

    let items = []
    
    // First try to get items from po_requests_item (for sponsor requests and direct invoices)
    items = await sql`
      SELECT 
        item_type,
        item_id,
        item_name,
        quantity,
        unit_price,
        total_amount
      FROM po_requests_item
      WHERE po_request_id = ${invoiceId}
      ORDER BY item_name
    `
    
    // If no items found and there's a payment_id, get from payment_items
    if (items.length === 0 && invoice.payment_id) {
      items = await sql`
        SELECT 
          item_type,
          item_id,
          item_name,
          quantity,
          unit_price,
          total_amount,
          metadata
        FROM payment_items
        WHERE payment_id = ${invoice.payment_id}
        ORDER BY item_name
      `
    }

    const invoiceDate = invoice.invoice_date
      ? new Date(invoice.invoice_date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : new Date(invoice.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })

    const dueDate = invoice.due_date
      ? new Date(invoice.due_date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : null

    const invoiceData = {
      invoiceNumber: invoice.invoice_number,
      invoiceDate,
      dueDate,
      eventName: invoice.school_name || "School Auction",
      winnerName: invoice.name,
      winnerEmail: invoice.email,
      winnerPhone: invoice.phone,
      auctionTitle: invoice.item_description || "Auction Items",
      finalBid: Number(invoice.total_amount),
      unitPrice: Number(invoice.unit_price),
      quantity: invoice.quantity,
      discount: Number(invoice.discount || 0),
      discountCode: invoice.discount_code,
      paymentTerms: invoice.payment_terms,
      pickupInstructions: null,
      eventId: invoice.event_id, // Use actual event_id from po_requests instead of null
      status: invoice.status,
      paymentStatus: invoice.payment_status,
      paymentId: invoice.payment_id,
      items: items.map((item: any) => ({
        itemType: item.item_type,
        itemId: item.item_id,
        itemName: item.item_name,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        totalAmount: Number(item.total_amount),
        metadata: item.metadata,
      })),
    }

    return NextResponse.json(invoiceData)
  } catch (error) {
    console.error("[v0] Invoice fetch error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch invoice",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
