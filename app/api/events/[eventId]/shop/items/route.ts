import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { invalidateEventCache } from "@/stores/event-store"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get("active") === "true"

    let query = `
      SELECT 
        si.*,
        COALESCE(SUM(so.quantity), 0)::INTEGER as quantity_sold
      FROM shop_items si
      LEFT JOIN shop_orders so ON si.id = so.shop_item_id
      WHERE si.event_id = $1
    `

    const queryParams: any[] = [eventId]

    if (activeOnly) {
      query += " AND si.is_active = true"
    }

    query += " GROUP BY si.id ORDER BY si.display_order ASC, si.created_at DESC"

    const result = await sql.query(query, queryParams)

    return NextResponse.json({ items: result || [] })
  } catch (error) {
    console.error("Error fetching shop items:", error)
    return NextResponse.json({ error: "Failed to fetch shop items" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const session = await getSession()
    const { eventId } = await params

    console.log("[v0] POST shop item - Event ID:", eventId)

    if (!session) {
      console.log("[v0] POST shop item - No session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (eventId) {
      const isEventAdmin = await sql`
        SELECT 1 FROM event_users 
        WHERE event_id = ${eventId} AND user_id = ${session.id} AND role = 'admin'
      `

      if (!session.is_admin && (!isEventAdmin || isEventAdmin.length === 0)) {
        console.log("[v0] POST shop item - Not authorized")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    } else if (!session.is_admin) {
      console.log("[v0] POST shop item - Not authorized (no eventId)")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    console.log("[v0] POST shop item - Body:", JSON.stringify(body))

    const {
      title,
      description,
      price,
      image_url,
      additional_images,
      category,
      quantity_type,
      quantity_available,
      is_active,
      featured,
      options,
      orderFormFields,
    } = body

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

    console.log("[v0] POST shop item - Inserting item with slug:", slug)

    const result = await sql`
      INSERT INTO shop_items (
        event_id, title, description, price, image_url, additional_images, category,
        quantity_type, quantity_available, is_active, featured, slug, options
      )
      VALUES (
        ${eventId}, ${title}, ${description || ""}, ${price}, ${image_url || ""}, 
        ${additional_images || "[]"}, ${category || ""},
        ${quantity_type}, ${quantity_available}, ${is_active}, ${featured}, ${slug}, ${JSON.stringify(options || [])}
      )
      RETURNING *
    `

    console.log("[v0] POST shop item - Item created:", result[0]?.id)

    const shopItemId = result[0]?.id

    if (orderFormFields && Array.isArray(orderFormFields) && orderFormFields.length > 0) {
      console.log("[v0] POST shop item - Inserting order form fields:", orderFormFields.length)
      for (let i = 0; i < orderFormFields.length; i++) {
        const field = orderFormFields[i]
        const fieldLabel = field.field_label || field.label
        const fieldName = field.field_name || fieldLabel?.toLowerCase().replace(/\s+/g, "_")

        if (!fieldLabel || !fieldName) {
          console.error("[v0] Invalid field - missing label or name:", field)
          continue
        }

        await sql`
          INSERT INTO shop_item_order_forms (
            shop_item_id, field_name, field_label, field_type, is_required, display_order, options, is_active
          )
          VALUES (
            ${shopItemId}, ${fieldName}, ${fieldLabel}, ${field.field_type || "text"}, 
            ${field.is_required || field.required || false}, ${i}, ${JSON.stringify(field.options || [])}, true
          )
        `
      }
    }

    invalidateEventCache()

    console.log("[v0] POST shop item - Success")
    return NextResponse.json({ item: result[0] }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating shop item - Full error:", error)
    console.error("[v0] Error message:", error instanceof Error ? error.message : String(error))
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json(
      {
        error: "Failed to create shop item",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
