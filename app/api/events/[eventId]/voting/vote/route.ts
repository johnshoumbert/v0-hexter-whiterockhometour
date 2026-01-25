import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { sendEmail } from "@/lib/email"

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { poll_id, item_id } = body
    const { eventId } = await params

    console.log("[v0] Casting vote:", { poll_id, item_id, user_id: session.id })

    // Check if poll allows vote changes
    const [poll] = await sql`SELECT allow_vote_changes, title FROM voting_polls WHERE id = ${poll_id}`
    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 })
    }

    const [event] = await sql`SELECT event_name, domain as event_domain FROM events WHERE id = ${eventId}`
    const eventName = event?.event_name || "Event"
    const eventDomain = event?.event_domain
      ? `https://${event.event_domain}`
      : request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://myschoolauction.com"

    // Get user details for email
    const [user] = await sql`SELECT email, name FROM users WHERE id = ${session.id}`

    // Check if user has already voted
    const [existingVote] = await sql`
      SELECT * FROM votes WHERE poll_id = ${poll_id} AND user_id = ${session.id}
    `

    if (existingVote) {
      if (!poll.allow_vote_changes) {
        return NextResponse.json({ error: "Vote changes not allowed for this poll" }, { status: 400 })
      }

      // Update existing vote
      const [vote] = await sql`
        UPDATE votes
        SET item_id = ${item_id}, updated_at = CURRENT_TIMESTAMP
        WHERE poll_id = ${poll_id} AND user_id = ${session.id}
        RETURNING *
      `

      console.log("[v0] Vote updated successfully:", vote)
      return NextResponse.json({ vote, message: "Vote updated successfully" })
    }

    // Create new vote
    const [vote] = await sql`
      INSERT INTO votes (poll_id, item_id, user_id)
      VALUES (${poll_id}, ${item_id}, ${session.id})
      RETURNING *
    `

    console.log("[v0] Vote cast successfully:", vote)

    if (user && user.email) {
      try {
        const currentYear = new Date().getFullYear()
        const sendResult = await sendEmail({
          to: user.email,
          subject: "Thank You for Your Vote",
          templateName: "vote-confirmation",
          dynamicTemplateData: {
            name: user.name || "Voter",
            voteTitle: poll.title,
            year: currentYear,
            eventName: eventName,
            link: `${eventDomain}/voting`,
          },
        })

        const emailStatus = sendResult.success ? "sent" : "failed"
        const errorMessage = !sendResult.success ? sendResult.error : null

        await sql`
          INSERT INTO email_queue (
            template_id, subject, to_email, from_email,
            dynamic_template_data, status, error_message
          )
          VALUES (
            ${"vote-confirmation"},
            ${"Thank You for Your Vote"},
            ${user.email},
            ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
            ${JSON.stringify({
              name: user.name || "Voter",
              voteTitle: poll.title,
              year: currentYear,
              eventName: eventName,
              link: `${eventDomain}/voting`,
            })}::jsonb,
            ${emailStatus},
            ${errorMessage}
          )
        `
        console.log("[v0] Vote confirmation email sent/recorded for:", user.email)
      } catch (emailError) {
        console.error("[v0] Failed to send vote confirmation email:", emailError)
      }
    }

    return NextResponse.json({ vote, message: "Vote cast successfully" })
  } catch (error) {
    console.error("[v0] Error casting vote:", error)
    return NextResponse.json({ error: "Failed to cast vote" }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ votes: [] })
    }

    const { eventId } = await params

    const votes = await sql`
      SELECT v.*, vi.title as item_title, vp.title as poll_title
      FROM votes v
      JOIN voting_items vi ON vi.id = v.item_id
      JOIN voting_polls vp ON vp.id = v.poll_id
      WHERE v.user_id = ${session.id}
    `

    return NextResponse.json({ votes })
  } catch (error) {
    console.error("[v0] Error fetching user votes:", error)
    return NextResponse.json({ error: "Failed to fetch votes" }, { status: 500 })
  }
}
