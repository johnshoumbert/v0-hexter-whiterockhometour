import { NextResponse } from "next/server"
import { getSession, isEventAdmin } from "@/lib/auth"
import { headers } from "next/headers"
import { sql } from "@/lib/db"
import { normalizeDomain } from "@/lib/normalize-domain"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  console.log("[v0][auth/me] === Request started ===")
  
  try {
    /* ----------------------------------------
     * Check database configuration first
     * ---------------------------------------- */
    console.log("[v0][auth/me] Step 1: Checking database configuration")
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
    console.log("[v0][auth/me] Database URL configured: Yes")

    /* ----------------------------------------
     * Resolve user session (must not hang)
     * ---------------------------------------- */
    console.log("[v0][auth/me] Step 2: Getting user session")
    let user = null
    try {
      user = await getSession()
      console.log("[v0][auth/me] Session result:", user ? `User found (ID: ${user.id})` : "No user")
    } catch (sessionError: any) {
      console.error("[v0][auth/me] Session error name:", sessionError?.name)
      console.error("[v0][auth/me] Session error message:", sessionError?.message)
      console.error("[v0][auth/me] Session error stack:", sessionError?.stack)
      return NextResponse.json({ user: null }, { status: 200 })
    }

    if (!user) {
      console.log("[v0][auth/me] No user session, returning null")
      return NextResponse.json({ user: null }, { status: 200 })
    }

    /* ----------------------------------------
     * Resolve eventId from searchParams
     * ---------------------------------------- */
    console.log("[v0][auth/me] Step 3: Resolving eventId")
    let eventId: string | null = null
    
    try {
      const url = new URL(request.url)
      eventId = url.searchParams.get("eventId")
      console.log("[v0][auth/me] eventId from searchParams:", eventId)
    } catch (urlError) {
      console.error("[v0][auth/me] URL parsing error:", urlError)
    }

    /* ----------------------------------------
     * If no eventId, try to get from host header
     * ---------------------------------------- */
    if (!eventId) {
      console.log("[v0][auth/me] Step 4: Getting eventId from host header")
      try {
        const headersList = await headers()
        const host = headersList.get("host")
        console.log("[v0][auth/me] Host header:", host)

        if (host) {
          let domain: string
          try {
            domain = normalizeDomain(host)
            console.log("[v0][auth/me] Normalized domain:", domain)
          } catch (normalizeError) {
            console.error("[v0][auth/me] Domain normalization error:", normalizeError)
            domain = ""
          }

          if (domain) {
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
              console.log("[v0][auth/me] Event lookup returned", eventRows.length, "rows")

              if (eventRows.length > 0) {
                eventId = eventRows[0].id
                console.log("[v0][auth/me] Found eventId:", eventId)
              }
            } catch (eventError: any) {
              console.error("[v0][auth/me] Event lookup error name:", eventError?.name)
              console.error("[v0][auth/me] Event lookup error message:", eventError?.message)
            }
          }
        }
      } catch (headerError: any) {
        console.error("[v0][auth/me] Headers error name:", headerError?.name)
        console.error("[v0][auth/me] Headers error message:", headerError?.message)
      }
    }

    /* ----------------------------------------
     * Event admin + role checks
     * ---------------------------------------- */
    console.log("[v0][auth/me] Step 5: Checking admin status and role")
    let userIsEventAdmin = false
    let eventRole: string | undefined

    if (eventId) {
      console.log("[v0][auth/me] Checking admin status for eventId:", eventId)
      try {
        userIsEventAdmin = await isEventAdmin(user.id, eventId)
        console.log("[v0][auth/me] isEventAdmin result:", userIsEventAdmin)
      } catch (adminError: any) {
        console.error("[v0][auth/me] Admin check error name:", adminError?.name)
        console.error("[v0][auth/me] Admin check error message:", adminError?.message)
      }

      console.log("[v0][auth/me] Looking up event role")
      try {
        const eventUserResult = await sql`
          SELECT role
          FROM event_users
          WHERE user_id = ${user.id}
            AND event_id = ${eventId}
          LIMIT 1
        `
        console.log("[v0][auth/me] Event user lookup returned", eventUserResult.length, "rows")

        if (eventUserResult.length > 0) {
          eventRole = eventUserResult[0].role
          console.log("[v0][auth/me] Event role:", eventRole)
        }
      } catch (roleError: any) {
        console.error("[v0][auth/me] Role lookup error name:", roleError?.name)
        console.error("[v0][auth/me] Role lookup error message:", roleError?.message)
      }
    } else {
      console.log("[v0][auth/me] No eventId, skipping admin/role checks")
    }

    /* ----------------------------------------
     * Return response (always)
     * ---------------------------------------- */
    console.log("[v0][auth/me] === Request completed successfully ===")
    return NextResponse.json({
      user: {
        ...user,
        isEventAdmin: user.is_admin || userIsEventAdmin,
        eventRole,
      },
    })
  } catch (error: any) {
    console.error("[v0][auth/me] === Fatal error ===")
    console.error("[v0][auth/me] Error name:", error?.name)
    console.error("[v0][auth/me] Error message:", error?.message)
    console.error("[v0][auth/me] Error stack:", error?.stack)

    return NextResponse.json(
      { user: null, error: "Failed to get session" },
      { status: 200 }
    )
  }
}
