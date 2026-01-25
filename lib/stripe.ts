import "server-only"
import Stripe from "stripe"
import { sql } from "@/lib/db"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
  maxNetworkRetries: 2,
})

export async function getEventStripe(eventId: string): Promise<{ stripe: Stripe; keySource: string }> {
  const configResult = await sql`
    SELECT value 
    FROM event_settings 
    WHERE event_id = ${eventId} 
      AND page = 'payment' 
      AND object = 'stripe_config'
  `

  if (configResult.length === 0 || !configResult[0].value?.secret_key) {
    console.log("[v0] No event-specific Stripe config found, using global integration")

    // Fallback to global Stripe configuration
    const globalStripeKey = process.env.STRIPE_SECRET_KEY

    if (!globalStripeKey) {
      throw new Error("Stripe not configured for this event or globally")
    }

    const stripeInstance = new Stripe(globalStripeKey, {
      apiVersion: "2024-12-18.acacia",
      maxNetworkRetries: 2,
    })

    return { stripe: stripeInstance, keySource: "global_integration" }
  }

  const config = configResult[0].value
  let stripeInstance: Stripe
  let keySource: string

  if (config.secret_key.startsWith("mk_")) {
    stripeInstance = new Stripe(config.secret_key, {
      apiVersion: "2024-12-18.acacia",
      maxNetworkRetries: 2,
    })
    keySource = "oauth_merchant_key"
    console.log("[v0] Using OAuth merchant key for account:", config.account_id?.substring(0, 12) + "...")
  } else {
    stripeInstance = new Stripe(config.secret_key, {
      apiVersion: "2024-12-18.acacia",
      maxNetworkRetries: 2,
    })
    keySource = "event_database"
    console.log("[v0] Using event-specific Stripe secret key")
  }

  return { stripe: stripeInstance, keySource }
}
