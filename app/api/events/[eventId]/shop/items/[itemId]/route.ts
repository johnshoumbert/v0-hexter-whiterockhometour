import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { invalidateEventCache } from "@/stores/event-store"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string; itemId: string }> }) {
  try {
    const { eventId, itemId } = await params

    const result = await sql`
      SELECT * FROM shop_items 
      WHERE id = ${itemId} AND event_id = ${eventId}
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    return NextResponse.json({ item: result[0] })
  } catch (error) {
    console.error("Error fetching shop item:", error)
    return NextResponse.json({ error: "Failed to fetch shop item" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ eventId: string; itemId: string }> }) {
  try {
    const session = await getSession()
    const { eventId, itemId } = await params

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a global admin or event admin
    if (eventId) {
      const isEventAdmin = await sql`
        SELECT 1 FROM event_users 
        WHERE event_id = ${eventId} AND user_id = ${session.id} AND role = 'admin'
      `

      if (!session.is_admin && (!isEventAdmin || isEventAdmin.length === 0)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    } else if (!session.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

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

    const result = await sql`
      UPDATE shop_items
      SET
        title = ${title},
        description = ${description},
        price = ${price},
        image_url = ${image_url},
        additional_images = ${additional_images || "[]"},
        category = ${category},
        quantity_type = ${quantity_type},
        quantity_available = ${quantity_available},
        is_active = ${is_active},
        featured = ${featured},
        options = ${JSON.stringify(options || [])},
        updated_at = NOW()
      WHERE id = ${itemId} AND event_id = ${eventId}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    await sql`
      UPDATE shop_item_order_forms
      SET is_active = false
      WHERE shop_item_id = ${itemId}
    `

    if (orderFormFields && Array.isArray(orderFormFields) && orderFormFields.length > 0) {
      for (let i = 0; i < orderFormFields.length; i++) {
        const field = orderFormFields[i]

        const fieldLabel = field.field_label || field.label

        if (!fieldLabel || typeof fieldLabel !== "string") {
          console.error("[v0] Invalid field - missing label:", field)
          continue
        }

        const fieldName = field.field_name || fieldLabel.toLowerCase().replace(/\s+/g, "_")

        const existing = await sql`
          SELECT id FROM shop_item_order_forms
          WHERE shop_item_id = ${itemId} AND field_name = ${fieldName}
        `

        if (existing.length > 0) {
          await sql`
            UPDATE shop_item_order_forms
            SET 
              field_label = ${fieldLabel},
              field_type = ${field.field_type || "text"},
              is_required = ${field.is_required || field.required || false},
              display_order = ${i},
              options = ${JSON.stringify(field.options || [])},
              is_active = true
            WHERE id = ${existing[0].id}
          `
        } else {
          await sql`
            INSERT INTO shop_item_order_forms (
              shop_item_id, field_name, field_label, field_type, is_required, display_order, options, is_active
            )
            VALUES (
              ${itemId}, ${fieldName}, ${fieldLabel}, ${field.field_type || "text"}, 
              ${field.is_required || field.required || false}, ${i}, ${JSON.stringify(field.options || [])}, true
            )
          `
        }
      }
    }

    invalidateEventCache()

    return NextResponse.json({ item: result[0] })
  } catch (error) {
    console.error("Error updating shop item:", error)
    return NextResponse.json({ error: "Failed to update shop item" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; itemId: string }> },
) {
  try {
    const session = await getSession()
    const { eventId, itemId } = await params

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a global admin or event admin
    if (eventId) {
      const isEventAdmin = await sql`
        SELECT 1 FROM event_users 
        WHERE event_id = ${eventId} AND user_id = ${session.id} AND role = 'admin'
      `

      if (!session.is_admin && (!isEventAdmin || isEventAdmin.length === 0)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    } else if (!session.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await sql`
      DELETE FROM shop_items
      WHERE id = ${itemId} AND event_id = ${eventId}
    `

    invalidateEventCache()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting shop item:", error)
    return NextResponse.json({ error: "Failed to delete shop item" }, { status: 500 })
  }
}
