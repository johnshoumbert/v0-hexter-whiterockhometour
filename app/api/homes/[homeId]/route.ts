"use server"

import { sql } from "@/lib/db"

export async function GET(request: Request, { params }: { params: { homeId: string } }) {
  try {
        const { homeId } = await params

    
    const result = await sql`
      SELECT * FROM homes
      WHERE id = ${homeId}
    `

    if (result.length === 0) {
      return Response.json({ error: "Home not found" }, { status: 404 })
    }

    return Response.json(result[0])
  } catch (error) {
    console.error("Error fetching home:", error)
    return Response.json({ error: "Failed to fetch home" }, { status: 500 })
  }
}
