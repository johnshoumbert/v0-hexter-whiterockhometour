import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/session"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const session = await getSession()
    const body = await request.json()
    const { item_type, item_id, item_name, quantity, unit_price } = body

    console.log("[v0] Tracking cart addition:", { eventId, item_type, item_id, session: !!session })

    // Get or create session ID for tracking
    const sessionId = session?.userId || request.headers.get("x-session-id") || crypto.randomUUID()
    const userId = session?.userId || null

    // Get user email and name if available
    let userEmail = null
    let userName = null
    if (userId) {
      const userData = await sql`SELECT email, name FROM users WHERE id = ${userId} LIMIT 1`
      if (userData.length > 0) {
        userEmail = userData[0].email
        userName = userData[0].name
      }
    }

    // Create cart data JSON
    const cartData = {
      items: [{
        type: item_type,
        id: item_id,
        name: item_name,
        quantity: quantity,
        price: unit_price
      }]
    }
    const cartTotal = quantity * unit_price

    // Check if this session already has a cart tracking entry
    const existing = await sql`
      SELECT id FROM abandoned_cart_tracking
      WHERE event_id = ${eventId}
        AND session_id = ${sessionId}
        AND converted = false
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (existing.length > 0) {
      // Update existing cart tracking entry
      await sql`
        UPDATE abandoned_cart_tracking
        SET 
          cart_data = ${JSON.stringify(cartData)},
          cart_total = ${cartTotal},
          user_id = ${userId},
          user_email = ${userEmail},
          user_name = ${userName},
          updated_at = NOW()
        WHERE id = ${existing[0].id}
      `
      console.log("[v0] Updated existing cart tracking")
    } else {
      // Insert new cart tracking entry
      await sql`
        INSERT INTO abandoned_cart_tracking (
          event_id,
          session_id,
          user_id,
          user_email,
          user_name,
          cart_data,
          cart_total,
          converted,
          created_at,
          updated_at
        ) VALUES (
          ${eventId},
          ${sessionId},
          ${userId},
          ${userEmail},
          ${userName},
          ${JSON.stringify(cartData)},
          ${cartTotal},
          false,
          NOW(),
          NOW()
        )
      `
      console.log("[v0] Created new cart tracking entry")
    }

    return NextResponse.json({ 
      success: true, 
      sessionId,
      message: "Cart tracked successfully" 
    })
  } catch (error: any) {
    console.error("[v0] Error tracking cart:", error)
    return NextResponse.json(
      { error: "Failed to track cart", details: error.message },
      { status: 500 }
    )
  }
}
