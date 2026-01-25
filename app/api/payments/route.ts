import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userFilter = searchParams.get("user")

    let payments

    if (userFilter === "me") {
      payments = await sql`
        SELECT 
          p.id,
          p.amount,
          p.status,
          p.stripe_session_id,
          p.created_at,
          a.title as auction_title,
          a.image_url as auction_image
        FROM payments p
        JOIN auctions a ON p.auction_id = a.id
        WHERE p.user_id = ${user.id}
        ORDER BY p.created_at DESC
      `

      // Transform to match expected structure
      payments = payments.map((p: any) => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        stripe_session_id: p.stripe_session_id,
        created_at: p.created_at,
        auction: {
          title: p.auction_title,
          image_url: p.auction_image,
        },
      }))
    } else {
      // Admin can see all payments
      if (!user.is_admin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      payments = await sql`
        SELECT 
          p.*,
          u.name as user_name,
          u.email as user_email,
          a.title as auction_title
        FROM payments p
        JOIN users u ON p.user_id = u.id
        JOIN auctions a ON p.auction_id = a.id
        ORDER BY p.created_at DESC
      `
    }

    return NextResponse.json({ payments })
  } catch (error) {
    console.error("[v0] Get payments error:", error)
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 })
  }
}
