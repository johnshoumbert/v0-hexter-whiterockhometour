import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { checkAdminAccess } from "@/lib/admin-check"

export async function GET(request: Request, { params }: { params: { eventId: string } }) {
  try {
    const { eventId } = params

    const homes = await sql`
      SELECT *
      FROM homes
      WHERE event_id = ${eventId}
      ORDER BY display_order ASC, created_at DESC
    `

    return NextResponse.json(homes)
  } catch (error: any) {
    console.error("[v0] Error fetching homes:", error)
    return NextResponse.json({ error: "Failed to fetch homes" }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: { eventId: string } }) {
  try {
    const { eventId } = params
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { isAdmin } = await checkAdminAccess(eventId)
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, address, sponsor, short_description, full_description, item_images, directions_url, display_order } = body

    // Parse item_images if it's a JSON string, otherwise use as-is
    let parsedImages = []
    if (item_images) {
      try {
        parsedImages = typeof item_images === 'string' ? JSON.parse(item_images) : item_images
      } catch (e) {
        console.error("[v0] Error parsing item_images:", e)
        parsedImages = []
      }
    }

    const result = await sql`
      INSERT INTO homes (
        event_id, name, address, sponsor, short_description, 
        full_description, item_images, directions_url, display_order
      )
      VALUES (
        ${eventId}, ${name}, ${address || null}, ${sponsor || null}, 
        ${short_description || null}, ${full_description || null}, 
        ${JSON.stringify(parsedImages)}, ${directions_url || null}, ${display_order || 0}
      )
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error: any) {
    console.error("[v0] Error creating home:", error)
    return NextResponse.json({ error: "Failed to create home" }, { status: 500 })
  }
}
