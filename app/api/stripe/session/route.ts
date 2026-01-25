import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import Stripe from "stripe"

export async function POST(request: NextRequest) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { winId, amount } = await request.json()

    if (!winId || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const winnerResult = await sql`
      SELECT w.*, a.title as auction_title, a.event_id, e.event_name, e.domain
      FROM winners w
      JOIN auctions a ON w.auction_id = a.id
      JOIN events e ON w.event_id = e.id
      WHERE w.id = ${winId}
    `

    if (winnerResult.length === 0) {
      return NextResponse.json({ error: "Winner not found" }, { status: 404 })
    }

    const winner = winnerResult[0]
    const eventId = winner.event_id
    const eventName = winner.event_name
    const eventDomain = winner.domain

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

    const configResult = await sql`
      SELECT value 
      FROM event_settings 
      WHERE event_id = ${eventId} 
        AND page = 'payment' 
        AND object = 'stripe_config'
    `

    if (configResult.length === 0 || !configResult[0].value?.secret_key) {
      return NextResponse.json(
        { error: "Stripe not configured for this event. Please configure payment methods in admin settings." },
        { status: 400 },
      )
    }

    const config = configResult[0].value
    let stripe: Stripe
    let keySource: string

    if (config.secret_key.startsWith("mk_")) {
      stripe = new Stripe(config.secret_key, {
        apiVersion: "2024-12-18.acacia",
      })
      keySource = "oauth_merchant_key"
      console.log(
        "[v0] Payment link using OAuth merchant key for account:",
        config.account_id?.substring(0, 12) + "...",
      )
    } else {
      stripe = new Stripe(config.secret_key, {
        apiVersion: "2024-12-18.acacia",
      })
      keySource = "event_database"
      console.log("[v0] Payment link using event-specific Stripe secret key")
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: winner.auction_title || "Auction Win Payment",
              description: `Payment for auction item - ${eventName}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${eventHost}/user/wins?payment=success`,
      cancel_url: `${eventHost}/user/wins?payment=cancelled`,
      metadata: {
        application: "MySchoolAuction.com",
        type: "auction_win",
        event_id: eventId,
        event_name: eventName,
        winId: winId.toString(),
        userId: user.id.toString(),
        auction_id: winner.auction_id,
      },
      payment_intent_data: {
        metadata: {
          application: "MySchoolAuction.com",
          type: "auction_win",
          event_id: eventId,
          event_name: eventName,
          winId: winId.toString(),
          userId: user.id.toString(),
          auction_id: winner.auction_id,
        },
      },
    })

    console.log("[v0] ✓ Payment link created for win:", winId, "| Key source:", keySource)

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("[v0] Create Stripe session error:", error)
    return NextResponse.json({ error: "Failed to create payment session" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const winId = searchParams.get("winId")

    if (!winId) {
      return NextResponse.json({ error: "Missing winId parameter" }, { status: 400 })
    }

    console.log("[v0] Creating payment session for winner:", winId)

    const winnerResult = await sql`
      SELECT w.*, a.title as auction_title, a.event_id, e.event_name, u.stripe_customer_id, e.domain
      FROM winners w
      JOIN auctions a ON w.auction_id = a.id
      JOIN events e ON w.event_id = e.id
      JOIN users u ON w.user_id = u.id
      WHERE w.id = ${winId}
    `

    if (winnerResult.length === 0) {
      console.log("[v0] Winner not found:", winId)
      return NextResponse.json({ error: "Winner not found" }, { status: 404 })
    }

    const winner = winnerResult[0]
    const eventId = winner.event_id
    const eventName = winner.event_name
    const amount = winner.final_bid
    const eventDomain = winner.domain

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

    console.log("[v0] Winner details:", { eventId, eventName, amount, title: winner.auction_title })

    const configResult = await sql`
      SELECT value 
      FROM event_settings 
      WHERE event_id = ${eventId} 
        AND page = 'payment' 
        AND object = 'stripe_config'
    `

    if (configResult.length === 0 || !configResult[0].value?.secret_key) {
      console.log("[v0] Stripe not configured for event:", eventId)
      return NextResponse.json(
        { error: "Stripe not configured for this event. Please configure payment methods in admin settings." },
        { status: 400 },
      )
    }

    const config = configResult[0].value
    let stripe: Stripe

    if (config.secret_key.startsWith("mk_")) {
      stripe = new Stripe(config.secret_key, {
        apiVersion: "2024-12-18.acacia",
      })
      console.log("[v0] Using OAuth merchant key for account:", config.account_id?.substring(0, 12) + "...")
    } else {
      stripe = new Stripe(config.secret_key, {
        apiVersion: "2024-12-18.acacia",
      })
      console.log("[v0] Using event-specific Stripe key")
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: winner.auction_title || "Auction Win Payment",
              description: `Payment for auction item - ${eventName}`,
            },
            unit_amount: Math.round(Number(amount) * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${eventHost}/user/wins?payment=success`,
      cancel_url: `${eventHost}/user/wins?payment=cancelled`,
      customer: winner.stripe_customer_id || undefined,
      metadata: {
        application: "MySchoolAuction.com",
        type: "auction_win",
        event_id: eventId,
        event_name: eventName,
        winId: winId.toString(),
        userId: winner.user_id.toString(),
        auction_id: winner.auction_id,
      },
      payment_intent_data: {
        metadata: {
          application: "MySchoolAuction.com",
          type: "auction_win",
          event_id: eventId,
          event_name: eventName,
          winId: winId.toString(),
          userId: winner.user_id.toString(),
          auction_id: winner.auction_id,
        },
      },
    })

    console.log("[v0] ✓ Stripe session created, redirecting to:", session.url)

    // Redirect to the Stripe checkout page
    return NextResponse.redirect(session.url!)
  } catch (error) {
    console.error("[v0] Create Stripe session error:", error)
    return NextResponse.json(
      {
        error: "Failed to create payment session",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
