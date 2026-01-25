import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; ticketId: string; questionId: string }> },
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { questionId } = await params
    const updates = await request.json()
    const sql = getDb()

    const result = await sql.query(
      `UPDATE ticket_questions 
       SET question_text = COALESCE($1, question_text),
           question_type = COALESCE($2, question_type),
           options = COALESCE($3, options),
           is_required = COALESCE($4, is_required),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        updates.question_text,
        updates.question_type,
        updates.options ? JSON.stringify(updates.options) : null,
        updates.is_required,
        questionId,
      ],
    )

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("[v0] Error updating question:", error)
    return NextResponse.json({ error: "Failed to update question" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; ticketId: string; questionId: string }> },
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { questionId } = await params
    const sql = getDb()

    await sql.query(`DELETE FROM ticket_questions WHERE id = $1`, [questionId])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting question:", error)
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 })
  }
}
