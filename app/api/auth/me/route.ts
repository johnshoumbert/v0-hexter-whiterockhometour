import { NextResponse } from "next/server"
import { getSession, isEventAdmin } from "@/lib/auth"
import { headers } from "next/headers"
import { sql } from "@/lib/db"
import { normalizeDomain } from "@/lib/normalize-domain"

function invariant(condition: any, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

export async function GET(request: Request) {
  try {
    /* ----------------------------------------
     * Resolve user session (must not hang)
     * ---------------------------------------- */
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    /* ----------------------------------------
     * Resolve eventId
     * ---------------------------------------- */
    const { searchParams } = new URL(request.url)
    let eventId: string | null = searchParams.get("eventId")

    if (!eventId) {
      const headersList = headers()
      const host = headersList.get("host")

      if (host) {
        const domain = normalizeDomain(host)

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
      }
    }

    /* ----------------------------------------
     * Event admin + role checks
     * ---------------------------------------- */
    const userIsEventAdmin =
      eventId ? await isEventAdmin(user.id, eventId) : false

    let eventRole: string | undefined

    if (eventId) {
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
    }

    /* ----------------------------------------
     * Return response (always)
     * ---------------------------------------- */
    return NextResponse.json({
      user: {
        ...user,
        isEventAdmin: user.is_admin || userIsEventAdmin,
        eventRole,
      },
    })
  } catch (error) {
    console.error("[auth/me] Fatal error:", error)

    return NextResponse.json(
      { error: "Failed to get session" },
      { status: 500 }
    )
  }
}
