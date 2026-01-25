import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.NEON_DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const eventId = searchParams.get("eventId")
    const category = searchParams.get("category")

    console.log("[v0] Fetching FAQs for eventId:", eventId)

    let faqs

    if (eventId && eventId !== "null") {
      // Fetch event-specific FAQs
      if (category) {
        faqs = await sql`
          SELECT id, event_id, question, answer, category, display_order, created_at
          FROM faqs
          WHERE event_id = ${eventId} AND category = ${category}
          ORDER BY display_order ASC, created_at DESC
        `
      } else {
        faqs = await sql`
          SELECT id, event_id, question, answer, category, display_order, created_at
          FROM faqs
          WHERE event_id = ${eventId}
          ORDER BY display_order ASC, created_at DESC
        `
      }
    } else {
      // Fetch general platform FAQs (where event_id IS NULL)
      if (category) {
        faqs = await sql`
          SELECT id, event_id, question, answer, category, display_order, created_at
          FROM faqs
          WHERE event_id IS NULL AND category = ${category}
          ORDER BY display_order ASC, created_at DESC
        `
      } else {
        faqs = await sql`
          SELECT id, event_id, question, answer, category, display_order, created_at
          FROM faqs
          WHERE event_id IS NULL
          ORDER BY display_order ASC, created_at DESC
        `
      }
    }

    console.log(`[v0] Found ${faqs.length} FAQs`)

    return NextResponse.json({ faqs })
  } catch (error) {
    console.error("[v0] Error fetching FAQs:", error)
    return NextResponse.json({ error: "Failed to fetch FAQs" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventId, question, answer, category, displayOrder } = body

    const result = await sql`
      INSERT INTO faqs (event_id, question, answer, category, display_order)
      VALUES (${eventId || null}, ${question}, ${answer}, ${category || "General"}, ${displayOrder || 0})
      RETURNING *
    `

    return NextResponse.json({ faq: result[0] })
  } catch (error) {
    console.error("[v0] Error creating FAQ:", error)
    return NextResponse.json({ error: "Failed to create FAQ" }, { status: 500 })
  }
}
