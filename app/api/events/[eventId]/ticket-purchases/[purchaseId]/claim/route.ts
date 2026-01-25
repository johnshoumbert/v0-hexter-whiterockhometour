import { sql } from "@/lib/db"

export async function GET(request: Request, { params }: { params: Promise<{ eventId: string; id: string }> }) {
  return Response.json({ error: "Method not allowed" }, { status: 405 })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string; purchaseId: string }> },
) {
  try {
    const { eventId, purchaseId } = await params

    console.log("[v0] Attempting to claim ticket:", purchaseId)
    console.log("[v0] Using database URL:", process.env.DATABASE_URL ? "configured" : "missing")

    const result = await sql`
      UPDATE ticket_purchases 
      SET is_claimed = true, claimed_at = NOW()
      WHERE id = ${purchaseId}
      RETURNING *
    `

    console.log("[v0] Claim result:", result)

    if (!result || result.length === 0) {
      return Response.json({ error: "Ticket purchase not found" }, { status: 404 })
    }

    console.log("[v0] Claim successful, returning:", result[0])
    return Response.json(result[0])
  } catch (error) {
    console.error("[v0] Error claiming ticket:", error)
    if (error instanceof Error) {
      console.error("[v0] Error message:", error.message)
      console.error("[v0] Error stack:", error.stack)
    }
    return Response.json(
      { error: "Failed to claim ticket", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ eventId: string; purchaseId: string }> },
) {
  try {
    const { eventId, purchaseId } = await params

    console.log("[v0] Attempting to unclaim ticket:", purchaseId)

    const result = await sql`
      UPDATE ticket_purchases 
      SET is_claimed = false, claimed_at = NULL
      WHERE id = ${purchaseId}
      RETURNING *
    `

    console.log("[v0] Unclaim result:", result)

    if (!result || result.length === 0) {
      return Response.json({ error: "Ticket purchase not found" }, { status: 404 })
    }

    console.log("[v0] Unclaim successful, returning:", result[0])
    return Response.json(result[0])
  } catch (error) {
    console.error("[v0] Error unclaiming ticket:", error)
    if (error instanceof Error) {
      console.error("[v0] Error message:", error.message)
      console.error("[v0] Error stack:", error.stack)
    }
    return Response.json(
      { error: "Failed to unclaim ticket", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
