import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getServerSession } from "@/lib/session"

export async function GET(request: Request) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ isAdmin: false, isLoggedIn: false }, { status: 200 })
    }

    const userId = session.user.id

    // Get the event from the host domain
    const url = new URL(request.url)
    const host = request.headers.get("host") || ""
    const normalizedHost = host.split(":")[0].toLowerCase()

    let isGlobalAdmin = false
    try {
      const userRole = await sql`
        SELECT role, is_admin FROM users 
        WHERE id = ${userId}
        LIMIT 1
      `

      isGlobalAdmin = userRole.length > 0 && (userRole[0].role === "admin" || userRole[0].is_admin === true)
    } catch (dbError) {
      console.error("[v0] Error fetching user role:", dbError)
      // Continue even if this fails - might still be event admin
    }

    const isLocalOrPreview =
      normalizedHost === "localhost" ||
      normalizedHost === "" ||
      normalizedHost.includes("vusercontent.net") ||
      normalizedHost.includes("vercel.app")

    if (isLocalOrPreview) {
      // Check if user is an event admin for any event
      try {
        const eventAdmins = await sql`
          SELECT event_id FROM event_users 
          WHERE user_id = ${userId} AND role = 'admin'
          LIMIT 1
        `

        const isEventAdmin = eventAdmins.length > 0

        if (isGlobalAdmin || isEventAdmin) {
          return NextResponse.json({
            isAdmin: true,
            isLoggedIn: true,
            eventId: isEventAdmin ? eventAdmins[0].event_id : null,
          })
        }
      } catch (dbError) {
        console.error("[v0] Error checking event admins:", dbError)
        // If we're global admin, still grant access
        if (isGlobalAdmin) {
          return NextResponse.json({
            isAdmin: true,
            isLoggedIn: true,
            eventId: null,
          })
        }
      }

      // Not an admin at all
      return NextResponse.json({
        isAdmin: false,
        isLoggedIn: true,
        error: "Not an administrator",
      })
    }

    // Get event by domain for production domains
    try {
      const events = await sql`
        SELECT id FROM events 
        WHERE domain = ${normalizedHost}
        LIMIT 1
      `

      if (events.length === 0) {
        if (isGlobalAdmin) {
          return NextResponse.json({
            isAdmin: true,
            isLoggedIn: true,
            eventId: null,
          })
        }

        return NextResponse.json({
          isAdmin: false,
          isLoggedIn: true,
          error: "Event not found",
        })
      }

      const eventId = events[0].id

      // Check if user is an event admin
      const admins = await sql`
        SELECT id FROM event_users 
        WHERE event_id = ${eventId} 
        AND user_id = ${userId}
        AND role = 'admin'
        LIMIT 1
      `

      const isEventAdmin = admins.length > 0

      // User is admin if they're either a global admin OR an event admin
      const isAdmin = isGlobalAdmin || isEventAdmin

      return NextResponse.json({
        isAdmin,
        isLoggedIn: true,
        eventId,
      })
    } catch (dbError) {
      console.error("[v0] Error checking event domain:", dbError)
      // If we're global admin, still grant access
      if (isGlobalAdmin) {
        return NextResponse.json({
          isAdmin: true,
          isLoggedIn: true,
          eventId: null,
        })
      }
      throw dbError
    }
  } catch (error) {
    console.error("[v0] Error checking admin access:", error)
    return NextResponse.json({
      isAdmin: false,
      isLoggedIn: false,
      error: "Failed to check admin access",
    })
  }
}
