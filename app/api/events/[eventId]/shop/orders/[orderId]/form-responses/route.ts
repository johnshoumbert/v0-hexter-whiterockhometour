import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string; orderId: string }> }) {
  try {
    console.log("[v0] GET form-responses - Starting")
    const session = await getSession()
    console.log("[v0] Session check:", session ? "authenticated" : "not authenticated")

    if (!session?.is_admin) {
      console.log("[v0] Unauthorized - not admin")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { orderId } = await params
    console.log("[v0] Fetching form responses for orderId:", orderId)

    const orderResult = await sql`
      SELECT shop_item_id FROM shop_orders WHERE id = ${orderId} LIMIT 1
    `
    console.log("[v0] Order query result:", orderResult)

    if (!orderResult || orderResult.length === 0) {
      console.log("[v0] Order not found")
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const shopItemId = orderResult[0].shop_item_id
    console.log("[v0] Shop item ID:", shopItemId)

    // Get all field definitions for this shop item
    const fieldDefinitions = await sql`
      SELECT 
        id as field_id,
        field_name,
        field_label,
        field_type,
        display_order,
        is_required
      FROM shop_item_order_forms
      WHERE shop_item_id = ${shopItemId}
      ORDER BY display_order ASC
    `
    console.log("[v0] Field definitions found:", fieldDefinitions.length)

    // Get existing responses (if any)
    const responses = await sql`
      SELECT 
        field_id,
        field_value
      FROM shop_order_form_responses
      WHERE shop_order_id = ${orderId}
    `
    console.log("[v0] Existing responses found:", responses.length)

    // Create a map of existing responses
    const responseMap = new Map()
    responses.forEach((r: any) => {
      responseMap.set(r.field_id, r.field_value)
    })

    // Combine field definitions with saved responses
    const formFields = fieldDefinitions.map((field: any) => ({
      field_id: field.field_id,
      field_name: field.field_name,
      field_label: field.field_label,
      field_type: field.field_type,
      display_order: field.display_order,
      is_required: field.is_required,
      field_value: responseMap.get(field.field_id) || "", // Use saved value or empty string
    }))

    console.log("[v0] Returning form fields:", formFields.length)
    return NextResponse.json(formFields || [])
  } catch (error) {
    console.error("[v0] Error fetching order form responses:", error)
    return NextResponse.json({ error: "Failed to fetch responses" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; orderId: string }> },
) {
  try {
    const session = await getSession()
    if (!session?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { orderId } = await params
    const body = await request.json()
    const { responses } = body // array of { field_id, field_value }

    // Update each response
    for (const response of responses) {
      await sql`
        INSERT INTO shop_order_form_responses (shop_order_id, field_id, field_value)
        VALUES (${orderId}, ${response.field_id}, ${response.field_value})
        ON CONFLICT (shop_order_id, field_id) 
        DO UPDATE SET field_value = ${response.field_value}
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating order form responses:", error)
    return NextResponse.json({ error: "Failed to update responses" }, { status: 500 })
  }
}
