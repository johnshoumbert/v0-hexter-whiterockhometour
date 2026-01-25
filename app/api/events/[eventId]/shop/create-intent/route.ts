import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getEventStripe } from "@/lib/stripe"
import { getOrCreatePaymentGatewayCustomer } from "@/lib/payment-gateway"

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { eventId } = await params
    const { items } = await request.json()

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 })
    }

    const { stripe } = await getEventStripe(eventId)

    const eventResult = await sql`SELECT event_name FROM events WHERE id = ${eventId}`
    const eventName = eventResult[0]?.event_name || "Event"

    const itemIds = items.map((item: any) => item.itemId)
    const shopItems = await sql`
      SELECT * FROM shop_items 
      WHERE id = ANY(${itemIds}::uuid[]) 
        AND event_id = ${eventId} 
        AND is_active = true
    `

    if (shopItems.length !== items.length) {
      return NextResponse.json({ error: "Some items are not available" }, { status: 400 })
    }

    const orderIds: string[] = []
    let totalAmount = 0

    for (const item of items) {
      const shopItem = shopItems.find((si: any) => si.id === item.itemId)
      const itemTotal = Number.parseFloat(shopItem.price) * item.quantity
      totalAmount += itemTotal

      const orderResult = await sql`
        INSERT INTO shop_orders (
          event_id, user_id, shop_item_id, quantity, unit_price, total_amount, 
          status, selected_options, created_at, updated_at
        )
        VALUES (
          ${eventId}, ${session.id}, ${item.itemId}, ${item.quantity},
          ${shopItem.price}, ${itemTotal}, 'pending', ${item.selectedOptions ? JSON.stringify(item.selectedOptions) : null}::jsonb,
          NOW(), NOW()
        )
        RETURNING id
      `
      orderIds.push(orderResult[0].id)

      // Save form responses if provided
      if (item.selectedOptions && Object.keys(item.selectedOptions).length > 0) {
        const formFields = await sql`
          SELECT id, field_name
          FROM shop_item_order_forms
          WHERE shop_item_id = ${item.itemId} AND is_active = true
        `

        for (const field of formFields) {
          const fieldValue = item.selectedOptions[field.field_name]
          if (fieldValue !== undefined && fieldValue !== null && fieldValue !== "") {
            await sql`
              INSERT INTO shop_order_form_responses (shop_order_id, field_id, field_value)
              VALUES (${orderResult[0].id}, ${field.id}, ${typeof fieldValue === "object" ? JSON.stringify(fieldValue) : String(fieldValue)})
            `
          }
        }
      }
    }

    // Create or get Stripe customer
    const existingCustomer = await sql`
      SELECT customer_id FROM payment_gateway_customers
      WHERE user_id = ${session.id} AND event_id = ${eventId} AND payment_provider = 'stripe'
    `

    let stripeCustomerId: string
    if (existingCustomer.length > 0) {
      stripeCustomerId = existingCustomer[0].customer_id
    } else {
      const customer = await stripe.customers.create({
        email: session.email,
        name: session.name,
        metadata: { user_id: session.id, event_id: eventId },
      })
      stripeCustomerId = customer.id
      await getOrCreatePaymentGatewayCustomer(session.id, eventId, "stripe", stripeCustomerId, {
        email: session.email,
        name: session.name,
      })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100),
      currency: "usd",
      customer: stripeCustomerId,
      metadata: {
        application: "MySchoolAuction.com",
        type: "shop_order",
        event_id: eventId,
        event_name: eventName,
        user_id: session.id,
        order_ids: orderIds.join(","),
      },
    })

    // Store payment intent with orders
    for (const orderId of orderIds) {
      await sql`
        UPDATE shop_orders
        SET stripe_payment_intent = ${paymentIntent.id}
        WHERE id = ${orderId}
      `
    }

    const itemsSummary = shopItems.map((shopItem: any) => {
      const cartItem = items.find((item: any) => item.itemId === shopItem.id)
      return {
        name: shopItem.title,
        amount: (Number.parseFloat(shopItem.price) * cartItem.quantity).toFixed(2),
        quantity: cartItem.quantity,
      }
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      totalAmount: totalAmount.toFixed(2),
      items: itemsSummary,
    })
  } catch (error) {
    console.error("[v0] Error creating shop payment intent:", error)
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 })
  }
}
