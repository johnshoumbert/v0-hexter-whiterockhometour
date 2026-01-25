import { NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import { checkAdminAccess } from "@/lib/admin-check"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params

    const result = await sql`
      SELECT page_settings
      FROM events
      WHERE id = ${eventId}
    `

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    return NextResponse.json({ pageSettings: result.rows[0].page_settings || {} })
  } catch (error: any) {
    // Handle missing database connection gracefully - return empty settings
    if (error?.message?.includes("missing_connection_string") || error?.message?.includes("POSTGRES_URL")) {
      console.log("[v0] Database connection not available, returning default page settings")
      return NextResponse.json({ pageSettings: {} })
    }
    console.error("Error fetching page settings:", error)
    return NextResponse.json({ pageSettings: {} }, { status: 200 })
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

    // Update page settings using JSONB operations
    const result = await sql`
      UPDATE events
      SET page_settings = COALESCE(page_settings, '{}'::jsonb) || 
        jsonb_build_object(${page}, COALESCE(page_settings->${page}, '{}'::jsonb) || jsonb_build_object(${section}, ${JSON.stringify(data)}::jsonb))
      WHERE id = ${eventId}
      RETURNING page_settings
    `

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    return NextResponse.json({ pageSettings: result.rows[0].page_settings })
  } catch (error: any) {
    // Handle missing database connection gracefully
    if (error?.message?.includes("missing_connection_string") || error?.message?.includes("POSTGRES_URL")) {
      console.log("[v0] Database connection not available, returning default response")
      return NextResponse.json({ pageSettings: {} })
    }
    console.error("Error updating page settings:", error)
    return NextResponse.json({ pageSettings: {} }, { status: 200 })
  }
}
