import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const session = await getSession()
    const { eventId } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    let result
    if (!session?.is_admin && userId) {
      result = await sql`
        SELECT 
          so.id,
          so.user_id,
          so.shop_item_id,
          so.quantity,
          so.unit_price,
          so.total_amount,
          so.status,
          so.tracking_number,
          so.selected_options,
          so.stripe_payment_intent,
          so.stripe_session_id,
          so.created_at,
          so.updated_at,
          u.name as user_name,
          u.email as user_email,
          u.phone as user_phone,
          si.title as item_title,
          si.image_url as item_image,
          si.options as item_options,
          si.id as item_id,
          si.category as item_category,
          CASE 
            WHEN so.status = 'completed' THEN 'paid'
            WHEN so.status = 'pending' THEN 'pending'
            WHEN so.status = 'cancelled' OR so.status = 'refunded' THEN 'failed'
            ELSE 'unpaid'
          END as payment_display_status
        FROM shop_orders so
        LEFT JOIN users u ON so.user_id = u.id
        LEFT JOIN shop_items si ON so.shop_item_id = si.id
        WHERE so.event_id = ${eventId} AND so.user_id = ${userId}
        ORDER BY so.created_at DESC
      `
    } else {
      result = await sql`
        SELECT 
          so.id,
          so.user_id,
          so.shop_item_id,
          so.quantity,
          so.unit_price,
          so.total_amount,
          so.status,
          so.tracking_number,
          so.selected_options,
          so.stripe_payment_intent,
          so.stripe_session_id,
          so.created_at,
          so.updated_at,
          u.name as user_name,
          u.email as user_email,
          u.phone as user_phone,
          si.title as item_title,
          si.image_url as item_image,
          si.options as item_options,
          si.id as item_id,
          si.category as item_category,
          CASE 
            WHEN so.status = 'completed' THEN 'paid'
            WHEN so.status = 'pending' THEN 'pending'
            WHEN so.status = 'cancelled' OR so.status = 'refunded' THEN 'failed'
            ELSE 'unpaid'
          END as payment_display_status
        FROM shop_orders so
        LEFT JOIN users u ON so.user_id = u.id
        LEFT JOIN shop_items si ON so.shop_item_id = si.id
        WHERE so.event_id = ${eventId}
        ORDER BY so.created_at DESC
      `
    }

    return NextResponse.json({ orders: result || [] })
  } catch (error) {
    console.error("[v0] Error fetching shop orders:", error)
    return NextResponse.json({ error: "Failed to fetch shop orders" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { eventId } = await params
    const body = await request.json()
    const { shop_item_id, quantity, unit_price, total_amount, selected_options } = body

    const result = await sql`
      INSERT INTO shop_orders 
        (event_id, user_id, shop_item_id, quantity, unit_price, total_amount, status, selected_options)
      VALUES (${eventId}, ${session.user.id}, ${shop_item_id}, ${quantity}, ${unit_price}, ${total_amount}, 'pending', ${JSON.stringify(selected_options || {})})
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("[v0] Error creating shop order:", error)
    return NextResponse.json({ error: "Failed to create shop order" }, { status: 500 })
  }
}
