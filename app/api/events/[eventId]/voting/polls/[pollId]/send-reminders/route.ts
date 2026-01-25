import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string; pollId: string }> }) {
  try {
    const { eventId, pollId } = await params
    const sql = getDb()

    console.log("[v0] Sending vote reminder emails for poll:", pollId)

    // Get poll details
    const [poll] = await sql`
      SELECT id, title, description, event_id
      FROM voting_polls
      WHERE id = ${pollId} AND event_id = ${eventId}
    `

    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 })
    }

    // Get the vote-reminder template from email_templates
    const [template] = await sql`
      SELECT template_id, subject
      FROM email_templates
      WHERE email_task = 'vote-reminder' AND is_active = true
      LIMIT 1
    `

    if (!template) {
      return NextResponse.json({ error: "Vote reminder email template not configured" }, { status: 400 })
    }

    // Get all registered users for this event who haven't voted in this poll
    const usersWithoutVotes = await sql`
      SELECT DISTINCT u.id, u.email, u.name
      FROM users u
      INNER JOIN event_users eu ON u.id = eu.user_id
      WHERE eu.event_id = ${eventId}
        AND u.email IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM votes v
          WHERE v.user_id = u.id AND v.poll_id = ${pollId}
        )
    `

    console.log("[v0] Found users without votes:", usersWithoutVotes.length)

    if (usersWithoutVotes.length === 0) {
      return NextResponse.json({ message: "No users found who haven't voted yet", count: 0 }, { status: 200 })
    }

    // Get event details
    const [event] = await sql`
      SELECT event_name
      FROM events
      WHERE id = ${eventId}
    `

    // Queue emails for all users who haven't voted
    for (const user of usersWithoutVotes) {
      await sql`
        INSERT INTO email_queue (
          template_id, subject, to_email, from_email,
          dynamic_template_data, status
        )
        VALUES (
          ${template.template_id},
          ${template.subject || `Vote Reminder: ${poll.title}`},
          ${user.email},
          ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
          jsonb_build_object(
            'name', ${user.name || "Voter"},
            'pollTitle', ${poll.title},
            'pollDescription', ${poll.description || ""},
            'eventName', ${event?.event_name || "Event"}
          ),
          'pending'
        )
      `
    }

    console.log("[v0] Queued vote reminder emails:", usersWithoutVotes.length)

    return NextResponse.json({
      success: true,
      message: `Vote reminder emails queued for ${usersWithoutVotes.length} users`,
      count: usersWithoutVotes.length,
    })
  } catch (error: any) {
    console.error("[v0] Error sending vote reminders:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
