import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    console.log("[v0] Checking raffle winner for entry:", id)

    // Get raffle entry and check if winner
    const entry = await sql.query(
      `SELECT 
        re.*,
        r.winner_user_id,
        r.winner_ticket_number,
        r.title as raffle_name
      FROM raffle_entries re
      JOIN raffles r ON re.raffle_id = r.id
      WHERE re.id = $1`,
      [id],
    )

    if (entry.length === 0) {
      return NextResponse.json({ error: "Raffle entry not found" }, { status: 404 })
    }

    const isWinner =
      entry[0].winner_user_id === entry[0].user_id && entry[0].winner_ticket_number === entry[0].ticket_number

    return NextResponse.json({
      isWinner,
      ticketNumber: entry[0].ticket_number,
      raffleName: entry[0].raffle_name,
      hasWinnerBeenDrawn: !!entry[0].winner_user_id,
    })
  } catch (error) {
    console.error("[v0] Error checking raffle winner:", error)
    return NextResponse.json(
      { error: "Failed to check winner", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
