import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { hashPassword } from "@/lib/password"

export async function POST(request: Request) {
  try {
    const sql = neon(process.env.NEON_DATABASE_URL!)

    const body = await request.json()

    const { token, password, email, code, newPassword } = body

    console.log("[v0] Reset password request - email:", email, "code:", code ? "provided" : "missing")

    let resetToken: { token_id?: string; email: string } | null = null

    // Code-based flow (from forgot-password page)
    if (email && code) {
      console.log("[v0] Looking up reset code for email:", email)
      const tokens = await sql`
        SELECT token_id, email, expires_at, used_at
        FROM password_reset_tokens
        WHERE email = ${email}
        AND reset_code = ${code}
        AND expires_at > NOW()
        AND used_at IS NULL
        LIMIT 1
      `

      console.log("[v0] Reset tokens found:", tokens.length)
      if (tokens.length > 0) {
        console.log("[v0] Token details:", {
          token_id: tokens[0].token_id,
          expires_at: tokens[0].expires_at,
          used_at: tokens[0].used_at,
        })
        resetToken = tokens[0]
      }
    }
    // Token-based flow (from email link)
    else if (token) {
      const tokens = await sql`
        SELECT token_id, email
        FROM password_reset_tokens
        WHERE reset_token = ${token}
        AND expires_at > NOW()
        AND used_at IS NULL
        LIMIT 1
      `

      if (tokens.length > 0) {
        resetToken = tokens[0]
      }
    }

    if (!resetToken) {
      console.error("[v0] No valid reset token found")
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 })
    }

    // Use the appropriate password field
    const newPasswordValue = newPassword || password

    if (!newPasswordValue) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 })
    }

    console.log("[v0] Hashing new password...")
    // Hash new password
    const passwordHash = await hashPassword(newPasswordValue)

    console.log("[v0] Updating user password for email:", resetToken.email)
    // Update user password
    await sql`
      UPDATE users
      SET password_hash = ${passwordHash}
      WHERE email = ${resetToken.email}
    `

    // Mark token as used
    if (resetToken.token_id) {
      console.log("[v0] Marking token as used:", resetToken.token_id)
      await sql`
        UPDATE password_reset_tokens
        SET used_at = NOW()
        WHERE token_id = ${resetToken.token_id}
      `
    }

    console.log("[v0] Password reset successfully")
    return NextResponse.json({ message: "Password reset successfully" }, { status: 200 })
  } catch (error) {
    console.error("[v0] Error resetting password:", error)
    return NextResponse.json({ error: "An error occurred. Please try again." }, { status: 500 })
  }
}
