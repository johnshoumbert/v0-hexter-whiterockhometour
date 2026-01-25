import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { useEventStore } from "@/stores/event-store"

// GET all gallery images for an event
export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params

    const images = await sql`
      SELECT 
        gi.*,
        u.name as uploader_name,
        u.profile_image as uploader_image,
        u.email as uploader_email
      FROM gallery_images gi
      LEFT JOIN users u ON gi.user_id = u.id
      WHERE gi.event_id = ${eventId}
      ORDER BY gi.display_order DESC, gi.created_at DESC
    `

    return NextResponse.json({ images })
  } catch (error) {
    console.error("[v0] Error fetching gallery images:", error)
    return NextResponse.json({ error: "Failed to fetch gallery images" }, { status: 500 })
  }
}

// POST new gallery image
export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { eventId } = await params
    const body = await request.json()
    const { image_url, description } = body

    if (!image_url) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO gallery_images (event_id, user_id, image_url, description, created_at, updated_at)
      VALUES (${eventId}, ${session.id}, ${image_url}, ${description || null}, NOW(), NOW())
      RETURNING *
    `

    useEventStore.getState().invalidateCache()

    return NextResponse.json({ image: result[0] })
  } catch (error) {
    console.error("[v0] Error creating gallery image:", error)
    return NextResponse.json({ error: "Failed to create gallery image" }, { status: 500 })
  }
}
