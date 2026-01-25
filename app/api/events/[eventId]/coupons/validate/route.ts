import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const sql = getDb()
    const body = await request.json()

    const { code, type, items, totalAmount, userEmail } = body

    console.log("[v0] Validating coupon:", code, "for type:", type, "eventId:", eventId)
    console.log("[v0] Total amount:", totalAmount)
    console.log("[v0] User email:", userEmail)
    console.log("[v0] Items:", JSON.stringify(items, null, 2))

    // Find the coupon
    const coupons = await sql`
      SELECT * FROM discount_codes
      WHERE event_id = ${eventId}
      AND UPPER(code) = ${code.toUpperCase()}
      AND is_active = true
    `

    console.log("[v0] Found coupons:", coupons.length)

    if (coupons.length === 0) {
      return NextResponse.json({ error: "Invalid coupon code for this event" }, { status: 400 })
    }

    const coupon = coupons[0]

    if (coupon.event_id !== eventId) {
      console.log("[v0] Coupon event mismatch - coupon belongs to:", coupon.event_id, "but validating for:", eventId)
      return NextResponse.json({ error: "This coupon is not valid for this event" }, { status: 400 })
    }

    console.log("[v0] Coupon details:", {
      id: coupon.id,
      code: coupon.code,
      event_id: coupon.event_id,
      type: coupon.discount_type,
      amount: coupon.discount_amount,
      percentage: coupon.discount_percentage,
      applies_to: coupon.applies_to,
      applies_to_item_ids: coupon.applies_to_item_ids,
      expiration: coupon.expiration_date,
      current_uses: coupon.current_uses,
      max_uses: coupon.max_uses,
    })

    // Check expiration
    if (coupon.expiration_date && new Date(coupon.expiration_date) < new Date()) {
      return NextResponse.json({ error: "This coupon has expired" }, { status: 400 })
    }

    // Check usage limits
    if (coupon.current_uses >= coupon.max_uses) {
      return NextResponse.json({ error: "This coupon has reached its usage limit" }, { status: 400 })
    }

    // Check email restrictions
    if (!coupon.allow_all_users && coupon.allowed_emails && coupon.allowed_emails.length > 0) {
      if (!coupon.allowed_emails.includes(userEmail)) {
        return NextResponse.json({ error: "This coupon is not available for your account" }, { status: 400 })
      }
    }

    // Check product type restrictions
    const appliesTo = coupon.applies_to || "cart"
    console.log("[v0] Coupon applies to:", appliesTo, "| Checkout type:", type)

    if (appliesTo !== "cart") {
      if (type === "shop" && appliesTo !== "shop") {
        return NextResponse.json({ error: "This coupon is not valid for shop items" }, { status: 400 })
      }
      if (type === "ticket" && appliesTo !== "ticket") {
        return NextResponse.json({ error: "This coupon is not valid for tickets" }, { status: 400 })
      }
    }

    // Calculate discount
    let discountAmount = 0
    let applicableTotal = Number.parseFloat(totalAmount)

    // If specific items are set, only apply to those items
    if (coupon.applies_to_item_ids && coupon.applies_to_item_ids.length > 0 && items && items.length > 0) {
      console.log("[v0] Filtering for specific items:", coupon.applies_to_item_ids)

      // Calculate total only for applicable items
      applicableTotal = 0
      for (const item of items) {
        // Get item ID - could be ticket_id, item_id, or id
        const itemId = item.ticket_id || item.item_id || item.id

        console.log("[v0] Checking item:", {
          name: item.name,
          ticket_id: item.ticket_id,
          item_id: item.item_id,
          id: item.id,
          resolvedId: itemId,
          price: item.amount || item.price,
          quantity: item.quantity,
        })

        if (itemId && coupon.applies_to_item_ids.includes(itemId)) {
          const itemPrice = Number.parseFloat(item.amount || item.price || 0)
          const itemQuantity = Number.parseInt(item.quantity || 1)
          const itemTotal = itemPrice * itemQuantity
          applicableTotal += itemTotal
          console.log("[v0] Item MATCHES - adding", itemTotal, "to applicable total")
        } else {
          console.log("[v0] Item does NOT match")
        }
      }

      console.log("[v0] Final applicable total:", applicableTotal)

      if (applicableTotal === 0) {
        return NextResponse.json({ error: "This coupon does not apply to any items in your cart" }, { status: 400 })
      }
    }

    // Calculate discount based on type
    if (coupon.discount_type === "fixed") {
      discountAmount = Math.min(Number.parseFloat(coupon.discount_amount), applicableTotal)
    } else if (coupon.discount_type === "percentage") {
      discountAmount = (applicableTotal * Number.parseFloat(coupon.discount_percentage)) / 100
    }

    // Round to 2 decimal places
    discountAmount = Math.round(discountAmount * 100) / 100
    const newTotal = Math.max(0, Number.parseFloat(totalAmount) - discountAmount)

    console.log("[v0] Final discount calculation:", {
      discountType: coupon.discount_type,
      applicableTotal,
      discountAmount,
      originalTotal: totalAmount,
      newTotal,
    })

    return NextResponse.json({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_amount: coupon.discount_amount,
        discount_percentage: coupon.discount_percentage,
      },
      discountAmount,
      newTotal,
      applicableTotal,
    })
  } catch (error: any) {
    console.error("[v0] Error validating coupon:", error)
    return NextResponse.json({ error: "Failed to validate coupon", details: error.message }, { status: 500 })
  }
}
