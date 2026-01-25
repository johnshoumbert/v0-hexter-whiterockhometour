import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { useEventStore } from "@/stores/event-store"

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const body = await request.json()
    const { poll_id, title, description, image_url, display_order } = body

    const [item] = await sql`
      INSERT INTO voting_items (poll_id, title, description, image_url, display_order)
      VALUES (${poll_id}, ${title}, ${description || null}, ${image_url || null}, ${display_order || 0})
      RETURNING *
    `

    useEventStore.getState().invalidateCache()

    return NextResponse.json({ item })
  } catch (error) {
    console.error("[v0] Error creating voting item:", error)
    return NextResponse.json({ error: "Failed to create voting item" }, { status: 500 })
  }
}
