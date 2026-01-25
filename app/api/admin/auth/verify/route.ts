import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    // Get the session from the cookie (not the Authorization header)
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Check if user is an admin
    const isAdmin = session.role === "admin"

    if (!isAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    return NextResponse.json({
      isAdmin: true,
      userId: session.userId,
      email: session.email,
    })
  } catch (error) {
    console.error("[v0] Error verifying admin session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
