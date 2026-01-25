import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const session = await getSession()
    if (!session?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { orderId } = await params

    const result = await sql.query(
      `SELECT 
        so.id,
        so.quantity,
        so.unit_price,
        so.total_amount,
        so.status,
        so.created_at,
        u.name as user_name,
        u.email as user_email,
        si.title as item_title,
        si.image_url as item_image,
        e.event_name
      FROM shop_orders so
      JOIN users u ON so.user_id = u.id
      JOIN shop_items si ON so.shop_item_id = si.id
      JOIN events e ON so.event_id = e.id
      WHERE so.id = $1`,
      [orderId],
    )

    if (result.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json({ order: result[0] })
  } catch (error) {
    console.error("Error fetching shop order:", error)
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const session = await getSession()
    if (!session?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { orderId } = await params

    // Mark order as fulfilled/picked up
    await sql.query(
      `UPDATE shop_orders 
       SET status = 'fulfilled',
           updated_at = NOW()
       WHERE id = $1`,
      [orderId],
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error redeeming shop order:", error)
    return NextResponse.json({ error: "Failed to redeem order" }, { status: 500 })
  }
}
