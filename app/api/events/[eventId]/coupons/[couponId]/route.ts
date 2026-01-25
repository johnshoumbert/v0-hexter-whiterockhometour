import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getUserSession } from "@/lib/session"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; couponId: string }> },
) {
  try {
    const { eventId, couponId } = await params
    const session = await getUserSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = getDb()
    const body = await request.json()

    console.log("[v0] Updating coupon:", couponId)
    console.log("[v0] Update data:", JSON.stringify(body, null, 2))

    const {
      description,
      discountType,
      discountAmount,
      discountPercentage,
      allowedEmails,
      allowAllUsers,
      maxUses,
      expirationDate,
      isActive,
      appliesTo,
      appliesToItemIds,
    } = body

    await sql`
      UPDATE discount_codes
      SET 
        description = ${description || null},
        discount_type = ${discountType},
        discount_amount = ${discountType === "fixed" ? discountAmount : 0},
        discount_percentage = ${discountType === "percentage" ? discountPercentage : 0},
        allowed_emails = ${allowedEmails && allowedEmails.length > 0 ? allowedEmails : null},
        allow_all_users = ${allowAllUsers || false},
        max_uses = ${maxUses || 1},
        expiration_date = ${expirationDate || null},
        is_active = ${isActive !== undefined ? isActive : true},
        applies_to = ${appliesTo || "cart"},
        applies_to_item_ids = ${appliesToItemIds && appliesToItemIds.length > 0 ? appliesToItemIds : null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${couponId} AND event_id = ${eventId}
    `

    console.log("[v0] Coupon updated successfully")
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error updating coupon:", error)
    return NextResponse.json({ error: "Failed to update coupon" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; couponId: string }> },
) {
  try {
    const { eventId, couponId } = await params
    const session = await getUserSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = getDb()

    await sql`
      DELETE FROM discount_codes
      WHERE id = ${couponId} AND event_id = ${eventId}
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error deleting coupon:", error)
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 })
  }
}
