import "server-only"
import bcrypt from "bcryptjs"
import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import { sql } from "./db"
import type { NextRequest } from "next/server"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-in-production")

export interface User {
  id: number
  name: string
  email: string
  phone: string | null
  is_admin: boolean
  created_at: string
  profile_image: string | null
  role: string | null
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    console.log("[v0] Verifying password...")
    const result = await bcrypt.compare(password, hash)
    console.log("[v0] Password verification result:", result)
    return result
  } catch (error) {
    console.error("[v0] Password verification error:", error)
    return false
  }
}

export async function createSession(userId: string): Promise<string> {
  try {
    console.log("[v0] Creating JWT token for user:", userId)
    const token = await new SignJWT({ userId })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(JWT_SECRET)

    console.log("[v0] JWT token created, setting cookie...")

    const cookieStore = await cookies()
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    console.log("[v0] Session cookie set successfully")

    return token
  } catch (error) {
    console.error("[v0] Error creating session:", error)
    throw error
  }
}

export async function getSession(): Promise<User | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (!token) {
      return null
    }

    let payload
    try {
      const verified = await jwtVerify(token, JWT_SECRET)
      payload = verified.payload
    } catch (jwtError) {
      console.error("[v0] JWT verification failed:", jwtError)
      return null
    }

    const userId = payload.userId as string

    try {
      const users = await sql`
        SELECT id, name, email, phone, role, is_admin, created_at, profile_image
        FROM users
        WHERE id = ${userId}
      `

      const dbUser = users[0]
      if (!dbUser) return null

      const user = {
        ...dbUser,
        is_admin: dbUser.is_admin || dbUser.role === "admin",
      } as User

      return user
    } catch (dbError: any) {
      if (dbError?.isRateLimit) {
        console.warn("[v0] Rate limit encountered in getSession, returning null")
        return null
      }
      console.error("[v0] Database query error in getSession:", dbError?.message || dbError)
      return null
    }
  } catch (error) {
    console.error("[v0] Session verification error:", error)
    return null
  }
}

export async function isEventAdmin(userId: number, eventId: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT role, user_id, event_id
      FROM event_users
      WHERE user_id = ${userId} AND event_id = ${eventId}
    `

    return result.some((row: any) => row.role === "admin")
  } catch (error: any) {
    if (error?.message?.includes("Too Many")) {
      console.warn("[v0] Rate limit in isEventAdmin, returning false")
      return false
    }
    console.error("[v0] isEventAdmin error:", error?.message || error)
    return false
  }
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete("session")
}

export async function verifySession(): Promise<{ userId: string } | null> {
  const user = await getSession()
  if (!user) {
    return null
  }
  return { userId: user.id.toString() }
}

export async function verifyToken(token: string): Promise<{ userId: string } | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET)
    const payload = verified.payload
    return { userId: payload.userId as string }
  } catch (error) {
    console.error("[v0] Token verification error:", error)
    return null
  }
}

export async function verifyAuth(req: NextRequest): Promise<User | null> {
  try {
    const token = req.cookies.get("session")?.value

    if (!token) {
      return null
    }

    let payload
    try {
      const verified = await jwtVerify(token, JWT_SECRET)
      payload = verified.payload
    } catch (jwtError) {
      console.error("[v0] JWT verification failed:", jwtError)
      return null
    }

    const userId = payload.userId as string

    try {
      const users = await sql`
        SELECT id, name, email, phone, role, is_admin, created_at, profile_image
        FROM users
        WHERE id = ${userId}
      `

      const dbUser = users[0]
      if (!dbUser) return null

      const user = {
        ...dbUser,
        is_admin: dbUser.is_admin || dbUser.role === "admin",
      } as User

      return user
    } catch (dbError: any) {
      if (dbError?.isRateLimit) {
        console.warn("[v0] Rate limit encountered in verifyAuth, returning null")
        return null
      }
      console.error("[v0] Database query error in verifyAuth:", dbError?.message || dbError)
      return null
    }
  } catch (error) {
    console.error("[v0] Auth verification error:", error)
    return null
  }
}

export async function checkAuth(req: NextRequest): Promise<{
  isAuthenticated: boolean
  isAdmin: boolean
  user: User | null
}> {
  const user = await verifyAuth(req)

  return {
    isAuthenticated: !!user,
    isAdmin: user?.is_admin || false,
    user,
  }
}
