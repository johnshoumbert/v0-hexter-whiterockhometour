import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyAuth } from "@/lib/auth"

const sql = neon(process.env.NEON_DATABASE_URL!)

export async function GET(req: NextRequest, { params }: { params: Promise<{ eventId: string; imageId: string }> }) {
  try {
    const { eventId, imageId } = await params

    const likes = await sql`
      SELECT 
        gl.id,
        gl.user_id,
        gl.created_at,
        u.name as user_name,
        u.profile_image as user_image
      FROM gallery_likes gl
      JOIN users u ON gl.user_id = u.id
      WHERE gl.event_id = ${eventId} AND gl.image_id = ${imageId}
      ORDER BY gl.created_at DESC
    `

    return NextResponse.json({ likes })
  } catch (error) {
    console.error("[v0] Error fetching likes:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch likes"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string; imageId: string }> }) {
  try {
    const user = await verifyAuth(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { eventId, imageId } = await params

    // Toggle like
    const existingLike = await sql`
      SELECT id FROM gallery_likes 
      WHERE event_id = ${eventId} AND image_id = ${imageId} AND user_id = ${user.id}
    `

    if (existingLike.length > 0) {
      // Unlike
      await sql`
        DELETE FROM gallery_likes 
        WHERE event_id = ${eventId} AND image_id = ${imageId} AND user_id = ${user.id}
      `
      return NextResponse.json({ liked: false })
    } else {
      // Like
      await sql`
        INSERT INTO gallery_likes (event_id, image_id, user_id)
        VALUES (${eventId}, ${imageId}, ${user.id})
      `
      return NextResponse.json({ liked: true })
    }
  } catch (error) {
    console.error("[v0] Error toggling like:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to toggle like"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
