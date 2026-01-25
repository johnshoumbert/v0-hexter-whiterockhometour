import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const auctionId = searchParams.get("auction_id")

    if (!auctionId) {
      return NextResponse.json({ error: "Auction ID is required" }, { status: 400 })
    }

    const existingAuth = await sql`
      SELECT stripe_payment_method_id, stripe_customer_id
      FROM auction_authorizations
      WHERE user_id = ${user.id} AND auction_id = ${auctionId}
      LIMIT 1
    `

    const hasAuthorization = existingAuth.length > 0

    return NextResponse.json({
      hasAuthorization,
      paymentMethodId: hasAuthorization ? existingAuth[0].stripe_payment_method_id : null,
    })
  } catch (error) {
    console.error("Check authorization error:", error)
    return NextResponse.json({ error: "Failed to check authorization" }, { status: 500 })
  }
}
