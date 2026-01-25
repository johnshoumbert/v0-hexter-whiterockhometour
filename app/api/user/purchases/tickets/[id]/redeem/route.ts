import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    console.log("[v0] Redeeming ticket purchase:", id)

    // Check if user is admin
    const user = await sql.query(`SELECT role FROM users WHERE id = $1`, [session.id])
    if (user.length === 0 || user[0].role !== "admin") {
      return NextResponse.json({ error: "Only admins can redeem tickets" }, { status: 403 })
    }

    // Update ticket status to redeemed
    await sql.query(
      `UPDATE ticket_purchases 
       SET status = 'redeemed', updated_at = NOW() 
       WHERE id = $1`,
      [id],
    )

    console.log("[v0] Ticket purchase redeemed successfully")

    return NextResponse.json({ success: true, message: "Ticket redeemed successfully" })
  } catch (error) {
    console.error("[v0] Error redeeming ticket:", error)
    return NextResponse.json(
      { error: "Failed to redeem ticket", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
