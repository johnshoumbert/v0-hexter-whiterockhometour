import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { getOrCreatePaymentGatewayCustomer } from "@/lib/payment-gateway"
import { getEventStripe } from "@/lib/stripe"
import type Stripe from "stripe"
import { safeStripeError, safeErrorMessage } from "@/lib/safe-stripe-error"

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const session = await getSession()
    const body = await request.json()
    const { amount, donor_name, donor_email, message } = body

    console.log("[v0] Creating donation checkout for event:", eventId)
    console.log("[v0] Donation amount:", amount)
    console.log("[v0] Donor name:", donor_name)
    console.log("[v0] Donor email:", donor_email)

    if (!amount || amount < 1) {
      console.error("[v0] Invalid donation amount:", amount)
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    const eventResult = await sql`
      SELECT event_name, domain FROM events WHERE id = ${eventId}
    `

    if (eventResult.length === 0) {
      console.error("[v0] Event not found:", eventId)
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    const eventName = eventResult[0].event_name
    const eventDomain = eventResult[0].domain
    console.log("[v0] Event found:", eventName)

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

    let stripeCustomerId: string | undefined
    if (session?.id) {
      console.log("[v0] Getting or creating Stripe customer for user:", session.id)
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

          await getOrCreatePaymentGatewayCustomer(session.id, eventId, "stripe", stripeCustomerId, {
            email: session.email,
            name: session.name,
          })
        }
      } catch (stripeError: any) {
        const safeError = safeStripeError(stripeError)
        console.error("[v0] Stripe customer creation error:", safeError.message)
        return NextResponse.json({ error: safeError.message }, { status: 500 })
      }
    }

    console.log("[v0] Creating pending payment record...")
    const paymentResult = await sql`
      INSERT INTO payments (
        user_id, 
        auction_id, 
        event_id, 
        amount, 
        status, 
        created_at
      )
      VALUES (
        ${session?.id || null},
        NULL,
        ${eventId},
        ${amount},
        'pending',
        NOW()
      )
      RETURNING id
    `
    const paymentId = paymentResult[0].id
    console.log("[v0] Created pending payment record:", paymentId)

    const host = request.headers.get("host") || "localhost:3000"
    const protocol = host.includes("localhost") ? "http" : "https"
    const baseUrl = `${protocol}://${host}`

    console.log("[v0] Base URL for checkout:", baseUrl)

    const paymentMetadata = {
      application: "MySchoolAuction.com",
      type: "donation",
      user_id: session?.id || "",
      donor_name: donor_name || "",
      donor_email: donor_email || "",
      message: message || "",
      event_id: eventId,
      event_name: eventName,
      payment_id: paymentId,
    }

    console.log("[v0] Creating Stripe checkout session...")
    let checkoutSession: Stripe.Checkout.Session
    try {
      checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Donation",
                description: message || "Thank you for your generous donation!",
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${eventHost}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${eventHost}/donate`,
        customer: stripeCustomerId,
        customer_email: stripeCustomerId ? undefined : donor_email || session?.email,
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

    console.log("[v0] Donation checkout session created successfully. Session ID:", sessionId)

    if (!checkoutUrl) {
      console.error("[v0] Donation checkout session created but no URL returned")
      return NextResponse.json({ error: "Checkout session unavailable" }, { status: 500 })
    }

    return NextResponse.json({
      sessionId: sessionId,
      url: checkoutUrl,
    })
  } catch (error: unknown) {
    const message = safeErrorMessage(error)
    console.error("[v0] Donation checkout error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
