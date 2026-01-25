import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { hashPassword, createSession } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json()

    if (!token || !newPassword) {
      return NextResponse.json({ error: "Token and new password are required" }, { status: 400 })
    }

    console.log("[v0] Verifying magic link token")

    const tokenResult = await sql`
      SELECT * FROM password_reset_tokens
      WHERE reset_token = ${token}
      AND used_at IS NULL
      AND expires_at > NOW()
      LIMIT 1
    `

    if (tokenResult.length === 0) {
      return NextResponse.json({ error: "Invalid or expired magic link" }, { status: 400 })
    }

    const tokenData = tokenResult[0]
    const userId = tokenData.id

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword)

    await sql`
      UPDATE users
      SET password_hash = ${hashedPassword}, updated_at = NOW()
      WHERE id = ${userId}
    `

    await sql`
      UPDATE password_reset_tokens
      SET used_at = NOW()
      WHERE reset_token = ${token}
    `

    // Create session for the user
    await createSession(userId.toString())

    console.log("[v0] Password set successfully for user:", userId)

    return NextResponse.json({ success: true, message: "Password set successfully" })
  } catch (error) {
    console.error("[v0] Magic link verification error:", error)
    return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 500 })
  }
}
