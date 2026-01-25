import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdmin } from "@/lib/admin-check"
import { getEventStripe } from "@/lib/stripe"

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const body = await request.json()
    const { userId } = body

    const authResult = await requireAdmin(eventId)
    if (authResult) return authResult

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log("[v0] Bulk charging all items for user:", userId, "in event:", eventId)

    const winners = await sql`
      SELECT 
        w.id,
        w.final_bid,
        w.auction_id,
        w.user_id,
        a.title as auction_title,
        u.email as user_email,
        u.name as user_name
      FROM winners w
      JOIN auctions a ON w.auction_id = a.id
      JOIN users u ON w.user_id = u.id
      WHERE w.event_id = ${eventId}
        AND w.user_id = ${userId}
        AND w.payment_status != 'completed'
    `

    if (winners.length === 0) {
      return NextResponse.json({ error: "No unpaid items found for this user" }, { status: 404 })
    }

    const anyAuthorizedBid = await sql`
      SELECT stripe_payment_method_id, authorized
      FROM bids
      WHERE user_id = ${userId}
        AND auction_id IN (${sql.raw(winners.map((w) => `'${w.auction_id}'`).join(","))})
        AND authorized = true
      LIMIT 1
    `

    if (anyAuthorizedBid.length === 0 || !anyAuthorizedBid[0].stripe_payment_method_id) {
      return NextResponse.json({ error: "No authorized payment method found for this user" }, { status: 400 })
    }

    const paymentMethodId = anyAuthorizedBid[0].stripe_payment_method_id

    const totalAmount = winners.reduce((sum, winner) => sum + Number.parseFloat(winner.final_bid.toString()), 0)

    console.log("[v0] Charging", winners.length, "items for total:", totalAmount)

    const { stripe, keySource } = await getEventStripe(eventId)
    console.log("[v0] Using Stripe key source:", keySource)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100),
      currency: "usd",
      payment_method: paymentMethodId,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
      metadata: {
        event_id: eventId,
        user_id: userId,
        winner_ids: winners.map((w) => w.id).join(","),
        item_count: winners.length.toString(),
      },
      description: `Bulk charge for ${winners.length} auction items - ${winners.map((w) => w.auction_title).join(", ")}`,
    })

    console.log("[v0] Payment intent created:", paymentIntent.id, "status:", paymentIntent.status)

    if (paymentIntent.status === "succeeded") {
      const paymentResult = await sql`
        INSERT INTO payments (
          event_id, user_id, amount, payment_method, stripe_payment_intent_id,
          status, metadata, created_at
        )
        VALUES (
          ${eventId}, ${userId}, ${totalAmount}, 'card', ${paymentIntent.id},
          'completed', 
          ${JSON.stringify({
            winner_ids: winners.map((w) => w.id),
            auction_ids: winners.map((w) => w.auction_id),
            item_count: winners.length,
          })},
          NOW()
        )
        RETURNING id
      `

      const paymentId = paymentResult[0].id

      await sql`
        UPDATE winners
        SET payment_status = 'completed'
        WHERE id IN (${sql.raw(winners.map((w) => `'${w.id}'`).join(","))})
      `

      console.log("[v0] Successfully charged", winners.length, "items for user:", userId)

      return NextResponse.json({
        success: true,
        paymentIntentId: paymentIntent.id,
        paymentId,
        totalAmount,
        itemCount: winners.length,
        items: winners.map((w) => ({ id: w.id, title: w.auction_title, amount: w.final_bid })),
      })
    } else {
      console.error("[v0] Payment intent failed:", paymentIntent.status)
      return NextResponse.json({ error: `Payment failed with status: ${paymentIntent.status}` }, { status: 400 })
    }
  } catch (error) {
    console.error("[v0] Bulk charge error:", error)
    return NextResponse.json(
      { error: "Failed to charge payment", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
