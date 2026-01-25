import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST(request: Request) {
  try {
    const sql = neon(process.env.NEON_DATABASE_URL!)

    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Find valid token
    const tokens = await sql`
      SELECT token_id, reset_token
      FROM password_reset_tokens
      WHERE email = ${email}
      AND reset_code = ${code}
      AND expires_at > NOW()
      AND used_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (tokens.length === 0) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 })
    }

    const token = tokens[0]

    return NextResponse.json({ success: true, token: token.reset_token }, { status: 200 })
  } catch (error) {
    console.error("[v0] Error verifying reset code:", error)
    return NextResponse.json({ error: "An error occurred. Please try again." }, { status: 500 })
  }
}
