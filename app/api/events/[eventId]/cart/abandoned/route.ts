import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/session"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const session = await getSession()

    if (!session?.is_admin) {
      const isEventAdmin = await sql`
        SELECT 1 FROM event_users 
        WHERE event_id = ${eventId} AND user_id = ${session?.userId} AND role = 'admin'
      `

      if (!isEventAdmin || isEventAdmin.length === 0) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    // Mark abandoned carts (no activity for 24 hours and not yet converted)
    await sql`
      UPDATE abandoned_cart_tracking
      SET last_activity_at = updated_at
      WHERE event_id = ${eventId}
        AND converted = false
        AND updated_at < NOW() - INTERVAL '24 hours'
    `

    // Fetch abandoned carts grouped by session
    const abandonedCarts = await sql`
      SELECT 
        session_id,
        user_id,
        user_email,
        user_name,
        MAX(updated_at) as last_activity,
        MIN(created_at) as first_added,
        MAX(last_activity_at) as abandoned_at,
        MAX(reminder_sent_at) as reminder_sent_at,
        MAX(reminder_count) as reminder_count,
        SUM(cart_total) as total_value
      FROM abandoned_cart_tracking
      WHERE event_id = ${eventId}
        AND converted = false
        AND last_activity_at < NOW() - INTERVAL '24 hours'
      GROUP BY session_id, user_id, user_email, user_name
      ORDER BY last_activity DESC
    `

    // Fetch cart data for each session
    const cartsWithItems = abandonedCarts.map((cart: any) => {
      // Parse the cart_data JSON from the most recent cart entry
      return {
        ...cart,
        item_count: 0, // This will be calculated from cart_data
        items: [], // This will be parsed from cart_data
      }
    })

    console.log("[v0] Found abandoned carts:", cartsWithItems.length)

    return NextResponse.json({ carts: cartsWithItems })
  } catch (error: any) {
    console.error("[v0] Error fetching abandoned carts:", error)
    return NextResponse.json(
      { error: "Failed to fetch abandoned carts", details: error.message },
      { status: 500 }
    )
  }
}
