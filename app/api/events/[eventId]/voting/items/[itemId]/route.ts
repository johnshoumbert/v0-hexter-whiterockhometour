import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { useEventStore } from "@/stores/event-store"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; itemId: string }> },
) {
  try {
    const { itemId } = await params
    const body = await request.json()
    const { title, description, image_url, display_order } = body

    const [item] = await sql`
      UPDATE voting_items
      SET 
        title = COALESCE(${title}, title),
        description = COALESCE(${description}, description),
        image_url = COALESCE(${image_url}, image_url),
        display_order = COALESCE(${display_order}, display_order)
      WHERE id = ${itemId}
      RETURNING *
    `

    useEventStore.getState().invalidateCache()

    return NextResponse.json({ item })
  } catch (error) {
    console.error("[v0] Error updating voting item:", error)
    return NextResponse.json({ error: "Failed to update voting item" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; itemId: string }> },
) {
  try {
    const { itemId } = await params

    await sql`DELETE FROM voting_items WHERE id = ${itemId}`

    useEventStore.getState().invalidateCache()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting voting item:", error)
    return NextResponse.json({ error: "Failed to delete voting item" }, { status: 500 })
  }
}
