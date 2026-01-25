import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { useEventStore } from "@/stores/event-store"

// DELETE gallery image
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; imageId: string }> },
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { eventId, imageId } = await params

    // Check if user is admin or the uploader
    const image = await sql`
      SELECT * FROM gallery_images
      WHERE id = ${imageId} AND event_id = ${eventId}
      LIMIT 1
    `

    if (image.length === 0) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 })
    }

    if (image[0].user_id !== session.id && !session.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await sql`
      DELETE FROM gallery_images
      WHERE id = ${imageId} AND event_id = ${eventId}
    `

    useEventStore.getState().invalidateCache()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting gallery image:", error)
    return NextResponse.json({ error: "Failed to delete gallery image" }, { status: 500 })
  }
}
