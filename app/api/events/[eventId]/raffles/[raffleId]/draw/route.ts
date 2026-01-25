import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; raffleId: string }> },
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { raffleId, eventId } = await params

    const [raffle] = await sql`
      SELECT r.*, e.event_name, e.domain as event_domain
      FROM raffles r
      JOIN events e ON r.event_id = e.id
      WHERE r.id = ${raffleId}
    `

    if (!raffle) {
      return NextResponse.json({ error: "Raffle not found" }, { status: 404 })
    }

    // Get all entries for this raffle
    const entries = await sql`
      SELECT re.*, u.name, u.email
      FROM raffle_entries re
      JOIN users u ON re.user_id = u.id
      WHERE re.raffle_id = ${raffleId}
    `

    if (entries.length === 0) {
      return NextResponse.json({ error: "No entries found for this raffle" }, { status: 400 })
    }

    // Pick a random winner
    const randomIndex = Math.floor(Math.random() * entries.length)
    const winner = entries[randomIndex]

    // Update raffle with winner
    const result = await sql`
      UPDATE raffles
      SET
        winner_user_id = ${winner.user_id},
        winner_ticket_number = ${winner.ticket_number},
        draw_date = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${raffleId}
      RETURNING *
    `

    const currentYear = new Date().getFullYear()
    const eventDomain = raffle.event_domain
      ? `https://${raffle.event_domain}`
      : request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://myschoolauction.com"

    const winnerTemplateResult = await sql`
      SELECT template_id FROM email_templates 
      WHERE email_task = 'raffle-winner' 
      AND is_active = true
      LIMIT 1
    `
    const winnerTemplateId = winnerTemplateResult[0]?.template_id || "d-raffle-winner"

    const noWinTemplateResult = await sql`
      SELECT template_id FROM email_templates 
      WHERE email_task = 'raffle-no-win' 
      AND is_active = true
      LIMIT 1
    `
    const noWinTemplateId = noWinTemplateResult[0]?.template_id || "d-raffle-no-win"

    try {
      await sql`
        INSERT INTO email_queue (
          template_id, subject, to_email, from_email,
          dynamic_template_data, status
        )
        VALUES (
          ${winnerTemplateId},
          'Congratulations! You Won: ' || ${raffle.title},
          ${winner.email},
          ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
          jsonb_build_object(
            'name', ${winner.name},
            'raffleTitle', ${raffle.title},
            'pickupLocation', 'School Office',
            'pickupTime', 'Monday-Friday, 8am-4pm',
            'link', ${eventDomain} || '/user/purchases',
            'year', ${currentYear},
            'eventName', ${raffle.event_name}
          ),
          'pending'
        )
      `
      console.log("[v0] Winner notification email queued for:", winner.email)
    } catch (emailError) {
      console.error("[v0] Failed to queue winner email:", emailError)
    }

    const nonWinners = entries.filter((entry: any) => entry.user_id !== winner.user_id)

    for (const nonWinner of nonWinners) {
      try {
        await sql`
          INSERT INTO email_queue (
            template_id, subject, to_email, from_email,
            dynamic_template_data, status
          )
          VALUES (
            ${noWinTemplateId},
            'Thank You for Entering: ' || ${raffle.title},
            ${nonWinner.email},
            ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
            jsonb_build_object(
              'name', ${nonWinner.name},
              'raffleTitle', ${raffle.title},
              'year', ${currentYear},
              'eventName', ${raffle.event_name}
            ),
            'pending'
          )
        `
      } catch (emailError) {
        console.error("[v0] Failed to queue non-winner email for:", nonWinner.email, emailError)
      }
    }
    console.log(`[v0] Queued ${nonWinners.length} non-winner notification emails`)

    return NextResponse.json({
      raffle: result[0],
      winner: {
        name: winner.name,
        email: winner.email,
        ticket_number: winner.ticket_number,
        user_id: winner.user_id,
      },
    })
  } catch (error) {
    console.error("[v0] Error drawing raffle winner:", error)
    return NextResponse.json({ error: "Failed to draw winner" }, { status: 500 })
  }
}
