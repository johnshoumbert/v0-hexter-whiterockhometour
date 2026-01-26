"use server"

import { sql } from "@/lib/db"
import { cookies } from "next/headers"

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get("user")
    
    if (!userCookie?.value) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = JSON.parse(userCookie.value)

    // Check if user owns this comment or is admin
    const comment = await sql`
      SELECT * FROM home_comments 
      WHERE id = ${params.commentId} AND home_id = ${params.id}
    `

    if (comment.length === 0) {
      return Response.json({ error: "Comment not found" }, { status: 404 })
    }

    if (comment[0].user_id !== user.id && user.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    await sql`
      DELETE FROM home_comments 
      WHERE id = ${params.commentId}
    `

    return Response.json({ success: true })
  } catch (error) {
    console.error("Error deleting comment:", error)
    return Response.json({ error: "Failed to delete comment" }, { status: 500 })
  }
}
