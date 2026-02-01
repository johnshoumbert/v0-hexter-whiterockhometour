import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { eventId } = await params

    // Check for ticket purchases
    let hasTickets = false
    try {
      const ticketResult = await sql.query(
        `SELECT COUNT(*) as count FROM ticket_purchases 
         WHERE user_id = $1 AND event_id = $2 AND status = 'completed'`,
        [user.id, eventId]
      )
      hasTickets = ticketResult[0]?.count > 0
    } catch (error: any) {
      if (!error.message.includes('relation "ticket_purchases" does not exist')) {
        console.error("[v0] Error checking tickets:", error)
      }
    }

    // Check for shop orders
    let hasShopOrders = false
    try {
      const shopResult = await sql.query(
        `SELECT COUNT(*) as count FROM shop_orders 
         WHERE user_id = $1 AND event_id = $2 AND status = 'completed'`,
        [user.id, eventId]
      )
      hasShopOrders = shopResult[0]?.count > 0
    } catch (error: any) {
      if (!error.message.includes('relation "shop_orders" does not exist')) {
        console.error("[v0] Error checking shop orders:", error)
      }
    }

    const hasPurchases = hasTickets || hasShopOrders

    return NextResponse.json({ hasPurchases })
  } catch (error) {
    console.error("[v0] Error in has-purchases API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
