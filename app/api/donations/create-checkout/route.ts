import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import Stripe from "stripe"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    const body = await request.json()
    const { amount, donor_name, donor_email, message, event_id } = body

    console.log("[v0] ===== DONATION CHECKOUT START =====")
    console.log("[v0] Donation request:", {
      event_id,
      amount,
      hasEventId: !!event_id,
    })

    if (!amount || amount < 1) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    let stripeSecretKey = process.env.STRIPE_SECRET_KEY!
    let stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY!
    let keySource = "global_env"

    if (event_id) {
      console.log("[v0] Event ID provided, querying database for Stripe config...")

      const configResult = await sql`
        SELECT value 
        FROM event_settings 
        WHERE event_id = ${event_id} 
          AND page = 'payment' 
          AND object = 'stripe_config'
      `

      console.log("[v0] Database query executed")
      console.log("[v0] Result rows:", configResult.length)

      if (configResult.length > 0) {
        console.log("[v0] Config row found:", {
          hasValue: !!configResult[0].value,
          valueType: typeof configResult[0].value,
          valueKeys: configResult[0].value ? Object.keys(configResult[0].value) : [],
        })

        const config = configResult[0].value

        if (config?.secret_key) {
          stripeSecretKey = config.secret_key
          keySource = "event_database"
          console.log("[v0] Using event-specific secret key:", {
            prefix: stripeSecretKey.substring(0, 7),
            isLive:
              stripeSecretKey.startsWith("sk_live") ||
              stripeSecretKey.startsWith("rk_live") ||
              stripeSecretKey.startsWith("mk_live"),
            isTest:
              stripeSecretKey.startsWith("sk_test") ||
              stripeSecretKey.startsWith("rk_test") ||
              stripeSecretKey.startsWith("mk_test"),
          })
        } else {
          console.log("[v0] Config found but no secret_key field")
        }

        if (config?.publishable_key) {
          stripePublishableKey = config.publishable_key
          console.log("[v0] Using event-specific publishable key:", {
            prefix: stripePublishableKey.substring(0, 10),
          })
        }
      } else {
        console.log("[v0] No config found in database for event:", event_id)
      }
    } else {
      console.log("[v0] No event_id provided")
    }

    console.log("[v0] Final Stripe key source:", keySource)
    console.log("[v0] Secret key prefix:", stripeSecretKey.substring(0, 7))
    console.log("[v0] Publishable key prefix:", stripePublishableKey.substring(0, 10))

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-12-18.acacia",
    })

    const host = request.headers.get("host") || "localhost:3000"
    const protocol = host.includes("localhost") ? "http" : "https"
    const baseUrl = `${protocol}://${host}`

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
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
      success_url: `${baseUrl}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/donate`,
      metadata: {
        user_id: session?.id || "",
        donor_name: donor_name || "",
        donor_email: donor_email || "",
        message: message || "",
        event_id: event_id || "",
      },
    })

    console.log("[v0] Checkout session created:", {
      sessionId: checkoutSession.id,
      sessionIdPrefix: checkoutSession.id.substring(0, 7),
      isLive: checkoutSession.id.startsWith("cs_live"),
      isTest: checkoutSession.id.startsWith("cs_test"),
      url: checkoutSession.url,
    })
    console.log("[v0] ===== DONATION CHECKOUT END =====")

    return NextResponse.json({ sessionId: checkoutSession.id, url: checkoutSession.url })
  } catch (error) {
    console.error("[v0] Error creating donation checkout:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
