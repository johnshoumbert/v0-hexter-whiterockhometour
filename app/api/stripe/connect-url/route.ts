import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("event_id")

    if (!eventId) {
      return NextResponse.json({ error: "Event ID is required" }, { status: 400 })
    }

    return generateConnectUrl(eventId)
  } catch (error) {
    console.error("[v0] Error generating Stripe Connect URL:", error)
    return NextResponse.json({ error: "Failed to generate Connect URL" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { eventId } = body

    if (!eventId) {
      return NextResponse.json({ error: "Event ID is required" }, { status: 400 })
    }

    return generateConnectUrl(eventId)
  } catch (error) {
    console.error("[v0] Error generating Stripe Connect URL:", error)
    return NextResponse.json({ error: "Failed to generate Connect URL" }, { status: 500 })
  }
}

function generateConnectUrl(eventId: string) {
  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!clientId) {
    console.error("[v0] STRIPE_CONNECT_CLIENT_ID not configured")
    return NextResponse.json(
      {
        error:
          "Stripe Connect is not configured. Please add STRIPE_CONNECT_CLIENT_ID environment variable to enable OAuth.",
        needsSetup: true,
      },
      { status: 400 },
    )
  }

  if (!appUrl) {
    console.error("[v0] NEXT_PUBLIC_APP_URL not configured")
    return NextResponse.json(
      {
        error: "Application URL not configured. Please add NEXT_PUBLIC_APP_URL environment variable.",
        needsSetup: true,
      },
      { status: 400 },
    )
  }

  // Stripe Connect OAuth parameters
  const params = new URLSearchParams({
    client_id: clientId,
    scope: "read_write",
    response_type: "code",
    redirect_uri: `${appUrl}/api/stripe/oauth/callback`,
    state: eventId, // Pass event ID through OAuth flow
  })

  const url = `https://connect.stripe.com/oauth/authorize?${params.toString()}`

  console.log("[v0] Generated Stripe Connect URL for event:", eventId)

  return NextResponse.json({ url })
}
