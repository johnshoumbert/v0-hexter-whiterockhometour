import "server-only"
import { sql } from "./db"
import { getSession, isEventAdmin as checkEventAdmin } from "./auth"
import type { User } from "./auth"

export interface AdminCheckResult {
  isAdmin: boolean
  isGlobalAdmin: boolean
  isEventAdmin: boolean
  user: User | null
  eventId?: string | null
}

/**
 * Check if the current session user has admin access (global or event-specific)
 * @param eventId - Optional event ID to check event-specific admin access
 * @returns Admin check result with detailed access information
 */
export async function checkAdminAccess(eventId?: string): Promise<AdminCheckResult> {
  const user = await getSession()

  if (!user) {
    return {
      isAdmin: false,
      isGlobalAdmin: false,
      isEventAdmin: false,
      user: null,
    }
  }

  const isGlobalAdmin = user.is_admin || user.role === "admin"

  let isEventAdminUser = false
  let checkedEventId: string | null = null

  if (eventId) {
    isEventAdminUser = await checkEventAdmin(user.id, eventId)
    checkedEventId = eventId
  }

  const isAdmin = isGlobalAdmin || isEventAdminUser

  return {
    isAdmin,
    isGlobalAdmin,
    isEventAdmin: isEventAdminUser,
    user,
    eventId: checkedEventId,
  }
}

/**
 * Check if a user has admin access to a specific event
 * @param userId - User ID to check
 * @param eventId - Event ID to check access for
 * @returns True if user is global admin or event admin for this event
 */
export async function hasEventAccess(userId: number, eventId: string): Promise<boolean> {
  try {
    // Check if user is global admin
    const userResult = await sql`
      SELECT is_admin, role
      FROM users
      WHERE id = ${userId}
    `

    if (userResult.length === 0) {
      return false
    }

    const user = userResult[0]
    if (user.is_admin || user.role === "admin") {
      return true
    }

    // Check if user is event admin
    const eventAdminResult = await sql`
      SELECT role
      FROM event_users
      WHERE user_id = ${userId} AND event_id = ${eventId}
    `

    return eventAdminResult.some((row: any) => row.role === "admin")
  } catch (error: any) {
    if (error?.message?.includes("Too Many")) {
      console.warn("[v0] Rate limit in hasEventAccess, returning false")
      return false
    }
    console.error("[v0] hasEventAccess error:", error?.message || error)
    return false
  }
}

/**
 * Require admin access or throw 403 error
 * Use in API routes to enforce admin access
 * @param user - User object from session
 * @param eventId - Optional event ID to check event-specific access
 * @throws Response with 403 status if not authorized
 */
export async function requireAdmin(user: User | null, eventId?: string): Promise<void> {
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const { isAdmin } = await checkAdminAccess(eventId)

  if (!isAdmin) {
    throw new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }
}

/**
 * Check if user is global admin (not event-specific)
 * @param user - User object to check
 * @returns True if user is global admin
 */
export function isGlobalAdmin(user: User | null): boolean {
  if (!user) return false
  return user.is_admin || user.role === "admin"
}
