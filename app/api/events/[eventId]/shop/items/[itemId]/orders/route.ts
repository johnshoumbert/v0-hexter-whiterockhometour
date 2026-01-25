import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.NEON_DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string; itemId: string }> }) {
  try {
    const { eventId, itemId } = await params

    // Fetch orders for this specific item
    const orders = await sql`
      SELECT 
        so.id,
        so.status,
        so.quantity,
        so.total_amount,
        so.created_at,
        so.tracking_number,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone
      FROM shop_orders so
      LEFT JOIN users u ON so.user_id = u.id
      WHERE so.event_id = ${eventId}
        AND so.shop_item_id = ${itemId}
      ORDER BY so.created_at DESC
    `

    return NextResponse.json(orders)
  } catch (error) {
    console.error("Error fetching item orders:", error)
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}
