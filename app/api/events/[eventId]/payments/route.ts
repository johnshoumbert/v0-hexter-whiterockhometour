import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const user = await getSession()
    const { eventId } = await params

    console.log("[v0] Fetching payments for event:", eventId)

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check authorization
    let isAuthorized = user.is_admin

    if (!isAuthorized) {
      const eventAdmin = await sql`
        SELECT * FROM event_users 
        WHERE user_id = ${user.id} AND event_id = ${eventId} AND role = 'admin'
      `
      isAuthorized = eventAdmin.length > 0
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get("search") || ""
    const statusFilter = searchParams.get("status") || ""
    const typeFilter = searchParams.get("type") || ""

    console.log("[v0] Search query:", searchQuery)
    console.log("[v0] Status filter:", statusFilter)
    console.log("[v0] Type filter:", typeFilter)

    let query = `
      SELECT 
        p.id,
        p.amount,
        p.status,
        p.payment_type,
        p.stripe_session_id,
        p.stripe_payment_intent,
        p.auction_id,
        p.created_at,
        u.name as user_name,
        u.email as user_email,
        u.id as user_id,
        a.title as auction_title,
        COALESCE(
          json_agg(
            json_build_object(
              'item_type', pi.item_type,
              'item_id', pi.item_id,
              'quantity', pi.quantity,
              'unit_price', pi.unit_price,
              'metadata', pi.metadata
            )
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'::json
        ) as payment_items
      FROM payments p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN auctions a ON p.auction_id = a.id
      LEFT JOIN payment_items pi ON p.id = pi.payment_id
      WHERE p.event_id = $1
    `

    const queryParams: any[] = [eventId]
    let paramIndex = 2

    if (searchQuery) {
      query += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`
      queryParams.push(`%${searchQuery}%`)
      paramIndex++
    }

    if (statusFilter) {
      query += ` AND p.status = $${paramIndex}`
      queryParams.push(statusFilter)
      paramIndex++
    }

    if (typeFilter) {
      query += ` AND p.payment_type = $${paramIndex}`
      queryParams.push(typeFilter)
      paramIndex++
    }

    query += `
      GROUP BY p.id, u.name, u.email, u.id, a.title
      ORDER BY p.created_at DESC
    `

    const result = await sql.query(query, queryParams)

    console.log("[v0] Payments query result:", result?.length || 0)

    if (result && result.length > 0) {
      console.log("[v0] First payment:", JSON.stringify(result[0], null, 2))
    }

    return NextResponse.json({ payments: result })
  } catch (error: any) {
    console.error("[v0] Get payments error:", error.message)
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 })
  }
}
