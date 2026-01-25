import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; purchaseId: string }> },
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { eventId, purchaseId } = await params
    const sql = getDb()

    const purchase = await sql`
      SELECT 
        tp.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        et.name as ticket_name,
        et.price as ticket_price
      FROM ticket_purchases tp
      JOIN users u ON tp.user_id = u.id
      JOIN event_tickets et ON tp.ticket_id = et.id
      WHERE tp.id = ${purchaseId} AND tp.event_id = ${eventId}
    `

    if (purchase.length === 0) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    }

    return NextResponse.json({ purchase: purchase[0] })
  } catch (error) {
    console.error("[v0] Error fetching ticket purchase:", error)
    return NextResponse.json({ error: "Failed to fetch purchase" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; purchaseId: string }> },
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { eventId, purchaseId } = await params
    const body = await request.json()
    const sql = getDb()

    console.log("[v0] PATCH request body:", body)
    console.log("[v0] Session ID:", session.id)
    console.log("[v0] Purchase ID:", purchaseId)
    console.log("[v0] Event ID:", eventId)

    if (body.ticket_id !== undefined && body.quantity !== undefined) {
      // Get the current purchase
      const currentPurchase = await sql`
        SELECT tp.*, et.price, et.name as ticket_name, u.email, u.name as user_name
        FROM ticket_purchases tp
        JOIN event_tickets et ON tp.ticket_id = et.id
        JOIN users u ON tp.user_id = u.id
        WHERE tp.id = ${purchaseId} 
          AND tp.user_id = ${session.id}
          AND tp.event_id = ${eventId}
      `

      console.log("[v0] Current purchase found:", currentPurchase.length > 0)

      if (currentPurchase.length === 0) {
        return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
      }

      // Get the new ticket info
      const newTicket = await sql`
        SELECT * FROM event_tickets 
        WHERE id = ${body.ticket_id} AND event_id = ${eventId} AND is_active = true
      `

      console.log("[v0] New ticket found:", newTicket.length > 0)

      if (newTicket.length === 0) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
      }

      const oldTotal = Number.parseFloat(currentPurchase[0].total_amount)
      const newTotal = Number.parseFloat(newTicket[0].price) * body.quantity
      const priceDifference = newTotal - oldTotal

      console.log("[v0] Old total:", oldTotal, "New total:", newTotal, "Difference:", priceDifference)

      // If refund needed, create a support request
      if (priceDifference < 0) {
        await sql`
          UPDATE ticket_purchases
          SET 
            ticket_id = ${body.ticket_id},
            quantity = ${body.quantity},
            total_amount = ${newTotal},
            status = 'pending_review',
            updated_at = NOW()
          WHERE id = ${purchaseId}
        `

        await sql`
          INSERT INTO email_queue (
            from_email,
            to_email, 
            subject,
            template_id,
            dynamic_template_data,
            status,
            created_at,
            updated_at
          )
          VALUES (
            ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
            ${currentPurchase[0].email},
            'Registration Update Confirmation',
            'rsvp-confirmation',
            ${JSON.stringify({
              user_name: currentPurchase[0].user_name,
              ticket_name: newTicket[0].name,
              quantity: body.quantity,
              total_amount: newTotal,
              event_id: eventId,
              status: "updated",
              refund_pending: true,
              refund_amount: Math.abs(priceDifference),
            })},
            'pending',
            NOW(),
            NOW()
          )
        `

        return NextResponse.json({
          success: true,
          requiresRefund: true,
          refundAmount: Math.abs(priceDifference),
          message: "Your registration change request has been submitted to our support team for a refund.",
        })
      }

      // If additional payment needed
      if (priceDifference > 0) {
        return NextResponse.json({
          success: true,
          requiresPayment: true,
          paymentAmount: priceDifference,
          purchaseId,
          ticket_id: body.ticket_id,
          quantity: body.quantity,
          newTotal,
        })
      }

      // Same price, just update
      await sql`
        UPDATE ticket_purchases
        SET 
          ticket_id = ${body.ticket_id},
          quantity = ${body.quantity},
          updated_at = NOW()
        WHERE id = ${purchaseId}
      `

      await sql`
        INSERT INTO email_queue (
          from_email,
          to_email, 
          subject,
          template_id,
          dynamic_template_data,
          status,
          created_at,
          updated_at
        )
        VALUES (
          ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
          ${currentPurchase[0].email},
          'Registration Update Confirmation',
          'rsvp-confirmation',
          ${JSON.stringify({
            user_name: currentPurchase[0].user_name,
            ticket_name: newTicket[0].name,
            quantity: body.quantity,
            total_amount: newTotal,
            event_id: eventId,
            status: "updated",
          })},
          'pending',
          NOW(),
          NOW()
        )
      `

      return NextResponse.json({
        success: true,
        message: "Registration updated successfully",
      })
    }

    // Build update object
    const updateFields: string[] = []
    const updateValues: any[] = []
    let paramCounter = 1

    if (body.admin_notes !== undefined) {
      updateFields.push(`admin_notes = $${paramCounter}`)
      updateValues.push(body.admin_notes)
      paramCounter++
    }

    if (body.is_revoked !== undefined) {
      updateFields.push(`is_revoked = $${paramCounter}`)
      updateValues.push(body.is_revoked)
      paramCounter++

      if (body.is_revoked) {
        updateFields.push(`revoked_at = $${paramCounter}`)
        updateValues.push(new Date())
        paramCounter++

        updateFields.push(`revoked_by = $${paramCounter}`)
        updateValues.push(session.id)
        paramCounter++

        updateFields.push(`status = $${paramCounter}`)
        updateValues.push("revoked")
        paramCounter++
      }
    }

    if (body.refund_status !== undefined) {
      updateFields.push(`refund_status = $${paramCounter}`)
      updateValues.push(body.refund_status)
      paramCounter++

      if (body.refund_status === "completed") {
        updateFields.push(`refunded_at = $${paramCounter}`)
        updateValues.push(new Date())
        paramCounter++

        if (body.refund_amount !== undefined) {
          updateFields.push(`refund_amount = $${paramCounter}`)
          updateValues.push(body.refund_amount)
          paramCounter++
        }

        if (body.stripe_refund_id !== undefined) {
          updateFields.push(`stripe_refund_id = $${paramCounter}`)
          updateValues.push(body.stripe_refund_id)
          paramCounter++
        }
      }
    }

    // Always update the updated_at timestamp
    updateFields.push(`updated_at = $${paramCounter}`)
    updateValues.push(new Date())
    paramCounter++

    if (updateFields.length === 1) {
      // Only updated_at field, nothing meaningful to update
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const query = `
      UPDATE ticket_purchases 
      SET ${updateFields.join(", ")}
      WHERE id = $${paramCounter} AND event_id = $${paramCounter + 1}
    `

    await sql.query(query, [...updateValues, purchaseId, eventId])

    console.log("[v0] Successfully updated purchase")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating ticket purchase:", error)
    return NextResponse.json({ error: "Failed to update purchase" }, { status: 500 })
  }
}
