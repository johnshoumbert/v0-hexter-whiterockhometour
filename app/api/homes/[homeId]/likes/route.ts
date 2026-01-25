"use server"

import { sql } from "@/lib/db"
import { cookies } from "next/headers"

export async function GET(request: Request, { params }: { params: { homeId: string } }) {
  try {
    const likesCount = await sql`
      SELECT COUNT(*) as count
      FROM home_likes
      WHERE home_id = ${params.homeId}
    `

    const cookieStore = await cookies()
    const userCookie = cookieStore.get("user")
    let hasLiked = false

    if (userCookie?.value) {
      const user = JSON.parse(userCookie.value)
      const userLike = await sql`
        SELECT * FROM home_likes
        WHERE home_id = ${params.homeId} AND user_id = ${user.id}
      `
      hasLiked = userLike.length > 0
    }

    return Response.json({ 
      count: parseInt(likesCount[0].count), 
      hasLiked 
    })
  } catch (error) {
    console.error("Error fetching likes:", error)
    return Response.json({ error: "Failed to fetch likes" }, { status: 500 })
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

    // Check if already liked
    const existing = await sql`
      SELECT * FROM home_likes
      WHERE home_id = ${params.homeId} AND user_id = ${user.id}
    `

    if (existing.length > 0) {
      // Unlike
      await sql`
        DELETE FROM home_likes
        WHERE home_id = ${params.homeId} AND user_id = ${user.id}
      `
      return Response.json({ liked: false })
    } else {
      // Like
      await sql`
        INSERT INTO home_likes (home_id, user_id)
        VALUES (${params.homeId}, ${user.id})
      `
      return Response.json({ liked: true })
    }
  } catch (error) {
    console.error("Error toggling like:", error)
    return Response.json({ error: "Failed to toggle like" }, { status: 500 })
  }
}
