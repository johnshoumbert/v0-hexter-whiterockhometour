import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

// Send "Thank You for Your Bid" email
export async function POST(request: Request) {
  try {
    const { email, name, auctionTitle, amount, eventName } = await request.json()

    if (!email || !name || !auctionTitle || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const sql = getDb()

    const templateResult = await sql`
      SELECT template_id FROM email_templates 
      WHERE email_task = 'bid-confirmation' 
      AND is_active = true
      LIMIT 1
    `
    const templateId = templateResult[0]?.template_id || "d-bid-confirmation"

    await sql`
      INSERT INTO email_queue (
        template_id, subject, to_email, from_email,
        dynamic_template_data, status
      )
      VALUES (
        ${templateId},
        'Thank You for Your Bid on ' || ${auctionTitle},
        ${email},
        ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
        jsonb_build_object(
          'name', ${name},
          'auctionTitle', ${auctionTitle},
          'amount', ${amount},
          'eventName', ${eventName || ""}
        ),
        'pending'
      )
    `

    return NextResponse.json({ success: true, message: "Email queued" })
  } catch (error: any) {
    console.error("[v0] Error queuing bid confirmation email:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
