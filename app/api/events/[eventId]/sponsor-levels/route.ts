import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const body = await request.json()
    const { name, level, amount, description, sponsor_limit, benefits } = body

    if (!name || !level) {
      return NextResponse.json({ error: "Name and level are required" }, { status: 400 })
    }

    // Check if level already exists
    const existing = await sql`
      SELECT id FROM sponsor_levels WHERE event_id = ${eventId} AND level = ${level}
    `
    if (existing.length > 0) {
      return NextResponse.json({ error: "A sponsor level with this key already exists" }, { status: 400 })
    }

    // Get the max display order
    const maxOrder = await sql`
      SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM sponsor_levels WHERE event_id = ${eventId}
    `
    const displayOrder = maxOrder[0]?.next_order || 1

    // Create the sponsor level
    const result = await sql`
      INSERT INTO sponsor_levels (event_id, name, level, amount, description, sponsor_limit, display_order)
      VALUES (${eventId}, ${name}, ${level}, ${amount || 0}, ${description || ''}, ${sponsor_limit || null}, ${displayOrder})
      RETURNING id
    `

    const sponsorLevelId = result[0].id

    // Add benefits if provided
    if (benefits && benefits.length > 0) {
      for (let i = 0; i < benefits.length; i++) {
        if (benefits[i]) {
          await sql`
            INSERT INTO sponsor_benefits (sponsor_level_id, benefit_text, display_order)
            VALUES (${sponsorLevelId}, ${benefits[i]}, ${i + 1})
          `
        }
      }
    }

    return NextResponse.json({ success: true, id: sponsorLevelId })
  } catch (error: any) {
    console.error("[v0] Error creating sponsor level:", error)
    return NextResponse.json({ error: "Failed to create sponsor level", details: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params

    const levels = await sql`
      SELECT 
        sl.id,
        sl.event_id,
        sl.name,
        sl.level,
        sl.amount,
        sl.description,
        sl.sponsor_limit,
        sl.display_order,
        COUNT(DISTINCT s.id) as sponsor_count,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', sb.id,
              'benefit_text', sb.benefit_text,
              'display_order', sb.display_order
            )
            ORDER BY jsonb_build_object(
              'id', sb.id,
              'benefit_text', sb.benefit_text,
              'display_order', sb.display_order
            )
          ) FILTER (WHERE sb.id IS NOT NULL),
          '[]'
        ) as benefits,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', s.id,
              'name', s.name,
              'logo_url', s.logo_url
            )
            ORDER BY jsonb_build_object(
              'id', s.id,
              'name', s.name,
              'logo_url', s.logo_url
            )
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'
        ) as sponsors
      FROM sponsor_levels sl
      LEFT JOIN sponsor_benefits sb ON sl.id = sb.sponsor_level_id
      LEFT JOIN sponsors s ON s.event_id = sl.event_id AND s.level = sl.level
      WHERE sl.event_id = ${eventId}
      GROUP BY sl.id
      ORDER BY sl.display_order
    `

    console.log("[v0] Sponsor levels loaded:", levels.map((l: any) => ({ 
      level: l.level, 
      sponsor_count: l.sponsor_count,
      sponsor_limit: l.sponsor_limit 
    })))
    
    return NextResponse.json({ levels })
  } catch (error: any) {
    console.error("[v0] Error fetching sponsor levels:", error)

    if (error.message?.includes("relation") && error.message?.includes("does not exist")) {
      return NextResponse.json({ levels: [] })
    }

    return NextResponse.json({ error: "Failed to fetch sponsor levels" }, { status: 500 })
  }
}
