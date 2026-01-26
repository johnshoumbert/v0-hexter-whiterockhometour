"use server"

import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    console.log("[v0] Fetching comments for home:", id)
    
    const comments = await sql`
      SELECT 
        hc.id, 
        hc.comment, 
        hc.created_at,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email
      FROM home_comments hc
      LEFT JOIN users u ON hc.user_id = u.id
      WHERE hc.home_id = ${id}
      ORDER BY hc.created_at DESC
    `

    console.log("[v0] Found", comments.length, "comments")
    return Response.json({ comments })
  } catch (error) {
    console.error("[v0] Error fetching home comments:", error)
    return Response.json({ error: "Failed to fetch comments" }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    console.log("[v0] Adding comment to home:", id)
    
    const session = await getSession()
    
    if (!session) {
      console.log("[v0] User not authenticated")
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] User:", session.id, session.name)
    
    const body = await request.json()
    const { comment } = body

    if (!comment || comment.trim().length === 0) {
      console.log("[v0] Comment is empty")
      return Response.json({ error: "Comment cannot be empty" }, { status: 400 })
    }

    console.log("[v0] Inserting comment:", comment)
    const result = await sql`
      INSERT INTO home_comments (home_id, user_id, comment)
      VALUES (${id}, ${session.id}, ${comment})
      RETURNING *
    `

    console.log("[v0] Comment added successfully")
    return Response.json({ comment: result[0] }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating comment:", error)
    return Response.json({ error: "Failed to create comment" }, { status: 500 })
  }
}
