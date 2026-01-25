import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyAuth } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string; itemId: string }> }) {
  try {
    const { eventId, itemId } = await params

    const fields = await sql`
      SELECT 
        id,
        shop_item_id,
        field_name,
        field_label,
        field_type,
        is_required,
        placeholder,
        help_text,
        max_length,
        options,
        display_order,
        created_at
      FROM shop_item_order_forms
      WHERE shop_item_id = ${itemId} AND is_active = true
      ORDER BY display_order ASC, created_at ASC
    `

    return NextResponse.json({ fields }, { status: 200 })
  } catch (error: any) {
    console.error("[v0] GET order-forms error:", error)

    const errorMessage = error?.message || String(error)
    if (errorMessage.includes('relation "shop_item_order_forms" does not exist')) {
      return NextResponse.json(
        {
          error: "Database table missing",
          needsMigration: true,
          migrationScript: "scripts/create-and-seed-order-forms-v1.sql",
          details: "Please run the migration script to create the shop_item_order_forms table",
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        error: "Failed to fetch order form fields",
        details: errorMessage,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string; itemId: string }> }) {
  try {
    const { eventId, itemId } = await params

    const user = await verifyAuth(request)

    if (!user || !user.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    const {
      field_name,
      field_label,
      field_type,
      is_required = true,
      placeholder,
      help_text,
      max_length,
      options,
      display_order = 0,
    } = body

    const result = await sql`
      INSERT INTO shop_item_order_forms (
        shop_item_id,
        field_name,
        field_label,
        field_type,
        is_required,
        placeholder,
        help_text,
        max_length,
        options,
        display_order,
        is_active
      )
      VALUES (
        ${itemId},
        ${field_name},
        ${field_label},
        ${field_type},
        ${is_required},
        ${placeholder || null},
        ${help_text || null},
        ${max_length || null},
        ${options ? JSON.stringify(options) : null},
        ${display_order},
        true
      )
      RETURNING *
    `

    return NextResponse.json({ field: result[0] })
  } catch (error) {
    console.error("[v0] Error creating order form field:", error)
    return NextResponse.json(
      {
        error: "Failed to create order form field",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
