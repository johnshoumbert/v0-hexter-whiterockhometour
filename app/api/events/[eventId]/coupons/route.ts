import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getUserSession } from "@/lib/session"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const sql = getDb()

    console.log("[v0] Fetching coupons for event:", eventId)

    // Ensure table exists before querying
    await sql`
      CREATE TABLE IF NOT EXISTS discount_codes (
        id SERIAL PRIMARY KEY,
        event_id VARCHAR(255) NOT NULL,
        code VARCHAR(255) NOT NULL,
        description TEXT,
        discount_type VARCHAR(50) NOT NULL,
        discount_amount DECIMAL(10, 2),
        discount_percentage DECIMAL(5, 2),
        allowed_emails TEXT[],
        allow_all_users BOOLEAN DEFAULT FALSE,
        max_uses INT DEFAULT 1,
        current_uses INT DEFAULT 0,
        expiration_date TIMESTAMP,
        created_by VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        applies_to VARCHAR(50) DEFAULT 'cart',
        applies_to_item_ids TEXT[]
      )
    `

    const coupons = await sql`
      SELECT 
        dc.id,
        dc.code,
        dc.description,
        dc.discount_type,
        dc.discount_amount,
        dc.discount_percentage,
        dc.allowed_emails,
        dc.allow_all_users,
        dc.max_uses,
        dc.expiration_date,
        dc.is_active,
        dc.created_at,
        dc.applies_to,
        dc.applies_to_item_ids,
        COALESCE(
          (
            SELECT COUNT(*)
            FROM coupon_usage cu
            JOIN payments p ON p.id = cu.order_id::uuid
            WHERE cu.coupon_id = dc.id
            AND (p.status = 'succeeded' OR p.status = 'completed')
          ),
          0
        )::integer as current_uses
      FROM discount_codes dc
      WHERE dc.event_id = ${eventId}
      ORDER BY dc.created_at DESC
    `

    console.log("[v0] Coupons fetched successfully:", coupons.length)
    if (coupons.length > 0) {
      console.log("[v0] First coupon sample:", JSON.stringify(coupons[0], null, 2))
    }
    return NextResponse.json({ coupons })
  } catch (error: any) {
    console.error("[v0] Error fetching coupons:", error.message)
    return NextResponse.json({ coupons: [] }, { status: 200 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    console.log("[v0] Creating coupon for event:", eventId)

    const session = await getUserSession()
    console.log("[v0] User session:", session?.userId ? "Found" : "Not found")

    if (!session) {
      console.log("[v0] Unauthorized - no session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = getDb()
    const body = await request.json()
    console.log("[v0] Request body:", JSON.stringify(body, null, 2))

    const {
      code,
      description,
      discountType,
      discountAmount,
      discountPercentage,
      allowedEmails,
      allowAllUsers,
      maxUses,
      expirationDate,
      appliesTo,
      appliesToItemIds,
    } = body

    // Validate inputs
    if (!code) {
      console.log("[v0] Validation failed: No code")
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 })
    }

    if (discountType === "fixed" && (!discountAmount || discountAmount <= 0)) {
      console.log("[v0] Validation failed: Invalid discount amount")
      return NextResponse.json({ error: "Discount amount must be greater than 0" }, { status: 400 })
    }

    if (discountType === "percentage" && (!discountPercentage || discountPercentage <= 0 || discountPercentage > 100)) {
      console.log("[v0] Validation failed: Invalid discount percentage")
      return NextResponse.json({ error: "Discount percentage must be between 1 and 100" }, { status: 400 })
    }

    console.log("[v0] Checking for existing coupon code:", code.toUpperCase())

    // Check if code already exists for this event
    const existing = await sql`
      SELECT id FROM discount_codes 
      WHERE event_id = ${eventId} AND code = ${code.toUpperCase()}
    `

    if (existing.length > 0) {
      console.log("[v0] Coupon code already exists for this event")
      return NextResponse.json({ error: "Coupon code already exists for this event" }, { status: 400 })
    }

    console.log("[v0] Inserting new coupon...")

    const result = await sql`
      INSERT INTO discount_codes (
        event_id,
        code,
        description,
        discount_type,
        discount_amount,
        discount_percentage,
        allowed_emails,
        allow_all_users,
        max_uses,
        current_uses,
        expiration_date,
        created_by,
        is_active,
        applies_to,
        applies_to_item_ids
      ) VALUES (
        ${eventId},
        ${code.toUpperCase()},
        ${description || null},
        ${discountType},
        ${discountType === "fixed" ? discountAmount : 0},
        ${discountType === "percentage" ? discountPercentage : 0},
        ${allowedEmails && allowedEmails.length > 0 ? allowedEmails : null},
        ${allowAllUsers || false},
        ${maxUses || 1},
        ${0},
        ${expirationDate || null},
        ${session.userId},
        ${true},
        ${appliesTo || "cart"},
        ${appliesToItemIds && appliesToItemIds.length > 0 ? appliesToItemIds : null}
      )
      RETURNING id, code
    `

    console.log("[v0] Coupon created successfully:", result[0])
    return NextResponse.json({ success: true, coupon: result[0] })
  } catch (error: any) {
    console.error("[v0] Error creating coupon:", error)
    console.error("[v0] Error message:", error.message)
    console.error("[v0] Error stack:", error.stack)
    return NextResponse.json({ error: `Failed to create coupon: ${error.message}` }, { status: 500 })
  }
}
