import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyAuth } from "@/lib/auth"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; itemId: string; fieldId: string }> },
) {
  try {
    const { fieldId } = await params

    const user = await verifyAuth(request)
    if (!user || !user.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    const result = await (sql as any).unsafe(
      `
      UPDATE shop_item_order_forms
      SET 
        field_name = CASE WHEN $1::text IS NOT NULL THEN $1 ELSE field_name END,
        field_label = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE field_label END,
        field_type = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE field_type END,
        is_required = CASE WHEN $4::boolean IS NOT NULL THEN $4 ELSE is_required END,
        placeholder = CASE WHEN $5::text IS NOT NULL THEN $5 ELSE placeholder END,
        help_text = CASE WHEN $6::text IS NOT NULL THEN $6 ELSE help_text END,
        max_length = CASE WHEN $7::integer IS NOT NULL THEN $7 ELSE max_length END,
        options = CASE WHEN $8::text IS NOT NULL THEN $8::jsonb ELSE options END,
        display_order = CASE WHEN $9::integer IS NOT NULL THEN $9 ELSE display_order END
      WHERE id = $10
      RETURNING *
    `,
      [
        body.field_name || null,
        body.field_label || null,
        body.field_type || null,
        body.is_required !== undefined ? body.is_required : null,
        body.placeholder || null,
        body.help_text || null,
        body.max_length || null,
        body.options ? JSON.stringify(body.options) : null,
        body.display_order !== undefined ? body.display_order : null,
        fieldId,
      ],
    )

    if (result.length === 0) {
      return NextResponse.json({ error: "Field not found" }, { status: 404 })
    }

    return NextResponse.json({ field: result[0] })
  } catch (error) {
    console.error("Error updating order form field:", error)
    return NextResponse.json({ error: "Failed to update order form field", details: String(error) }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; itemId: string; fieldId: string }> },
) {
  console.log("[v0] DELETE order-form field endpoint called")

  try {
    const { fieldId } = await params
    console.log("[v0] DELETE order-form field - fieldId:", fieldId)

    const user = await verifyAuth(request)
    console.log("[v0] Auth check completed, user:", user ? "found" : "not found", "is_admin:", user?.is_admin)

    if (!user || !user.is_admin) {
      console.log("[v0] Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Deleting field from database...")
    await sql`
      DELETE FROM shop_item_order_forms
      WHERE id = ${fieldId}
    `

    console.log("[v0] Field deleted successfully")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting order form field:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack")
    return NextResponse.json({ error: "Failed to delete order form field" }, { status: 500 })
  }
}
