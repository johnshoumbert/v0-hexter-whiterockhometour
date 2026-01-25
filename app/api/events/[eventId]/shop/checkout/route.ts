import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import type Stripe from "stripe"
import { getEventStripe } from "@/lib/stripe"
import { safeStripeError, safeErrorMessage } from "@/lib/safe-stripe-error"

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { eventId } = await params
    const body = await request.json()
    const { items } = body // Array of { itemId, quantity, selectedOptions }

    console.log("[v0] Checkout items received, count:", items?.length || 0)

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No items in cart" }, { status: 400 })
    }

    console.log("[v0] Creating server-side shop checkout session")

    const eventResult = await sql`
      SELECT event_name, domain FROM events WHERE id = ${eventId}
    `

    if (eventResult.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    const eventName = eventResult[0].event_name
    const eventDomain = eventResult[0].domain

    let eventHost: string
    if (eventDomain && eventDomain !== "localhost" && !eventDomain.includes("localhost:")) {
      eventHost = eventDomain.startsWith("http") ? eventDomain : `https://${eventDomain}`
      console.log("[v0] Using event domain from database:", eventHost)
    } else {
      // Fallback to request origin for localhost or missing domains
      const origin = request.headers.get("origin") || request.headers.get("referer")?.split("/").slice(0, 3).join("/")
      if (!origin) {
        return NextResponse.json({ error: "Could not determine event URL for checkout" }, { status: 400 })
      }
      eventHost = origin
      console.log("[v0] Using request origin for redirect:", eventHost)
    }

    if (!eventHost) {
      return NextResponse.json({ error: "Event domain not configured" }, { status: 400 })
    }

    let stripe: Stripe
    let keySource: string
    try {
      const stripeConfig = await getEventStripe(eventId)
      stripe = stripeConfig.stripe
      keySource = stripeConfig.keySource
      console.log("[v0] Stripe initialized successfully using:", keySource)
    } catch (error) {
      const errMsg = safeErrorMessage(error)
      console.error("[v0] Error initializing Stripe:", errMsg)
      return NextResponse.json(
        { error: "Payment processing is not configured for this event. Please contact support." },
        { status: 400 },
      )
    }

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

    for (const item of items) {
      const shopItem = shopItems.find((si: any) => si.id === item.itemId)
      if (shopItem.quantity_type === "limited") {
        const available = shopItem.quantity_available - shopItem.quantity_sold
        if (available < item.quantity) {
          return NextResponse.json({ error: `Insufficient stock for ${shopItem.title}` }, { status: 400 })
        }
      }
    }

    console.log("[v0] Creating pending shop orders...")
    const orderIds: string[] = []

    for (const item of items) {
      const shopItem = shopItems.find((si: any) => si.id === item.itemId)
      const selectedOptionsJson = item.selectedOptions ? JSON.stringify(item.selectedOptions) : null
      const itemTotal = Number.parseFloat(shopItem.price) * item.quantity

      const orderResult = await sql`
        INSERT INTO shop_orders (
          event_id, user_id, shop_item_id, quantity, unit_price, total_amount, 
          status, selected_options, created_at, updated_at
        )
        VALUES (
          ${eventId}, ${session.id}, ${item.itemId}, ${item.quantity},
          ${shopItem.price}, ${itemTotal}, 'checkout', ${selectedOptionsJson}::jsonb,
          NOW(), NOW()
        )
        RETURNING id
      `
      const orderId = orderResult[0].id
      orderIds.push(orderId)
      console.log(`[v0] Created checkout order ${orderId} for item ${item.itemId}`)

      if (item.selectedOptions && Object.keys(item.selectedOptions).length > 0) {
        console.log(`[v0] Processing form responses for order ${orderId}`)

        const formFields = await sql`
          SELECT id, field_name
          FROM shop_item_order_forms
          WHERE shop_item_id = ${item.itemId}
            AND is_active = true
        `

        if (formFields.length > 0) {
          console.log(`[v0] Found ${formFields.length} form fields for item ${item.itemId}`)

          for (const field of formFields) {
            const fieldValue = item.selectedOptions[field.field_name]
            if (fieldValue !== undefined && fieldValue !== null && fieldValue !== "") {
              const valueToStore = typeof fieldValue === "object" ? JSON.stringify(fieldValue) : String(fieldValue)

              await sql`
                INSERT INTO shop_order_form_responses (shop_order_id, field_id, field_value)
                VALUES (${orderId}, ${field.id}, ${valueToStore})
              `
              console.log(`[v0] Inserted form response for field ${field.field_name}: ${valueToStore}`)
            }
          }
        }
      }
    }

    console.log(`[v0] Created ${orderIds.length} checkout orders:`, orderIds)

    let stripeCustomerId: string
    try {
      const existingCustomer = await sql`
        SELECT customer_id FROM payment_gateway_customers
        WHERE user_id = ${session.id} 
          AND event_id = ${eventId}
          AND payment_provider = 'stripe'
      `

      if (existingCustomer.length > 0) {
        stripeCustomerId = existingCustomer[0].customer_id
        console.log("[v0] Using existing Stripe customer:", stripeCustomerId)
      } else {
        const customer = await stripe.customers.create({
          email: session.email,
          name: session.name,
          metadata: {
            user_id: session.id,
            event_id: eventId,
          },
        })
        stripeCustomerId = customer.id
        console.log("[v0] Created new Stripe customer:", stripeCustomerId)

        await sql`
          INSERT INTO payment_gateway_customers (user_id, event_id, payment_provider, customer_id)
          VALUES (${session.id}, ${eventId}, 'stripe', ${stripeCustomerId})
        `
      }
    } catch (stripeError: any) {
      const safeError = safeStripeError(stripeError)
      console.error("[v0] Stripe customer creation error:", safeError.message)
      return NextResponse.json({ error: safeError.message }, { status: 500 })
    }

    const stripeLineItems = shopItems.map((shopItem: any) => {
      const cartItem = items.find((item: any) => item.itemId === shopItem.id)
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: shopItem.title,
            description: shopItem.description || undefined,
            images: shopItem.image_url ? [shopItem.image_url] : undefined,
          },
          unit_amount: Math.round(Number.parseFloat(shopItem.price) * 100),
        },
        quantity: cartItem.quantity,
      }
    })

    console.log("[v0] ===== CREATING SHOP CHECKOUT SESSION =====")
    console.log("[v0] Event ID:", eventId)
    console.log("[v0] Event Name:", eventName)
    console.log("[v0] User ID:", session.id)
    console.log("[v0] Order IDs:", orderIds.join(","))

    const paymentMetadata = {
      application: "MySchoolAuction.com",
      type: "shop_order",
      event_id: eventId,
      event_name: eventName,
      user_id: session.id,
      order_ids: orderIds.join(","),
    }

    console.log("[v0] Payment metadata prepared")

    let checkoutSession: Stripe.Checkout.Session
    try {
      checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: stripeLineItems,
        mode: "payment",
        success_url: `${eventHost}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${eventHost}/shop`,
        customer: stripeCustomerId,
        metadata: paymentMetadata,
        payment_intent_data: {
          metadata: paymentMetadata,
        },
      })
    } catch (stripeError: any) {
      const safeError = safeStripeError(stripeError)
      console.error("[v0] Stripe API error:", safeError.message)
      return NextResponse.json({ error: safeError.message }, { status: 500 })
    }

    const sessionId = String(checkoutSession.id)
    const checkoutUrl = checkoutSession.url ? String(checkoutSession.url) : null
    const paymentIntentId = checkoutSession.payment_intent ? String(checkoutSession.payment_intent) : null

    for (const orderId of orderIds) {
      await sql`
        UPDATE shop_orders
        SET stripe_session_id = ${sessionId},
            stripe_payment_intent = ${paymentIntentId},
            updated_at = NOW()
        WHERE id = ${orderId}
      `
    }

    console.log("[v0] ✓ Shop checkout session created:", sessionId, "| Key source:", keySource)
    console.log("[v0] ✓ Updated", orderIds.length, "orders with Stripe session and payment intent")
    console.log("[v0] ===== CHECKOUT SESSION COMPLETE =====")

    if (!checkoutUrl) {
      console.error("[v0] Checkout session created but no URL returned")
      return NextResponse.json({ error: "Checkout session unavailable" }, { status: 500 })
    }

    return NextResponse.json({
      url: checkoutUrl,
    })
  } catch (error: unknown) {
    const message = safeErrorMessage(error)
    console.error("[v0] Checkout failed:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
