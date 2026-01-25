import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST(request: Request) {
  try {
    const sql = neon(process.env.NEON_DATABASE_URL!)

    const body = await request.json()

    const { email } = body

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Create password_reset_tokens table if not exists
    await sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(255),
        phone VARCHAR(20),
        reset_code VARCHAR(10) NOT NULL,
        reset_token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        used_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Find user by email
    const users = await sql`
      SELECT id, email, name
      FROM users
      WHERE email = ${email}
      AND is_active = true
      LIMIT 1
    `

    if (users.length === 0) {
      // Return success even if user not found (security best practice)
      return NextResponse.json({ message: "If an account exists, a reset link has been sent" }, { status: 200 })
    }

    const user = users[0]

    // Generate 4-digit code
    const resetCode = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");

    const resetToken = `${Date.now()}-${Math.random().toString(36).substring(2)}`;

    // Store reset token (expires in 15 minutes)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await sql`
      INSERT INTO password_reset_tokens (
        id, email, reset_code, reset_token, expires_at
      )
      VALUES (
        ${user.id}, ${user.email}, ${resetCode}, ${resetToken}, ${expiresAt}
      )
    `;

    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { 
                background: linear-gradient(135deg, #1F4AFF 0%, #12C29A 100%); 
                color: white; 
                padding: 30px; 
                text-align: center; 
                border-radius: 8px 8px 0 0; 
              }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
              .code-box { 
                background: #f5f5f5; 
                padding: 20px; 
                text-align: center;
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
                color: #1F4AFF;
                margin: 20px 0; 
                border-radius: 8px;
              }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              .warning { 
                background: #fff3cd; 
                border-left: 4px solid #ffc107; 
                padding: 15px; 
                margin: 20px 0; 
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hello ${user.name},</p>
                <p>Someone (hopefully you!) has requested to change your password. Please use the code below to reset your password:</p>
                
                <div class="code-box">
                  ${resetCode}
                </div>

                <p>This code will expire in 15 minutes.</p>

                <div class="warning">
                  <p><strong>Security Notice:</strong></p>
                  <p>If you didn't make this request, please disregard this email. Your password will not change unless you use the code above.</p>
                </div>

                <p>Sincerely,<br/>The Auction Team</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Auction Portal. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `

      const sendGridResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: user.email }],
            },
          ],
          from: { email: process.env.SENDGRID_FROM_EMAIL },
          subject: "Password Reset Code",
          content: [
            {
              type: "text/html",
              value: emailHtml,
            },
          ],
        }),
      })

      if (!sendGridResponse.ok) {
        console.error("[v0] SendGrid error:", await sendGridResponse.text())
        return NextResponse.json({ error: "Failed to send reset email" }, { status: 500 })
      }
    }

    return NextResponse.json({ message: "Reset instructions sent successfully" }, { status: 200 })
  } catch (error) {
    console.error("[v0] Error in forgot password:", error)
    return NextResponse.json({ error: "An error occurred. Please try again." }, { status: 500 })
  }
}
