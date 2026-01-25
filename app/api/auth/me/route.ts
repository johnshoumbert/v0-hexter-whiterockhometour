import { NextResponse } from "next/server"
import { getSession, isEventAdmin } from "@/lib/auth"
import { headers } from "next/headers"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ user: null, error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    let eventId: string | null = searchParams.get("eventId")

    if (!eventId) {
      const headersList = await headers()
      const host = headersList.get("host") || ""

      try {
        const eventResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || `http://${host}`}/api/events/by-domain`,
          {
            headers: { host },
          },
        )

        // Only try to parse JSON if response is ok
        if (eventResponse.ok) {
          const contentType = eventResponse.headers.get("content-type")
          if (contentType && contentType.includes("application/json")) {
            const eventData = await eventResponse.json()
            eventId = eventData.event?.id
          }
        }
      } catch (error) {
        // Silently fail - this is expected when on main domain or when event doesn't exist
      }
    }

    // Check event-specific admin status
    const userIsEventAdmin = eventId ? await isEventAdmin(user.id, eventId) : false

    let eventRole: string | undefined
    if (eventId) {
      try {
        const eventUserResult = await sql`
          SELECT role FROM event_users 
          WHERE user_id = ${user.id} AND event_id = ${eventId}
        `
        if (eventUserResult.length > 0) {
          eventRole = eventUserResult[0].role
        }
      } catch (error) {
        console.error("[v0] Failed to fetch event role:", error)
      }
    }

    return NextResponse.json({
      user: {
        ...user,
        isEventAdmin: userIsEventAdmin || user.is_admin, // Global admins are admins everywhere
        eventRole,
      },
    })
  } catch (error) {
    console.error("[v0] Get session error:", error)
    return NextResponse.json({ error: "Failed to get session" }, { status: 500 })
  }
}
