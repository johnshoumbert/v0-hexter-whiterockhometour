import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params

    if (!eventId) {
      return NextResponse.json({ error: "Event ID is required" }, { status: 400 })
    }

    console.log("[v0] Fetching Stripe config for event:", eventId)

    // Fetch event-specific Stripe config from event_settings
    const result = await sql`
      SELECT value 
      FROM event_settings 
      WHERE event_id = ${eventId} AND page = 'payment' AND object = 'stripe_config'
    `

    if (result && result.length > 0) {
      const config = result[0].value
      console.log("[v0] Found event-specific Stripe config")

      // Return only the publishable key (safe for client-side)
      return NextResponse.json({
        publishableKey: config.publishable_key || null,
        connected: !!(config.publishable_key && config.secret_key),
        source: "event",
        usingDefaultStripe: false,
      })
    }

    console.log("[v0] No event-specific config, falling back to environment variables")

    // Fallback to environment variables
    return NextResponse.json({
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null,
      connected: !!(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && process.env.STRIPE_SECRET_KEY),
      source: "environment",
      usingDefaultStripe: true,
    })
  } catch (error) {
    console.error("[v0] Error fetching Stripe config:", error)
    return NextResponse.json({ error: "Failed to fetch Stripe configuration" }, { status: 500 })
  }
}
