import { NextRequest, NextResponse } from "next/server"
import { checkAdminAccess } from "@/lib/admin-check"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params

    try {
      const { query } = await import("@/lib/db")
      const result = await query(
        `SELECT page_settings FROM events WHERE id = $1`,
        [eventId]
      )

      if (result.length === 0) {
        return NextResponse.json({ pageSettings: {} })
      }

      return NextResponse.json({ pageSettings: result[0]?.page_settings || {} })
    } catch (dbError) {
      console.error("[v0] Database error in page-settings GET:", dbError)
      // Return empty settings if database is unavailable
      return NextResponse.json({ pageSettings: {} })
    }
  } catch (error) {
    console.error("Error fetching page settings:", error)
    return NextResponse.json({ pageSettings: {} })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const body = await request.json()
    const { page, section, data } = body

    // Check admin access
    const isAdmin = await checkAdminAccess(request, eventId)
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    try {
      const { query } = await import("@/lib/db")
      
      // Get current page settings
      const getResult = await query(
        `SELECT page_settings FROM events WHERE id = $1`,
        [eventId]
      )

      if (getResult.length === 0) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 })
      }

      // Merge with existing settings
      const currentSettings = getResult[0]?.page_settings || {}
      const pageSettings = currentSettings[page] || {}
      const updatedSettings = {
        ...currentSettings,
        [page]: {
          ...pageSettings,
          [section]: data,
        },
      }

      // Update settings
      await query(
        `UPDATE events SET page_settings = $1 WHERE id = $2`,
        [JSON.stringify(updatedSettings), eventId]
      )

      return NextResponse.json({ pageSettings: updatedSettings })
    } catch (dbError) {
      console.error("[v0] Database error in page-settings PUT:", dbError)
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 })
    }
  } catch (error) {
    console.error("Error updating page settings:", error)
    return NextResponse.json({ error: "Failed to update page settings" }, { status: 500 })
  }
}
