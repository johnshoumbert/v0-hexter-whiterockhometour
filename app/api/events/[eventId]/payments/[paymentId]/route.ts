import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; paymentId: string }> },
) {
  try {
    const user = await getSession()
    const { eventId, paymentId } = await params

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const isGlobalAdmin = user.role === "admin"
    const eventAdmins = await sql`
      SELECT * FROM event_users
      WHERE event_id = ${eventId} AND user_id = ${user.id} AND role = 'admin'
    `
    const isEventAdmin = eventAdmins.length > 0

    if (!isGlobalAdmin && !isEventAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { amount, status, payment_type } = body

    // Update payment
    await sql`
      UPDATE payments
      SET 
        amount = ${amount},
        status = ${status},
        payment_type = ${payment_type}
      WHERE id = ${paymentId} AND event_id = ${eventId}
    `

    return NextResponse.json({ success: true, message: "Payment updated successfully" })
  } catch (error: any) {
    console.error("[v0] Update payment error:", error)
    return NextResponse.json({ error: "Failed to update payment", message: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; paymentId: string }> },
) {
  try {
    const user = await getSession()
    const { eventId, paymentId } = await params

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const isGlobalAdmin = user.role === "admin"
    const eventAdmins = await sql`
      SELECT * FROM event_users
      WHERE event_id = ${eventId} AND user_id = ${user.id} AND role = 'admin'
    `
    const isEventAdmin = eventAdmins.length > 0

    if (!isGlobalAdmin && !isEventAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    // Check if payment is pending
    const paymentCheck = await sql`
      SELECT status FROM payments
      WHERE id = ${paymentId} AND event_id = ${eventId}
    `

    if (paymentCheck.length === 0) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    if (paymentCheck[0].status !== "pending") {
      return NextResponse.json({ error: "Only pending payments can be deleted" }, { status: 400 })
    }

    // Delete payment_items first (foreign key constraint)
    await sql`
      DELETE FROM payment_items
      WHERE payment_id = ${paymentId}
    `

    // Delete payment
    await sql`
      DELETE FROM payments
      WHERE id = ${paymentId} AND event_id = ${eventId}
    `

    return NextResponse.json({ success: true, message: "Payment deleted successfully" })
  } catch (error: any) {
    console.error("[v0] Delete payment error:", error)
    return NextResponse.json({ error: "Failed to delete payment", message: error.message }, { status: 500 })
  }
}
