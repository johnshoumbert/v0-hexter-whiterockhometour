import { NextResponse } from "next/server"
import { getSession, isEventAdmin } from "@/lib/auth"
import { headers } from "next/headers"
import { sql } from "@/lib/db"
import { normalizeDomain } from "@/lib/normalize-domain"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  console.log("[v0][auth/me] Request started")
  
  try {
    /* ----------------------------------------
     * Check database configuration first
     * ---------------------------------------- */
    const dbUrl = process.env.NEON_DATABASE_URL ||
      process.env.NEON_POSTGRES_URL ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL

    if (!dbUrl) {
      console.error("[v0][auth/me] No database URL configured")
      return NextResponse.json(
        { user: null, error: "Database not configured" },
        { status: 200 }
      )
    }

    console.log("[v0][auth/me] Database URL configured")

    /* ----------------------------------------
     * Resolve user session (must not hang)
     * ---------------------------------------- */
    let user = null
    try {
      user = await getSession()
      console.log("[v0][auth/me] Session result:", user ? "User found" : "No user")
    } catch (sessionError) {
      console.error("[v0][auth/me] Session error:", sessionError)
      return NextResponse.json({ user: null }, { status: 200 })
    }

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    /* ----------------------------------------
     * Resolve eventId
     * ---------------------------------------- */
    const { searchParams } = new URL(request.url)
    let eventId: string | null = searchParams.get("eventId")

    if (!eventId) {
      const headersList = await headers()
      const host = headersList.get("host")

      if (host) {
        const domain = normalizeDomain(host)
        console.log("[v0][auth/me] Looking up event for domain:", domain)

        try {
          const eventRows = await sql`
            SELECT id
            FROM events
            WHERE application_name = 'hometour'
              AND LOWER(
                REGEXP_REPLACE(
                  REGEXP_REPLACE(TRIM(domain), '^https?://', ''),
                  '^www\\.',
                  ''
                )
              ) = ${domain}
            LIMIT 1
          `

          if (eventRows.length > 0) {
            eventId = eventRows[0].id
          }
        } catch (eventError) {
          console.error("[v0][auth/me] Event lookup error:", eventError)
        }
      }
    }

    /* ----------------------------------------
     * Event admin + role checks
     * ---------------------------------------- */
    let userIsEventAdmin = false
    let eventRole: string | undefined

    if (eventId) {
      try {
        userIsEventAdmin = await isEventAdmin(user.id, eventId)
      } catch (adminError) {
        console.error("[v0][auth/me] Admin check error:", adminError)
      }

      try {
        const eventUserResult = await sql`
          SELECT role
          FROM event_users
          WHERE user_id = ${user.id}
            AND event_id = ${eventId}
          LIMIT 1
        `

        if (eventUserResult.length > 0) {
          eventRole = eventUserResult[0].role
        }
      } catch (roleError) {
        console.error("[v0][auth/me] Role lookup error:", roleError)
      }
    }

    /* ----------------------------------------
     * Return response (always)
     * ---------------------------------------- */
    console.log("[v0][auth/me] Returning user response")
    return NextResponse.json({
      user: {
        ...user,
        isEventAdmin: user.is_admin || userIsEventAdmin,
        eventRole,
      },
    })
  } catch (error) {
    console.error("[v0][auth/me] Fatal error:", error)

    return NextResponse.json(
      { user: null, error: "Failed to get session" },
      { status: 200 }
    )
  }
}
