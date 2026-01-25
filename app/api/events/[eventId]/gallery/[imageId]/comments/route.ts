import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getSession } from "@/lib/auth"

const sql = neon(process.env.NEON_DATABASE_URL!)

export async function GET(req: NextRequest, { params }: { params: Promise<{ eventId: string; imageId: string }> }) {
  try {
    const { eventId, imageId } = await params

    const comments = await sql`
      SELECT 
        gc.id,
        gc.comment_text,
        gc.user_id,
        gc.created_at,
        gc.updated_at,
        u.name as user_name,
        u.profile_image as user_image
      FROM gallery_comments gc
      JOIN users u ON gc.user_id = u.id
      WHERE gc.event_id = ${eventId} AND gc.image_id = ${imageId}
      ORDER BY gc.created_at DESC
    `

    return NextResponse.json({ comments })
  } catch (error) {
    console.error("[v0] Error fetching comments:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch comments"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string; imageId: string }> }) {
  try {
    const user = await getSession()
    console.log("[v0] POST comment - user from session:", user ? user.email : "none")

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { eventId, imageId } = await params
    const { comment_text } = await req.json()

    if (!comment_text || comment_text.trim().length === 0) {
      return NextResponse.json({ error: "Comment text is required" }, { status: 400 })
    }

    console.log("[v0] Creating comment for image:", imageId, "by user:", user.id)

    const result = await sql`
      INSERT INTO gallery_comments (event_id, image_id, user_id, comment_text)
      VALUES (${eventId}, ${imageId}, ${user.id}, ${comment_text.trim()})
      RETURNING id, comment_text, user_id, created_at, updated_at
    `

    const comment = {
      ...result[0],
      user_name: user.name,
      user_image: user.profile_image,
    }

    console.log("[v0] Comment created successfully:", comment.id)

    return NextResponse.json({ comment })
  } catch (error) {
    console.error("[v0] Error creating comment:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to create comment"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
