"use server"

import { query } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function PUT(
  request: Request,
  { params }: { params: { eventId: string; id: string } }
) {
  try {
    const body = await request.json()
    const { author_name, author_title, author_avatar, quote, display_order } = body

    const result = await query(
      `UPDATE testimonials 
       SET author_name = $1, author_title = $2, author_avatar = $3, quote = $4, display_order = $5, updated_at = NOW()
       WHERE id = $6 AND event_id = $7
       RETURNING *`,
      [author_name, author_title, author_avatar || null, quote, display_order, params.id, params.eventId]
    )

    if (result.length === 0) {
      return Response.json({ error: "Testimonial not found" }, { status: 404 })
    }

    revalidatePath("/")
    revalidatePath("/admin/testimonials")

    return Response.json({ testimonial: result[0] })
  } catch (error) {
    console.error("Error updating testimonial:", error)
    return Response.json({ error: "Failed to update testimonial" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { eventId: string; id: string } }
) {
  try {
    const result = await query(`DELETE FROM testimonials WHERE id = $1 AND event_id = $2 RETURNING id`, [
      params.id,
      params.eventId,
    ])

    if (result.length === 0) {
      return Response.json({ error: "Testimonial not found" }, { status: 404 })
    }

    revalidatePath("/")
    revalidatePath("/admin/testimonials")

    return Response.json({ success: true })
  } catch (error) {
    console.error("Error deleting testimonial:", error)
    return Response.json({ error: "Failed to delete testimonial" }, { status: 500 })
  }
}
