import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const themes = await sql`
      SELECT * FROM themes
      ORDER BY updated_at DESC
      LIMIT 1
    `

    if (themes.length === 0) {
      // Return default theme if none exists
      return NextResponse.json({
        theme: {
          primary_color: "#3b82f6",
          secondary_color: "#8b5cf6",
          mode: "light",
          logo_url: null,
          event_message: "Welcome to our charity auction!",
        },
      })
    }

    return NextResponse.json({ theme: themes[0] })
  } catch (error) {
    console.error("[v0] Get theme error:", error)
    return NextResponse.json({ error: "Failed to fetch theme" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user || !user.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const updates = await request.json()

    // Get existing theme or create new one
    const existingThemes = await sql`SELECT id FROM themes LIMIT 1`

    let updatedTheme

    if (existingThemes.length > 0) {
      // Update existing theme
      const result = await sql`
        UPDATE themes
        SET 
          primary_color = COALESCE(${updates.primary_color}, primary_color),
          secondary_color = COALESCE(${updates.secondary_color}, secondary_color),
          mode = COALESCE(${updates.mode}, mode),
          logo_url = COALESCE(${updates.logo_url}, logo_url),
          event_message = COALESCE(${updates.event_message}, event_message),
          updated_at = NOW()
        WHERE id = ${existingThemes[0].id}
        RETURNING *
      `
      updatedTheme = result[0]
    } else {
      // Create new theme
      const result = await sql`
        INSERT INTO themes (primary_color, secondary_color, mode, logo_url, event_message)
        VALUES (
          ${updates.primary_color || "#3b82f6"},
          ${updates.secondary_color || "#8b5cf6"},
          ${updates.mode || "light"},
          ${updates.logo_url},
          ${updates.event_message || "Welcome to our charity auction!"}
        )
        RETURNING *
      `
      updatedTheme = result[0]
    }

    return NextResponse.json({ theme: updatedTheme })
  } catch (error) {
    console.error("[v0] Update theme error:", error)
    return NextResponse.json({ error: "Failed to update theme" }, { status: 500 })
  }
}
