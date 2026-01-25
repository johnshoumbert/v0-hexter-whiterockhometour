import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyAuth } from "@/lib/auth"

const sql = neon(process.env.NEON_DATABASE_URL!)

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; imageId: string; commentId: string }> },
) {
  try {
    const user = await verifyAuth(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { commentId } = await params

    // Check if user owns the comment or is admin
    const comment = await sql`
      SELECT user_id FROM gallery_comments WHERE id = ${commentId}
    `

    if (comment.length === 0) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }

    if (comment[0].user_id !== user.id && !user.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await sql`DELETE FROM gallery_comments WHERE id = ${commentId}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting comment:", error)
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 })
  }
}
