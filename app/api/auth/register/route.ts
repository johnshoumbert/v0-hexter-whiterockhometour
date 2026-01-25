import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { hashPassword, createSession } from "@/lib/auth"
import { sendEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, password } = await request.json()

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 })
    }

    const existingUsers = await sql`
      SELECT id, email, phone FROM users 
      WHERE email = ${email} OR phone = ${phone || null}
    `

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0]
      if (existingUser.email === email) {
        return NextResponse.json({ error: "This email is already registered" }, { status: 400 })
      }
      if (phone && existingUser.phone === phone) {
        return NextResponse.json({ error: "This phone number is already registered" }, { status: 400 })
      }
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password)

    const newUsers = await sql`
      INSERT INTO users (name, email, phone, password_hash, role)
      VALUES (${name}, ${email}, ${phone || null}, ${passwordHash}, 'user')
      RETURNING id, name, email, phone, role, created_at
    `

    const user = newUsers[0]

    const domain = request.headers.get("host")?.split(":")[0] || ""

    if (domain && domain !== "localhost" && !domain.includes("myschoolauction.com")) {
      const eventResult = await sql`
        SELECT id FROM events WHERE domain = ${domain} LIMIT 1
      `

      if (eventResult.length > 0) {
        const eventId = eventResult[0].id
        console.log("[v0] Adding new user to event:", eventId)

        await sql`
          INSERT INTO event_users (event_id, user_id, role, created_at)
          VALUES (${eventId}, ${user.id}, 'participant', NOW())
          ON CONFLICT (event_id, user_id) DO NOTHING
        `

        console.log("[v0] User successfully added to event_users")
      }
    }

    // Create session
    await createSession(user.id)

    const appDomain = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://myschoolauction.com"

    const sendResult = await sendEmail({
      to: email,
      subject: "Finish Creating Your MySchoolAuction Account",
      templateName: "finish-account",
      dynamicTemplateData: {
        name,
        userId: user.id,
        link: `${appDomain}/login`,
      },
    })

    const emailStatus = sendResult.success ? "sent" : "failed"
    const errorMessage = !sendResult.success ? sendResult.error : null

    const dynamicData = JSON.stringify({
      name: name,
      userId: user.id,
      link: `${appDomain}/login`,
    })

    const templateResult = await sql`
      SELECT template_id FROM email_templates 
      WHERE email_task = 'finish-account' 
      AND is_active = true
      LIMIT 1
    `
    const templateId = templateResult[0]?.template_id || "d-finish-account"

    // Record email in queue
    await sql`
      INSERT INTO email_queue (
        template_id, subject, to_email, from_email,
        dynamic_template_data, status, error_message
      )
      VALUES (
        ${templateId},
        'Finish Creating Your MySchoolAuction Account',
        ${email},
        ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
        ${dynamicData}::jsonb,
        ${emailStatus},
        ${errorMessage}
      )
    `

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("[v0] Registration error:", error)

    if (error && typeof error === "object" && "code" in error) {
      const dbError = error as { code: string; constraint?: string }

      // PostgreSQL unique constraint violation error code
      if (dbError.code === "23505") {
        if (dbError.constraint?.includes("email")) {
          return NextResponse.json({ error: "This email is already registered" }, { status: 400 })
        }
        if (dbError.constraint?.includes("phone")) {
          return NextResponse.json({ error: "This phone number is already registered" }, { status: 400 })
        }
        return NextResponse.json({ error: "An account with these details already exists" }, { status: 400 })
      }
    }

    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 })
  }
}
