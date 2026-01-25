import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params

    const session = await getSession()

    console.log("[v0] Session object:", session)

    if (!session) {
      console.log("[v0] No session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.id

    const sql = getDb()

    console.log("[v0] Checking admin access for user:", userId)

    const adminCheck = await sql`
      SELECT 
        u.id,
        u.role,
        u.email,
        CASE 
          WHEN u.role = 'global_admin' THEN true
          WHEN u.role = 'admin' THEN true
          WHEN eu.role = 'admin' THEN true
          ELSE false
        END as is_admin
      FROM users u
      LEFT JOIN event_users eu ON eu.user_id = u.id AND eu.event_id = ${eventId}
      WHERE u.id = ${userId}
    `

    console.log("[v0] Admin check result:", adminCheck)

    if (adminCheck.length === 0 || !adminCheck[0].is_admin) {
      console.log("[v0] Access denied for user:", userId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    console.log("[v0] Admin access granted, fetching responses for event:", eventId)

    const responses = await sql`
      SELECT 
        tqr.id,
        tqr.response_text,
        tqr.response_array,
        tqr.created_at,
        tq.question_text,
        tq.question_type,
        tq.id as question_id,
        et.name as ticket_name,
        et.id as ticket_id,
        u.name as user_name,
        u.email as user_email,
        u.id as user_id,
        tp.id as purchase_id,
        tp.quantity as registration_count
      FROM ticket_question_responses tqr
      JOIN ticket_questions tq ON tqr.question_id = tq.id
      JOIN ticket_purchases tp ON tqr.purchase_id = tp.id
      JOIN event_tickets et ON tq.ticket_id = et.id
      JOIN users u ON tp.user_id = u.id
      WHERE et.event_id = ${eventId}
      ORDER BY tqr.created_at DESC
    `

    console.log("[v0] Responses fetched from DB:", responses.length)
    if (responses.length > 0) {
      console.log("[v0] Sample response:", responses[0])
    }

    return NextResponse.json(responses)
  } catch (error) {
    console.error("[v0] Error fetching ticket responses:", error)
    return NextResponse.json({ error: "Failed to fetch responses" }, { status: 500 })
  }
}
