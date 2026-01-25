import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("event_id")

    if (eventId) {
      const isEventAdmin = await sql`
        SELECT 1 FROM event_users 
        WHERE event_id = ${eventId} AND user_id = ${user.id} AND role = 'admin'
      `

      if (!user.is_admin && (!isEventAdmin || isEventAdmin.length === 0)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    } else if (!user.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!eventId) {
      const connected = !!(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && process.env.STRIPE_SECRET_KEY)

      return NextResponse.json({
        connected,
        publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
        hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
        hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
        source: "environment",
        connectedViaOAuth: false,
      })
    }

    try {
      const result = await sql`
        SELECT value FROM event_settings 
        WHERE event_id = ${eventId} AND page = 'payment' AND object = 'stripe_config'
      `

      if (result && result.length > 0) {
        const config = result[0].value

        const maskKey = (key: string) => {
          if (!key || key.length < 12) return ""
          const prefix = key.substring(0, 7)
          const suffix = key.substring(key.length - 4)
          return `${prefix}${"•".repeat(12)}${suffix}`
        }

        return NextResponse.json({
          connected: !!(config.publishable_key && config.secret_key),
          publishableKey: config.publishable_key || "",
          secretKey: config.secret_key ? maskKey(config.secret_key) : "",
          webhookSecret: config.webhook_secret ? maskKey(config.webhook_secret) : "",
          hasSecretKey: !!config.secret_key,
          hasWebhookSecret: !!config.webhook_secret,
          accountId: config.account_id || "",
          connectedViaOAuth: config.connected_via_oauth || false,
          useClientSide: config.use_client_side || false,
          source: "event",
        })
      }
    } catch (dbError) {
      console.error("[v0] Database query error:", dbError)
    }

    const connected = !!(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && process.env.STRIPE_SECRET_KEY)

    return NextResponse.json({
      connected,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
      hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      source: "environment",
      connectedViaOAuth: false,
    })
  } catch (error) {
    console.error("[v0] Error fetching Stripe config:", error)
    return NextResponse.json({ error: "Failed to fetch configuration" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { publishableKey, secretKey, webhookSecret, accountId, useClientSide, eventId } = await request.json()

    if (eventId) {
      const isEventAdmin = await sql`
        SELECT 1 FROM event_users 
        WHERE event_id = ${eventId} AND user_id = ${user.id} AND role = 'admin'
      `

      if (!user.is_admin && (!isEventAdmin || isEventAdmin.length === 0)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    } else if (!user.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!publishableKey) {
      return NextResponse.json({ error: "Publishable key is required" }, { status: 400 })
    }

    if (!publishableKey.startsWith("pk_")) {
      return NextResponse.json({ error: "Invalid publishable key format" }, { status: 400 })
    }

    if (secretKey) {
      if (!secretKey.startsWith("sk_") && !secretKey.startsWith("rk_") && !secretKey.startsWith("mk_")) {
        return NextResponse.json(
          { error: "Invalid key format. Must start with sk_ (secret), rk_ (restricted), or mk_ (merchant)" },
          { status: 400 },
        )
      }

      if (secretKey.includes("...") || secretKey.length < 30) {
        return NextResponse.json({ error: "Please enter a complete API key, not a placeholder" }, { status: 400 })
      }

      if (secretKey.startsWith("mk_") && !accountId) {
        return NextResponse.json(
          { error: "Merchant keys require a Stripe Account ID (acct_). Please provide the connected account ID." },
          { status: 400 },
        )
      }
    }

    if (accountId && !accountId.startsWith("acct_")) {
      return NextResponse.json({ error: "Invalid account ID format. Must start with acct_" }, { status: 400 })
    }

    if (!eventId) {
      return NextResponse.json({
        success: true,
        message:
          "Note: Stripe keys are stored as environment variables. To persist these keys, add them to your Vercel project environment variables.",
        temporary: true,
      })
    }

    let existingConfig: any = {}
    try {
      const result = await sql`
        SELECT value FROM event_settings 
        WHERE event_id = ${eventId} AND page = 'payment' AND object = 'stripe_config'
      `

      if (result && result.length > 0) {
        existingConfig = result[0].value
      }
    } catch (fetchError) {
      console.log("[v0] No existing config found, creating new one")
    }

    const updatedConfig = {
      publishable_key: publishableKey,
      secret_key: secretKey || existingConfig.secret_key || null,
      webhook_secret: webhookSecret !== undefined ? webhookSecret : existingConfig.webhook_secret || null,
      account_id: accountId || existingConfig.account_id || null,
      is_merchant_key: secretKey?.startsWith("mk_") || existingConfig.is_merchant_key || false,
      use_client_side: useClientSide !== undefined ? useClientSide : existingConfig.use_client_side || false,
      connected_via_oauth: existingConfig.connected_via_oauth || false,
      refresh_token: existingConfig.refresh_token || null,
      scope: existingConfig.scope || null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }

    await sql`
      INSERT INTO event_settings (event_id, page, object, value, created_at, updated_at)
      VALUES (${eventId}, 'payment', 'stripe_config', ${JSON.stringify(updatedConfig)}, NOW(), NOW())
      ON CONFLICT (event_id, page, object) 
      DO UPDATE SET value = ${JSON.stringify(updatedConfig)}, updated_at = NOW()
    `

    console.log("[v0] Stripe configuration saved successfully for event:", eventId)

    return NextResponse.json({
      success: true,
      message: "Stripe configuration saved successfully",
    })
  } catch (error) {
    console.error("[v0] Error saving Stripe config:", error)
    return NextResponse.json({ error: "Failed to save configuration" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("event_id")

    if (eventId) {
      const isEventAdmin = await sql`
        SELECT 1 FROM event_users 
        WHERE event_id = ${eventId} AND user_id = ${user.id} AND role = 'admin'
      `

      if (!user.is_admin && (!isEventAdmin || isEventAdmin.length === 0)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    } else if (!user.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required. Cannot delete global environment variables." },
        { status: 400 },
      )
    }

    // Delete the Stripe configuration for this event
    await sql`
      DELETE FROM event_settings 
      WHERE event_id = ${eventId} AND page = 'payment' AND object = 'stripe_config'
    `

    console.log("[v0] Stripe configuration deleted successfully for event:", eventId)

    return NextResponse.json({
      success: true,
      message: "Stripe configuration removed successfully",
    })
  } catch (error) {
    console.error("[v0] Error deleting Stripe config:", error)
    return NextResponse.json({ error: "Failed to remove configuration" }, { status: 500 })
  }
}
