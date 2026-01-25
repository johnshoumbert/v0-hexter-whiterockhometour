import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; ticketId: string }> },
) {
  try {
    const { ticketId } = await params
    const sql = getDb()

    const questions = await sql.query(
      `SELECT * FROM ticket_questions 
       WHERE ticket_id = $1 
       ORDER BY display_order ASC`,
      [ticketId],
    )

    return NextResponse.json(questions)
  } catch (error: any) {
    console.error("[v0] Error fetching ticket questions:", error)

    if (error.message?.includes('relation "ticket_questions" does not exist')) {
      return NextResponse.json({ setupRequired: true, questions: [] })
    }

    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; ticketId: string }> },
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { ticketId } = await params
    const { question_text, question_type, options, is_required } = await request.json()
    const sql = getDb()

    // Get current max display_order
    const maxOrder = await sql.query(
      `SELECT COALESCE(MAX(display_order), -1) + 1 as next_order FROM ticket_questions WHERE ticket_id = $1`,
      [ticketId],
    )

    const result = await sql.query(
      `INSERT INTO ticket_questions (ticket_id, question_text, question_type, options, is_required, display_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        ticketId,
        question_text,
        question_type,
        options ? JSON.stringify(options) : null,
        is_required,
        maxOrder[0].next_order,
      ],
    )

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("[v0] Error creating question:", error)
    return NextResponse.json({ error: "Failed to create question" }, { status: 500 })
  }
}
