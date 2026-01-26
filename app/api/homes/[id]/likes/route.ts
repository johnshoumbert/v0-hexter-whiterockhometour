"use server"

import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    console.log("[v0] Fetching likes for home:", id)
    
    const likesCount = await sql`
      SELECT COUNT(*) as count
      FROM home_likes
      WHERE home_id = ${id}
    `

    const session = await getSession()
    let hasLiked = false

    if (session) {
      const userLike = await sql`
        SELECT * FROM home_likes
        WHERE home_id = ${id} AND user_id = ${session.id}
      `
      hasLiked = userLike.length > 0
    }

    console.log("[v0] Likes count:", likesCount[0].count, "hasLiked:", hasLiked)
    
    return Response.json({ 
      count: parseInt(likesCount[0].count), 
      hasLiked 
    })
  } catch (error) {
    console.error("[v0] Error fetching likes:", error)
    return Response.json({ error: "Failed to fetch likes" }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    console.log("[v0] Toggling like for home:", id)
    
    const session = await getSession()
    
    if (!session) {
      console.log("[v0] User not authenticated")
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] User:", session.id, session.name)

    // Check if already liked
    const existing = await sql`
      SELECT * FROM home_likes
      WHERE home_id = ${id} AND user_id = ${session.id}
    `

    if (existing.length > 0) {
      // Unlike
      console.log("[v0] Unliking home")
      await sql`
        DELETE FROM home_likes
        WHERE home_id = ${id} AND user_id = ${session.id}
      `
      return Response.json({ liked: false })
    } else {
      // Like
      console.log("[v0] Liking home")
      await sql`
        INSERT INTO home_likes (home_id, user_id)
        VALUES (${id}, ${session.id})
      `
      return Response.json({ liked: true })
    }
  } catch (error) {
    console.error("[v0] Error toggling like:", error)
    return Response.json({ error: "Failed to toggle like" }, { status: 500 })
  }
}
