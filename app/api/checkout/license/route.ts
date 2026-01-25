import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { sql } from "@/lib/db"
import { generateLicenseCode } from "@/lib/license"

const PRICING = {
  single: { amount: 25000, events: 1, name: "Single Event License" },
  double: { amount: 40000, events: 2, name: "Double Event License" },
  triple: { amount: 50000, events: 3, name: "Triple Event License" },
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Starting license checkout")

    const body = await request.json()
    const { planId, email } = body
    console.log("[v0] Plan ID:", planId, "Email:", email)

    if (!planId || !PRICING[planId as keyof typeof PRICING]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    }

    const plan = PRICING[planId as keyof typeof PRICING]
    console.log("[v0] Selected plan:", plan)

    const code = generateLicenseCode()

    const licenseResult = await sql`
      INSERT INTO licenses (email, event_count, amount, status, code, used, created_at, updated_at)
      VALUES (${email}, ${plan.events}, ${plan.amount / 100}, 'pending', ${code}, FALSE, NOW(), NOW())
      RETURNING id
    `

    console.log("[v0] License result:", licenseResult)
    const licenseId = licenseResult[0]?.id

    if (!licenseId) {
      throw new Error("Failed to create license record")
    }

    console.log("[v0] Created license ID:", licenseId, "Code:", code)

    // This ensures the redirect goes to the correct domain (myschoolauction) instead of hexterptsa.com
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: plan.name,
              description: `License for ${plan.events} event${plan.events > 1 ? "s" : ""}`,
            },
            unit_amount: plan.amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      customer_email: email,
      success_url: `${baseUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
      metadata: {
        email: email,
        licenseId: licenseId,
        planId: planId,
        eventCount: plan.events.toString(),
        licenseCode: code,
      },
    })

    console.log("[v0] Checkout session created:", checkoutSession.id)
    console.log("[v0] Success URL will redirect to:", `${baseUrl}/pricing/success`)

    await sql`
      UPDATE licenses 
      SET stripe_session_id = ${checkoutSession.id}, updated_at = NOW()
      WHERE id = ${licenseId}
    `

    console.log("[v0] License updated with session ID")

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error("[v0] License checkout error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create checkout session" },
      { status: 500 },
    )
  }
}
