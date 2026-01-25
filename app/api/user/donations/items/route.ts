import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const donations = await sql`
      SELECT 
        a.id,
        a.title,
        a.description,
        a.image_url,
        a.min_bid,
        a.status,
        a.created_at,
        a.delivery_method,
        a.donation_notes,
        u.name as donor_name,
        u.email as donor_email,
        u.phone as donor_phone,
        ad.donor_organization,
        ad.donor_address,
        e.event_name,
        e.id as event_id
      FROM auctions a
      LEFT JOIN events e ON a.event_id = e.id
      LEFT JOIN users u ON a.donor_user_id = u.id
      LEFT JOIN auction_donors ad ON a.donor_id = ad.id
      WHERE a.is_donation = true 
        AND (a.donor_user_id = ${session.id} OR a.created_by = ${session.id})
      ORDER BY a.created_at DESC
    `

    return NextResponse.json({ donations })
  } catch (error) {
    console.error("[v0] Error fetching item donations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
