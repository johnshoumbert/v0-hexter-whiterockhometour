"use server"

import { query } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function GET(request: Request, { params }: { params: { eventId: string } }) {
  try {
    const testimonials = await query(
      `SELECT id, author_name, author_title, author_avatar, quote, display_order, created_at
       FROM testimonials 
       WHERE event_id = $1 
       ORDER BY display_order ASC, created_at DESC`,
      [params.eventId]
    )

    return Response.json({ testimonials: testimonials || [] })
  } catch (error) {
    console.error("Error fetching testimonials:", error)
    return Response.json({ error: "Failed to fetch testimonials" }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: { eventId: string } }) {
  try {
    const body = await request.json()
    const { author_name, author_title, author_avatar, quote } = body

    if (!author_name || !quote) {
      return Response.json({ error: "Author name and quote are required" }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO testimonials (event_id, author_name, author_title, author_avatar, quote, display_order)
       VALUES ($1, $2, $3, $4, $5, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM testimonials WHERE event_id = $1))
       RETURNING *`,
      [params.eventId, author_name, author_title, author_avatar || null, quote]
    )

    revalidatePath("/")
    revalidatePath("/admin/testimonials")

    return Response.json({ testimonial: result[0] }, { status: 201 })
  } catch (error) {
    console.error("Error creating testimonial:", error)
    return Response.json({ error: "Failed to create testimonial" }, { status: 500 })
  }
}
