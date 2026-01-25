import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { invalidateEventCache } from "@/stores/event-store"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string; orderId: string }> }) {
  try {
    const session = await getSession()
    const { eventId, orderId } = await params

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!session.is_admin) {
      const isEventAdmin = await sql`
        SELECT 1 FROM event_users 
        WHERE event_id = ${eventId} AND user_id = ${session.userId} AND role = 'admin'
      `

      if (!isEventAdmin || isEventAdmin.length === 0) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const result = await sql`
      SELECT 
        so.*,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        si.title as item_title,
        si.image_url as item_image,
        si.description as item_description,
        p.status as payment_status,
        p.id as payment_id,
        p.stripe_payment_intent,
        CASE 
          WHEN p.status = 'succeeded' OR p.status = 'completed' THEN 'paid'
          WHEN p.status = 'pending' THEN 'pending'
          WHEN p.status = 'failed' THEN 'failed'
          ELSE 'unpaid'
        END as payment_display_status
      FROM shop_orders so
      JOIN users u ON so.user_id = u.id
      JOIN shop_items si ON so.shop_item_id = si.id
      LEFT JOIN payments p ON p.user_id = so.user_id 
        AND p.event_id = so.event_id 
        AND p.payment_type = 'shop'
        AND p.created_at BETWEEN (so.created_at - INTERVAL '5 minutes') AND (so.created_at + INTERVAL '5 minutes')
      WHERE so.id = ${orderId} AND so.event_id = ${eventId}
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error fetching shop order:", error)
    return NextResponse.json({ error: "Failed to fetch shop order" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; orderId: string }> },
) {
  try {
    const session = await getSession()
    const { eventId, orderId } = await params

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!session.is_admin) {
      const isEventAdmin = await sql`
        SELECT 1 FROM event_users 
        WHERE event_id = ${eventId} AND user_id = ${session.userId} AND role = 'admin'
      `

      if (!isEventAdmin || isEventAdmin.length === 0) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const body = await request.json()

    const { status, tracking_number, quantity, total_amount, selected_options } = body

    console.log("[v0] Updating order with:", { status, tracking_number, quantity, total_amount, selected_options })

    const result = await sql`
      UPDATE shop_orders
      SET 
        status = CASE WHEN ${status !== undefined}::boolean THEN ${status || null}::text ELSE status END,
        tracking_number = CASE WHEN ${tracking_number !== undefined}::boolean THEN ${tracking_number || null}::text ELSE tracking_number END,
        quantity = CASE WHEN ${quantity !== undefined}::boolean THEN ${quantity || 0}::integer ELSE quantity END,
        total_amount = CASE WHEN ${total_amount !== undefined}::boolean THEN ${total_amount || 0}::numeric ELSE total_amount END,
        selected_options = CASE WHEN ${selected_options !== undefined}::boolean THEN ${JSON.stringify(selected_options || {})}::jsonb ELSE selected_options END,
        updated_at = NOW()
      WHERE id = ${orderId} AND event_id = ${eventId}
      RETURNING *
    `

    console.log("[v0] Update result length:", result?.length)
    console.log("[v0] Updated selected_options:", result?.[0]?.selected_options)

    if (!result || result.length === 0) {
      return NextResponse.json({ error: "Order not found or no changes made" }, { status: 404 })
    }

    invalidateEventCache()

    return NextResponse.json({ order: result[0] })
  } catch (error) {
    console.error("[v0] Error updating shop order:", error)
    return NextResponse.json({ error: "Failed to update shop order", details: String(error) }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; orderId: string }> },
) {
  try {
    const session = await getSession()
    const { eventId, orderId } = await params

    console.log("[v0] Delete order request:", { eventId, orderId })

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!session.is_admin) {
      const isEventAdmin = await sql`
        SELECT 1 FROM event_users 
        WHERE event_id = ${eventId} AND user_id = ${session.userId} AND role = 'admin'
      `

      if (!isEventAdmin || isEventAdmin.length === 0) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    // Check if order has associated payments
    const orderPayments = await sql`
      SELECT id, status FROM payments
      WHERE user_id IN (SELECT user_id FROM shop_orders WHERE id = ${orderId})
        AND event_id = ${eventId}
        AND payment_type = 'shop'
    `
    console.log("[v0] Found payments:", orderPayments.length)

    // Delete related payment_items first if they exist
    if (orderPayments.length > 0) {
      await sql`
        DELETE FROM payment_items
        WHERE payment_id IN (
          SELECT id FROM payments
          WHERE user_id IN (SELECT user_id FROM shop_orders WHERE id = ${orderId})
            AND event_id = ${eventId}
            AND payment_type = 'shop'
        )
      `
      console.log("[v0] Deleted payment_items")

      // Delete the payments
      await sql`
        DELETE FROM payments
        WHERE user_id IN (SELECT user_id FROM shop_orders WHERE id = ${orderId})
          AND event_id = ${eventId}
          AND payment_type = 'shop'
      `
      console.log("[v0] Deleted payments")
    }

    // Delete related order form responses
    await sql`
      DELETE FROM shop_order_form_responses
      WHERE order_id = ${orderId}
    `
    console.log("[v0] Deleted form responses")

    // Delete the order itself
    const result = await sql`
      DELETE FROM shop_orders
      WHERE id = ${orderId} AND event_id = ${eventId}
      RETURNING *
    `
    console.log("[v0] Deleted order, rows affected:", result.length)

    if (result.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    invalidateEventCache()

    return NextResponse.json({ success: true, message: "Order permanently deleted" })
  } catch (error: any) {
    console.error("[v0] Error deleting shop order:", error)
    console.error("[v0] Error details:", error.message, error.stack)
    return NextResponse.json({ error: "Failed to delete shop order", details: error.message }, { status: 500 })
  }
}
