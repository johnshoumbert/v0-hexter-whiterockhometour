import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyPassword, createSession } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { emailOrPhone, password } = await request.json()

    console.log("[v0] Login request received for:", emailOrPhone)

    if (!emailOrPhone || !password) {
      console.log("[v0] Missing credentials")
      return NextResponse.json({ error: "Email/phone and password are required" }, { status: 400 })
    }

    console.log("[v0] Querying database for user...")

    let users
    try {
      users = await sql`
        SELECT id, name, email, phone, password_hash, is_admin, created_at
        FROM users
        WHERE email = ${emailOrPhone} OR phone = ${emailOrPhone}
      `
    } catch (dbError: any) {
      console.error("[v0] Database error during login:", dbError?.message || dbError)

      // Check if it's a rate limit error
      if (dbError?.message?.includes("Too Many")) {
        return NextResponse.json(
          { error: "Service temporarily unavailable. Please try again in a moment." },
          { status: 503 },
        )
      }

      return NextResponse.json({ error: "Login failed" }, { status: 500 })
    }

    console.log("[v0] Users found:", users.length)

    if (users.length === 0) {
      console.log("[v0] No user found with email/phone:", emailOrPhone)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const user = users[0]
    console.log("[v0] User found, verifying password...")

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash)

    console.log("[v0] Password valid:", isValid)

    if (!isValid) {
      console.log("[v0] Invalid password for user:", emailOrPhone)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Create session
    console.log("[v0] Creating session for user:", user.id)
    await createSession(user.id.toString())
    console.log("[v0] Session created successfully")

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        is_admin: user.is_admin,
      },
    })
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json(
      {
        error: "Login failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
