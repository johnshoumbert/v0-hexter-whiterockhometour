import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sendEmail } from "@/lib/email"

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const user = await getSession()
    const { eventId } = await params

    if (!user || !user.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { email, name, isAdmin = false } = body

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    console.log("[v0] Sending invite to:", email, "for event:", eventId, "as admin:", isAdmin)

    const eventResult = await sql`
      SELECT event_name, domain FROM events WHERE id = ${eventId}
    `
    const eventData = eventResult[0]

    const existingUser = await sql`
      SELECT id, name FROM users WHERE email = ${email}
    `

    if (existingUser.length > 0) {
      const userId = existingUser[0].id
      const userName = existingUser[0].name
      console.log("[v0] User already exists:", userId)

      const role = isAdmin ? "admin" : "participant"

      const existingEventUser = await sql`
        SELECT id FROM event_users WHERE event_id = ${eventId} AND user_id = ${userId}
      `

      if (existingEventUser.length > 0) {
        // Update existing role
        await sql`
          UPDATE event_users 
          SET role = ${role}
          WHERE event_id = ${eventId} AND user_id = ${userId}
        `
      } else {
        // Insert new event user
        await sql`
          INSERT INTO event_users (event_id, user_id, role)
          VALUES (${eventId}, ${userId}, ${role})
        `
      }

      if (isAdmin) {
        const existingAdmin = await sql`
          SELECT id FROM event_admins WHERE event_id = ${eventId} AND user_id = ${userId}
        `

        if (existingAdmin.length === 0) {
          await sql`
            INSERT INTO event_admins (event_id, user_id)
            VALUES (${eventId}, ${userId})
          `
        }
      }

      const eventUrl = `https://${eventData.domain === "localhost" ? process.env.NEXT_PUBLIC_APP_URL?.replace("https://", "") : eventData.domain}`

      console.log("[v0] Sending admin invite email to existing user")
      await sendEmail({
        to: email,
        subject: `You've been invited to manage ${eventData.event_name}`,
        templateId: process.env.SENDGRID_ADMIN_INVITE_TEMPLATE_ID,
        dynamicTemplateData: {
          event_name: eventData.event_name,
          event_url: eventUrl,
          admin_name: user.name || user.email,
          invitee_name: userName,
          role: isAdmin ? "Admin" : "Participant",
          is_admin: isAdmin,
        },
      })

      return NextResponse.json({
        success: true,
        message: `User added to event successfully as ${role}`,
        userId,
      })
    }

    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now

    const existingInvite = await sql`
      SELECT id FROM invites WHERE event_id = ${eventId} AND email = ${email}
    `

    if (existingInvite.length > 0) {
      await sql`
        UPDATE invites 
        SET token = ${token},
            expires_at = ${expiresAt},
            accepted = false,
            role = ${isAdmin ? "admin" : "participant"},
            name = ${name || email.split("@")[0]}
        WHERE event_id = ${eventId} AND email = ${email}
      `
    } else {
      await sql`
        INSERT INTO invites (event_id, email, name, token, expires_at, created_by, role)
        VALUES (${eventId}, ${email}, ${name || email.split("@")[0]}, ${token}, ${expiresAt}, ${user.id}, ${isAdmin ? "admin" : "participant"})
      `
    }

    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/register?token=${token}`

    const eventUrl = `https://${eventData.domain === "localhost" ? process.env.NEXT_PUBLIC_APP_URL?.replace("https://", "") : eventData.domain}`

    console.log("[v0] Sending new user invite email")
    await sendEmail({
      to: email,
      subject: `You've been invited to ${eventData.event_name}`,
      templateId: process.env.SENDGRID_ADMIN_INVITE_TEMPLATE_ID,
      dynamicTemplateData: {
        event_name: eventData.event_name,
        event_url: eventUrl,
        admin_name: user.name || user.email,
        invitee_name: name || email.split("@")[0],
        invite_link: inviteLink,
        role: isAdmin ? "Admin" : "Participant",
        is_admin: isAdmin,
        expires_days: 7,
      },
    })

    console.log("[v0] Invite link:", inviteLink)
    console.log("[v0] Invite sent successfully to:", email)

    return NextResponse.json({
      success: true,
      message: "Invite sent successfully",
      inviteLink,
    })
  } catch (error: any) {
    console.error("[v0] Send invite error:", error)
    return NextResponse.json({ error: "Failed to send invite", details: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const user = await getSession()
    const { eventId } = await params

    if (!user || !user.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const invites = await sql`
      SELECT 
        i.id,
        i.email,
        i.name,
        i.role,
        i.token,
        i.expires_at,
        i.accepted,
        i.created_at,
        u.name as invited_by
      FROM invites i
      LEFT JOIN users u ON i.created_by = u.id
      WHERE i.event_id = ${eventId}
      AND i.accepted = false
      AND i.expires_at > NOW()
      ORDER BY i.created_at DESC
    `

    return NextResponse.json({ invites })
  } catch (error: any) {
    console.error("[v0] Get invites error:", error)
    return NextResponse.json({ error: "Failed to get invites", details: error.message }, { status: 500 })
  }
}
