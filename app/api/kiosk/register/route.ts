import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { hashPassword } from "@/lib/auth"
import { generateMemorablePassword } from "@/lib/word-lists"
import { sendEmail } from "@/lib/email"

export async function POST(request: Request) {
  try {
    const { name, email, phone, eventId, ticketQuantities, continueWithExisting, existingUserId } = await request.json()

    if (!name || !email || !phone) {
      return NextResponse.json({ error: "Name, email, and phone are required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    const hasTickets = ticketQuantities && Object.values(ticketQuantities).some((qty: any) => qty > 0)
    if (!hasTickets) {
      return NextResponse.json({ error: "Please select at least one ticket" }, { status: 400 })
    }

    console.log("[v0] Kiosk registration for:", email)

    const eventData = await sql`
      SELECT domain FROM events WHERE id = ${eventId}
    `

    const appUrl = eventData[0]?.domain
      ? `https://${eventData[0].domain}`
      : process.env.NEXT_PUBLIC_APP_URL || "https://myschoolauction.com"

    console.log("[v0] Using app URL:", appUrl)

    // Check if user already exists
    const existingUser = await sql`
      SELECT id, name, email FROM users WHERE email = ${email}
    `

    let userId: string
    let temporaryPassword = ""

    if (existingUser.length > 0) {
      userId = existingUser[0].id

      if (eventId) {
        const existingTickets = await sql`
          SELECT id FROM ticket_purchases 
          WHERE user_id = ${userId} AND event_id = ${eventId}
        `

        if (existingTickets.length > 0 && !continueWithExisting) {
          return NextResponse.json(
            {
              error: "You have already registered for this event.",
              userId,
              userName: existingUser[0].name,
            },
            { status: 400 },
          )
        }

        if (existingTickets.length === 0 && !continueWithExisting) {
          return NextResponse.json(
            {
              error: "User already exists but not registered for this event",
              userId,
              userName: existingUser[0].name,
            },
            { status: 409 },
          )
        }
      }

      console.log("[v0] Continuing registration for existing user:", userId)
      // Generate new temporary password for existing user
      temporaryPassword = generateMemorablePassword()
    } else {
      temporaryPassword = generateMemorablePassword()
      console.log("[v0] Generated temporary password:", temporaryPassword)

      const hashedPassword = await hashPassword(temporaryPassword)

      const newUser = await sql`
        INSERT INTO users (name, email, phone, password_hash, is_active, created_at)
        VALUES (${name}, ${email}, ${phone}, ${hashedPassword}, true, NOW())
        RETURNING id, name, email
      `

      userId = newUser[0].id
    }

    if (eventId && ticketQuantities) {
      const ticketIds = Object.keys(ticketQuantities).filter((id) => ticketQuantities[id] > 0)

      for (const ticketId of ticketIds) {
        const quantity = ticketQuantities[ticketId]

        const ticketDetails = await sql`
          SELECT price, name FROM event_tickets WHERE id = ${ticketId}
        `

        if (ticketDetails.length > 0) {
          const ticket = ticketDetails[0]
          const totalAmount = Number(ticket.price) * quantity

          await sql`
            INSERT INTO ticket_purchases (
              user_id, event_id, ticket_id, quantity, total_amount, status, created_at
            )
            VALUES (
              ${userId}, ${eventId}, ${ticketId}, ${quantity}, ${totalAmount}, 'pending', NOW()
            )
          `

          console.log(`[v0] Created pending ticket purchase: ${quantity}x ${ticket.name} for user ${userId}`)
        }
      }
    }

    const magicToken = `${Date.now()}-${Math.random().toString(36).substring(2)}`
    const resetCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const tokenId = crypto.randomUUID()

    await sql`
      INSERT INTO password_reset_tokens (
        id, token_id, email, phone, reset_code, reset_token, expires_at, created_at
      )
      VALUES (
        ${userId}, ${tokenId}, ${email}, ${phone}, ${resetCode}, ${magicToken}, ${expiresAt}, NOW()
      )
    `

    const magicLink = `${appUrl}/kiosk/verify?token=${magicToken}`

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { 
              background: linear-gradient(135deg, #1F4AFF 0%, #12C29A 100%); 
              color: white; 
              padding: 40px 30px; 
              text-align: center; 
            }
            .header h1 { margin: 0; font-size: 28px; }
            .content { padding: 40px 30px; }
            .password-box { 
              background: #f8f9fa; 
              border-left: 4px solid #1F4AFF;
              padding: 20px; 
              margin: 25px 0; 
              border-radius: 8px;
            }
            .password { 
              font-size: 24px;
              font-weight: bold;
              color: #1F4AFF;
              letter-spacing: 2px;
              text-align: center;
              padding: 15px;
              background: white;
              border-radius: 6px;
              margin-top: 10px;
            }
            .cta-button { 
              display: inline-block;
              background: #1F4AFF;
              color: white;
              padding: 16px 40px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              margin: 20px 0;
            }
            .cta-button:hover { background: #1639cc; }
            .footer { 
              background: #f8f9fa; 
              padding: 20px 30px; 
              text-align: center; 
              color: #666; 
              font-size: 12px; 
              border-top: 1px solid #e0e0e0;
            }
            .warning { 
              background: #fff3cd; 
              border-left: 4px solid #ffc107; 
              padding: 15px; 
              margin: 20px 0; 
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to MySchoolAuction!</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>Thank you for registering at our event kiosk! Your account has been created successfully.</p>
              
              <div class="password-box">
                <p style="margin: 0 0 10px 0; font-weight: bold; color: #555;">Your Temporary Password:</p>
                <div class="password">${temporaryPassword}</div>
                <p style="margin: 15px 0 0 0; font-size: 13px; color: #666;">
                  <strong>Write this down!</strong> You'll need it to set your new password.
                </p>
              </div>

              <p>Click the button below to securely set your password and access your account:</p>

              <div style="text-align: center;">
                <a href="${magicLink}" class="cta-button">Set My Password</a>
              </div>

              <p style="font-size: 13px; color: #666; margin-top: 20px;">
                Or copy and paste this link: <br/>
                <a href="${magicLink}" style="word-break: break-all; color: #1F4AFF;">${magicLink}</a>
              </p>

              <div class="warning">
                <p style="margin: 0;"><strong>🔒 Security Notice:</strong></p>
                <p style="margin: 5px 0 0 0; font-size: 13px;">This link expires in 24 hours. For your security, you'll be prompted to create a new password when you click the link.</p>
              </div>

              <p>Welcome aboard!<br/>The MySchoolAuction Team</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} MySchoolAuction. All rights reserved.</p>
              <p>If you didn't request this registration, please ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `

    let emailStatus = "pending"
    let errorMessage: string | null = null

    try {
      const emailResult = await sendEmail({
        to: email,
        subject: "Welcome! Your MySchoolAuction Account is Ready",
        html: emailHtml,
      })

      if (emailResult.success) {
        emailStatus = "sent"
        console.log("[v0] Magic link email sent successfully to:", email)
      } else {
        errorMessage = emailResult.error || "Unknown error"
        console.error("[v0] Failed to send magic link email:", errorMessage)
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Failed to send email"
      console.error("[v0] Error sending magic link email:", error)
    }

    await sql`
      INSERT INTO email_queue (
        to_email, 
        from_email, 
        subject, 
        status, 
        created_at,
        processed_at,
        error_message
      )
      VALUES (
        ${email}, 
        ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"}, 
        ${"Welcome! Your MySchoolAuction Account is Ready"}, 
        ${emailStatus}, 
        NOW(),
        ${emailStatus === "sent" ? "NOW()" : null},
        ${errorMessage}
      )
    `

    return NextResponse.json({
      success: true,
      message: "Registration successful",
    })
  } catch (error) {
    console.error("[v0] Kiosk registration error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Registration failed. Please try again.",
      },
      { status: 500 },
    )
  }
}
