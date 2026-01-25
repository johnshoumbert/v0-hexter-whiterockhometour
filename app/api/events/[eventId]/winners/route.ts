import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const user = await getSession()
    const { eventId } = await params

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userFilter = searchParams.get("user")

    let wins

    if (userFilter === "me") {
      const query = `
        SELECT 
          w.id,
          w.final_bid,
          w.payment_status,
          w.delivered,
          w.created_at,
          a.id as auction_id,
          a.title as auction_title,
          a.description as auction_description,
          a.image_url as auction_image_url
        FROM winners w
        JOIN auctions a ON w.auction_id = a.id
        WHERE w.user_id = $1 AND a.event_id = $2
        ORDER BY w.created_at DESC
      `

      const result = await sql.query(query, [user.id, eventId])

      wins = result.rows.map((w: any) => ({
        id: w.id,
        final_bid: w.final_bid,
        payment_status: w.payment_status,
        delivered: w.delivered,
        auction: {
          id: w.auction_id,
          title: w.auction_title,
          description: w.auction_description,
          image_url: w.auction_image_url,
        },
      }))
    } else {
      if (!user.is_admin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      const query = `
        SELECT 
          w.*,
          a.title as auction_title,
          u.name as user_name,
          u.email as user_email,
          COALESCE(p.status, p2.status) as actual_payment_status,
          COALESCE(p.id, p2.id) as payment_id,
          pr.id as invoice_id,
          pr.invoice_number,
          pr.status as invoice_status
        FROM winners w
        JOIN auctions a ON w.auction_id = a.id
        JOIN users u ON w.user_id = u.id
        LEFT JOIN po_requests pr ON pr.user_id = w.user_id 
          AND pr.event_id = w.event_id
          AND pr.status != 'rejected'
        LEFT JOIN payments p2 ON pr.payment_id = p2.id AND p2.status = 'succeeded'
        LEFT JOIN payment_items pi ON pi.item_id = a.id AND pi.item_type = 'auction'
        LEFT JOIN payments p ON p.id = pi.payment_id AND p.user_id = w.user_id AND p.status = 'succeeded'
        WHERE a.event_id = $1
        ORDER BY w.created_at DESC
      `

      const result = await sql.query(query, [eventId])
      // Update payment_status based on actual payment status
      // Map "succeeded" to "completed" for UI compatibility
      wins = result.rows.map((win: any) => ({
        ...win,
        payment_status: win.actual_payment_status === "succeeded" ? "completed" : (win.actual_payment_status || win.payment_status),
      }))
    }

    return NextResponse.json({ wins })
  } catch (error: any) {
    console.error("[v0] Get winners error:", error)

    if (error.message?.includes("event_id")) {
      const fallbackUser = await getSession()
      if (!fallbackUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      const userFilter = new URL(request.url).searchParams.get("user")

      if (userFilter === "me") {
        const query = `
          SELECT 
            w.id,
            w.final_bid,
            w.payment_status,
            w.delivered,
            w.created_at,
            a.id as auction_id,
            a.title as auction_title,
            a.description as auction_description,
            a.image_url as auction_image_url
          FROM winners w
          JOIN auctions a ON w.auction_id = a.id
          WHERE w.user_id = $1
          ORDER BY w.created_at DESC
        `

        const result = await sql.query(query, [fallbackUser.id])
        const wins = result.rows.map((w: any) => ({
          id: w.id,
          final_bid: w.final_bid,
          payment_status: w.payment_status,
          delivered: w.delivered,
          auction: {
            id: w.auction_id,
            title: w.auction_title,
            description: w.auction_description,
            image_url: w.auction_image_url,
          },
        }))

        return NextResponse.json({ wins })
      }
    }

    return NextResponse.json({ error: "Failed to fetch winners" }, { status: 500 })
  }
}
