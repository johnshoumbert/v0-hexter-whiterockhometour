import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession, isEventAdmin } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userFilter = searchParams.get("user")
    const eventIdFilter = searchParams.get("event_id")

    console.log("[v0] Winners API - userFilter:", userFilter, "eventIdFilter:", eventIdFilter)

    let wins

    if (userFilter === "me") {
      if (eventIdFilter) {
        wins = await sql`
          SELECT 
            b.id,
            b.amount as final_bid,
            b.event_id,
            b.delivered,
            b.released_at,
            CASE 
              WHEN p.status IN ('succeeded', 'completed') THEN 'succeeded'
              ELSE 'pending'
            END as payment_status,
            b.created_at,
            a.id as auction_id,
            a.title as auction_title,
            a.description as auction_description,
            a.image_url as auction_image_url,
            (
              SELECT pr.id 
              FROM po_requests pr
              WHERE pr.user_id = b.user_id 
                AND pr.event_id = b.event_id 
                AND pr.status != 'cancelled'
              ORDER BY pr.created_at DESC
              LIMIT 1
            ) as invoice_id,
            (
              SELECT pr.invoice_number
              FROM po_requests pr
              WHERE pr.user_id = b.user_id 
                AND pr.event_id = b.event_id 
                AND pr.status != 'cancelled'
              ORDER BY pr.created_at DESC
              LIMIT 1
            ) as invoice_number
          FROM bids b
          JOIN auctions a ON b.auction_id = a.id
          LEFT JOIN payments p ON p.auction_id = b.auction_id 
            AND p.user_id = b.user_id 
            AND p.status IN ('succeeded', 'completed')
          WHERE b.user_id = ${user.id}
            AND b.is_winning_bid = TRUE
            AND b.event_id = ${eventIdFilter}
          ORDER BY b.created_at DESC
        `
      } else {
        wins = await sql`
          SELECT 
            b.id,
            b.amount as final_bid,
            b.event_id,
            b.delivered,
            b.released_at,
            CASE 
              WHEN p.status IN ('succeeded', 'completed') THEN 'succeeded'
              ELSE 'pending'
            END as payment_status,
            b.created_at,
            a.id as auction_id,
            a.title as auction_title,
            a.description as auction_description,
            a.image_url as auction_image_url,
            (
              SELECT pr.id 
              FROM po_requests pr
              WHERE pr.user_id = b.user_id 
                AND pr.event_id = b.event_id 
                AND pr.status != 'cancelled'
              ORDER BY pr.created_at DESC
              LIMIT 1
            ) as invoice_id,
            (
              SELECT pr.invoice_number
              FROM po_requests pr
              WHERE pr.user_id = b.user_id 
                AND pr.event_id = b.event_id 
                AND pr.status != 'cancelled'
              ORDER BY pr.created_at DESC
              LIMIT 1
            ) as invoice_number
          FROM bids b
          JOIN auctions a ON b.auction_id = a.id
          LEFT JOIN payments p ON p.auction_id = b.auction_id 
            AND p.user_id = b.user_id 
            AND p.status IN ('succeeded', 'completed')
          WHERE b.user_id = ${user.id}
            AND b.is_winning_bid = TRUE
          ORDER BY b.created_at DESC
        `
      }

      // Transform to match expected structure
      wins = wins.map((w: any) => ({
        id: w.id,
        final_bid: w.final_bid,
        payment_status: w.payment_status,
        delivered: w.delivered,
        released_at: w.released_at,
        event_id: w.event_id,
        invoice_id: w.invoice_id,
        invoice_number: w.invoice_number,
        auction_id: w.auction_id,
        auction_title: w.auction_title,
        auction_description: w.auction_description,
        auction_image_url: w.auction_image_url,
      }))
    } else {
      // Admin can see all wins
      const userIsEventAdmin = eventIdFilter ? await isEventAdmin(user.id, eventIdFilter) : false

      if (!user.is_admin && !userIsEventAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      if (eventIdFilter) {
        wins = await sql`
          SELECT DISTINCT ON (b.id)
            b.id,
            b.user_id,
            b.auction_id,
            b.amount as final_bid,
            b.authorized as bid_authorized,
            b.stripe_payment_method_id,
            b.created_at,
            b.event_id,
            b.is_winning_bid,
            b.delivered,
            b.release_code,
            b.released_at,
            CASE 
              WHEN p.status IN ('succeeded', 'completed') THEN 'succeeded'
              WHEN inv_payment.status IN ('succeeded', 'completed') THEN 'succeeded'
              WHEN item_payment.status IN ('succeeded', 'completed') THEN 'succeeded'
              ELSE 'pending'
            END as payment_status,
            a.title as auction_title,
            a.description as auction_description,
            a.image_url as auction_image_url,
            a.end_time,
            a.status as auction_status,
            u.name as user_name,
            u.email as user_email,
            u.phone as user_phone,
            (
              SELECT pr.id 
              FROM po_requests pr
              WHERE pr.user_id = b.user_id 
                AND pr.event_id = a.event_id 
                AND pr.status != 'cancelled'
              ORDER BY pr.created_at DESC
              LIMIT 1
            ) as invoice_id,
            (
              SELECT pr.invoice_number
              FROM po_requests pr
              WHERE pr.user_id = b.user_id 
                AND pr.event_id = a.event_id 
                AND pr.status != 'cancelled'
              ORDER BY pr.created_at DESC
              LIMIT 1
            ) as invoice_number,
            (
              SELECT pr.status
              FROM po_requests pr
              WHERE pr.user_id = b.user_id 
                AND pr.event_id = a.event_id 
                AND pr.status != 'cancelled'
              ORDER BY pr.created_at DESC
              LIMIT 1
            ) as invoice_status
          FROM bids b
          JOIN auctions a ON b.auction_id = a.id
          JOIN users u ON b.user_id = u.id
          LEFT JOIN payments p ON p.auction_id = b.auction_id 
            AND p.user_id = b.user_id 
            AND p.status IN ('succeeded', 'completed')
          LEFT JOIN po_requests inv ON inv.user_id = b.user_id 
            AND inv.event_id = a.event_id
            AND inv.status != 'cancelled'
          LEFT JOIN payments inv_payment ON inv.payment_id = inv_payment.id
            AND inv_payment.status IN ('succeeded', 'completed')
          LEFT JOIN payment_items pi ON pi.metadata->>'bid_id' = b.id::text
            AND pi.item_type = 'auction'
          LEFT JOIN payments item_payment ON pi.payment_id = item_payment.id
            AND item_payment.status IN ('succeeded', 'completed')
          WHERE a.status = 'ended'
            AND a.event_id = ${eventIdFilter}
            AND b.id IN (
              SELECT DISTINCT ON (auction_id) id
              FROM bids
              WHERE auction_id = a.id
              ORDER BY auction_id, amount DESC, created_at ASC
            )
          ORDER BY b.id, b.created_at DESC
        `
      } else {
        wins = await sql`
          SELECT DISTINCT ON (b.id)
            b.id,
            b.user_id,
            b.auction_id,
            b.amount as final_bid,
            b.authorized as bid_authorized,
            b.stripe_payment_method_id,
            b.created_at,
            b.event_id,
            b.is_winning_bid,
            b.delivered,
            b.release_code,
            b.released_at,
            CASE 
              WHEN p.status IN ('succeeded', 'completed') THEN 'succeeded'
              WHEN inv_payment.status IN ('succeeded', 'completed') THEN 'succeeded'
              WHEN item_payment.status IN ('succeeded', 'completed') THEN 'succeeded'
              ELSE 'pending'
            END as payment_status,
            a.title as auction_title,
            a.description as auction_description,
            a.image_url as auction_image_url,
            a.end_time,
            a.status as auction_status,
            u.name as user_name,
            u.email as user_email,
            u.phone as user_phone,
            (
              SELECT pr.id 
              FROM po_requests pr
              WHERE pr.user_id = b.user_id 
                AND pr.event_id = a.event_id 
                AND pr.status != 'cancelled'
              ORDER BY pr.created_at DESC
              LIMIT 1
            ) as invoice_id,
            (
              SELECT pr.invoice_number
              FROM po_requests pr
              WHERE pr.user_id = b.user_id 
                AND pr.event_id = a.event_id 
                AND pr.status != 'cancelled'
              ORDER BY pr.created_at DESC
              LIMIT 1
            ) as invoice_number,
            (
              SELECT pr.status
              FROM po_requests pr
              WHERE pr.user_id = b.user_id 
                AND pr.event_id = a.event_id 
                AND pr.status != 'cancelled'
              ORDER BY pr.created_at DESC
              LIMIT 1
            ) as invoice_status
          FROM bids b
          JOIN auctions a ON b.auction_id = a.id
          JOIN users u ON b.user_id = u.id
          LEFT JOIN payments p ON p.auction_id = b.auction_id 
            AND p.user_id = b.user_id 
            AND p.status IN ('succeeded', 'completed')
          LEFT JOIN po_requests inv ON inv.user_id = b.user_id 
            AND inv.event_id = a.event_id
            AND inv.status != 'cancelled'
          LEFT JOIN payments inv_payment ON inv.payment_id = inv_payment.id
            AND inv_payment.status IN ('succeeded', 'completed')
          LEFT JOIN payment_items pi ON pi.metadata->>'bid_id' = b.id::text
            AND pi.item_type = 'auction'
          LEFT JOIN payments item_payment ON pi.payment_id = item_payment.id
            AND item_payment.status IN ('succeeded', 'completed')
          WHERE a.status = 'ended'
            AND b.id IN (
              SELECT DISTINCT ON (auction_id) id
              FROM bids
              WHERE auction_id = a.id
              ORDER BY auction_id, amount DESC, created_at ASC
            )
          ORDER BY b.id, b.created_at DESC
        `
      }

      wins = wins.map((w: any) => ({
        ...w,
        payment_status: w.payment_status === "succeeded" ? "completed" : "pending",
      }))

      console.log("[v0] Winners API - returning", wins.length, "wins")
    }

    return NextResponse.json({ wins })
  } catch (error) {
    console.error("[v0] Get winners error:", error)
    return NextResponse.json({ error: "Failed to fetch winners" }, { status: 500 })
  }
}
