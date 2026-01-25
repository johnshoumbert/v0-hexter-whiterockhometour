import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { sendEmail } from "@/lib/email"
import crypto from "crypto"

async function trackCouponUsage(
  couponCode: string,
  userId: string,
  eventId: string,
  orderType: string,
  orderId: string,
  discountAmount: number,
) {
  try {
    const couponResult = await sql`
      SELECT id FROM discount_codes 
      WHERE code = ${couponCode} AND event_id = ${eventId}
      LIMIT 1
    `

    if (couponResult.length === 0) {
      console.warn("[v0] Coupon code not found for usage tracking:", couponCode)
      return
    }

    const couponId = couponResult[0].id

    await sql`
      INSERT INTO coupon_usage (
        coupon_id, user_id, event_id, order_type, order_id, discount_applied, created_at
      )
      VALUES (
        ${couponId}, ${userId}, ${eventId}, ${orderType}, ${orderId}, ${discountAmount}, NOW()
      )
    `

    console.log("[v0] Coupon usage tracked:", { couponCode, userId, orderType, orderId, discountAmount })
  } catch (error) {
    console.error("[v0] Failed to track coupon usage:", error)
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const session = await getSession()
    const { eventId } = await params
    const body = await request.json()
    const { type, items, couponCode, discountAmount, originalAmount } = body

    console.log("[v0] Creating free order:", { eventId, type, couponCode })

    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.id
    const userResult = await sql`SELECT id, name, email FROM users WHERE id = ${userId}`
    const user = userResult[0]

    // Generate a unique order ID
    const orderId = `free_${crypto.randomUUID()}`

    // Create payment record with $0 amount
    const paymentResult = await sql`
      INSERT INTO payments (
        event_id, user_id, amount, payment_type, payment_method,
        payment_gateway, gateway_transaction_id, status, created_at
      )
      VALUES (
        ${eventId}, ${userId}, 0, ${type},
        'coupon', 'free', ${orderId}, 'completed', NOW()
      )
      RETURNING id
    `

    const paymentId = paymentResult[0].id

    // Track coupon usage
    if (couponCode && discountAmount) {
      await trackCouponUsage(couponCode, userId, eventId, type, paymentId, discountAmount)
    }

    // Handle tickets
    if (type === "ticket") {
      const tickets = JSON.parse(sessionStorage.getItem("checkout_tickets") || "[]")

      for (const ticket of tickets) {
        for (let i = 0; i < ticket.quantity; i++) {
          const ticketCode = `${ticket.id.substring(0, 8)}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`

          await sql`
            INSERT INTO tickets (
              event_id, user_id, ticket_type_id, ticket_code, price, 
              status, payment_id, purchased_at
            )
            VALUES (
              ${eventId}, ${userId}, ${ticket.id}, ${ticketCode}, 0,
              'active', ${paymentId}, NOW()
            )
          `
        }
      }

      // Send confirmation email
      const eventData = await sql`SELECT event_name FROM events WHERE id = ${eventId} LIMIT 1`
      const event = eventData[0]

      if (event && user?.email) {
        try {
          await sendEmail({
            to: user.email,
            subject: `Your tickets for ${event.event_name}`,
            templateName: "ticket-confirmation",
            templateData: {
              eventTitle: event.event_name,
              userName: user.name,
              tickets: tickets,
              total: 0,
              discountApplied: discountAmount || 0,
            },
          })
        } catch (error) {
          console.error("[v0] Failed to send ticket confirmation email:", error)
        }
      }
    }

    // Handle shop orders
    if (type === "shop") {
      const shopItems = JSON.parse(sessionStorage.getItem("checkout_shop") || "[]")

      await sql`
        INSERT INTO shop_orders (
          event_id, user_id, total_amount, status, payment_id, created_at
        )
        VALUES (
          ${eventId}, ${userId}, 0, 'completed', ${paymentId}, NOW()
        )
        RETURNING id
      `

      // Send confirmation email
      const eventData = await sql`SELECT event_name FROM events WHERE id = ${eventId} LIMIT 1`
      const event = eventData[0]

      if (event && user?.email) {
        try {
          await sendEmail({
            to: user.email,
            subject: `Your order from ${event.event_name} Shop`,
            templateName: "shop-order-confirmation",
            templateData: {
              eventTitle: event.event_name,
              userName: user.name,
              items: shopItems,
              total: 0,
              discountApplied: discountAmount || 0,
            },
          })
        } catch (error) {
          console.error("[v0] Failed to send shop order confirmation email:", error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      orderId: paymentId,
      paymentId: paymentId,
    })
  } catch (error) {
    console.error("[v0] Error creating free order:", error)
    return NextResponse.json({ error: "Failed to create free order" }, { status: 500 })
  }
}
