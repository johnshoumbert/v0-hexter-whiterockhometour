import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.NEON_DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const eventId = searchParams.get("state")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")

    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    // Handle OAuth errors
    if (error) {
      console.error("[v0] Stripe OAuth error:", error, errorDescription)
      const redirectUrl = eventId
        ? `${appUrl}/admin/payment-methods?event_id=${eventId}&error=${encodeURIComponent(errorDescription || error)}`
        : `${appUrl}/admin/payment-methods?error=${encodeURIComponent(errorDescription || error)}`
      return NextResponse.redirect(redirectUrl)
    }

    if (!code) {
      return NextResponse.redirect(`${appUrl}/admin/payment-methods?error=${encodeURIComponent("Missing OAuth code")}`)
    }

    if (!eventId) {
      return NextResponse.redirect(`${appUrl}/admin/payment-methods?error=${encodeURIComponent("Missing event ID")}`)
    }

    const clientId = process.env.STRIPE_CONNECT_CLIENT_ID
    const clientSecret = process.env.STRIPE_SECRET_KEY // Platform's secret key

    if (!clientId || !clientSecret) {
      console.error("[v0] Missing Stripe OAuth credentials")
      return NextResponse.redirect(
        `${appUrl}/admin/payment-methods?error=${encodeURIComponent("Stripe OAuth not properly configured")}`,
      )
    }

    console.log("[v0] Exchanging OAuth code for credentials...")

    // Exchange authorization code for access token
    const tokenResponse = await fetch("https://connect.stripe.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    })

    const stripeOAuth = await tokenResponse.json()

    if (stripeOAuth.error) {
      console.error("[v0] Stripe OAuth token error:", stripeOAuth)
      return NextResponse.redirect(
        `${appUrl}/admin/payment-methods?error=${encodeURIComponent(stripeOAuth.error_description || stripeOAuth.error)}`,
      )
    }

    console.log("[v0] OAuth successful, received credentials for account:", stripeOAuth.stripe_user_id)

    const {
      access_token, // mk_live_xxx or mk_test_xxx (merchant key)
      refresh_token, // rt_xxx
      stripe_user_id, // acct_123 (connected account ID)
      stripe_publishable_key, // pk_live_xxx or pk_test_xxx
      scope,
    } = stripeOAuth

    // Save credentials to database
    const config = {
      secret_key: access_token, // This is the merchant key (mk_)
      publishable_key: stripe_publishable_key,
      refresh_token,
      account_id: stripe_user_id, // Required for using merchant keys with Stripe Connect
      scope,
      connected_via_oauth: true,
      connected_at: new Date().toISOString(),
    }

    await sql`
      INSERT INTO event_settings (event_id, page, object, value)
      VALUES (
        ${eventId},
        'payment',
        'stripe_config',
        ${JSON.stringify(config)}
      )
      ON CONFLICT (event_id, page, object)
      DO UPDATE SET
        value = ${JSON.stringify(config)},
        updated_at = CURRENT_TIMESTAMP
    `

    console.log("[v0] Stripe config saved to database for event:", eventId)

    // Redirect back to payment methods page with success message
    return NextResponse.redirect(`${appUrl}/admin/payment-methods?connected=success&account_id=${stripe_user_id}`)
  } catch (error) {
    console.error("[v0] Error in Stripe OAuth callback:", error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/payment-methods?error=${encodeURIComponent("Failed to complete OAuth flow")}`,
    )
  }
}
