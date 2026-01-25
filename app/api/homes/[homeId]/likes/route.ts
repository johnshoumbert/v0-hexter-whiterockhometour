"use server"

import { sql } from "@/lib/db"
import { cookies } from "next/headers"

export async function GET(request: Request, { params }: { params: Promise<{ homeId: string }> }) {
  try {
    const { homeId } = await params
    console.log("[v0] Fetching likes for home:", homeId)
    
    const likesCount = await sql`
      SELECT COUNT(*) as count
      FROM home_likes
      WHERE home_id = ${homeId}
    `

    const cookieStore = await cookies()
    const userCookie = cookieStore.get("user")
    let hasLiked = false

    if (userCookie?.value) {
      const user = JSON.parse(userCookie.value)
      const userLike = await sql`
        SELECT * FROM home_likes
        WHERE home_id = ${homeId} AND user_id = ${user.id}
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

export async function POST(request: Request, { params }: { params: Promise<{ homeId: string }> }) {
  try {
    const { homeId } = await params
    console.log("[v0] Toggling like for home:", homeId)
    
    const cookieStore = await cookies()
    const userCookie = cookieStore.get("user")
    
    if (!userCookie?.value) {
      console.log("[v0] User not authenticated")
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = JSON.parse(userCookie.value)
    console.log("[v0] User:", user.id)

    // Check if already liked
    const existing = await sql`
      SELECT * FROM home_likes
      WHERE home_id = ${homeId} AND user_id = ${user.id}
    `

    if (existing.length > 0) {
      // Unlike
      console.log("[v0] Unliking home")
      await sql`
        DELETE FROM home_likes
        WHERE home_id = ${homeId} AND user_id = ${user.id}
      `
      return Response.json({ liked: false })
    } else {
      // Like
      console.log("[v0] Liking home")
      await sql`
        INSERT INTO home_likes (home_id, user_id)
        VALUES (${homeId}, ${user.id})
      `
      return Response.json({ liked: true })
    }
  } catch (error) {
    console.error("[v0] Error toggling like:", error)
    return Response.json({ error: "Failed to toggle like" }, { status: 500 })
  }
}
