"use server"

import { sql } from "@/lib/db"
import { cookies } from "next/headers"

export async function GET(request: Request, { params }: { params: { homeId: string } }) {
  try {
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
      WHERE hc.home_id = ${params.homeId}
      ORDER BY hc.created_at DESC
    `

    return Response.json({ comments })
  } catch (error) {
    console.error("Error fetching home comments:", error)
    return Response.json({ error: "Failed to fetch comments" }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: { homeId: string } }) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get("user")
    
    if (!userCookie?.value) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = JSON.parse(userCookie.value)
    const body = await request.json()
    const { comment } = body

    if (!comment || comment.trim().length === 0) {
      return Response.json({ error: "Comment cannot be empty" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO home_comments (home_id, user_id, comment)
      VALUES (${params.homeId}, ${user.id}, ${comment})
      RETURNING *
    `

    return Response.json({ comment: result[0] }, { status: 201 })
  } catch (error) {
    console.error("Error creating comment:", error)
    return Response.json({ error: "Failed to create comment" }, { status: 500 })
  }
}
