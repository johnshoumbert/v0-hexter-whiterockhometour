import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params

    console.log("[v0] GET /api/events/[eventId] - eventId:", eventId)

    if (eventId === "by-domain") {
      const { searchParams } = new URL(request.url)
      const host = searchParams.get("host") || request.headers.get("host") || ""

      console.log("[v0] by-domain request detected, fetching for host:", host)

      let domain = host.split(":")[0].toLowerCase().replace(/\/+$/, "")

      if (domain === "myschoolauction.com" || domain === "www.myschoolauction.com") {
        return NextResponse.json({ error: "Main domain - no event" }, { status: 404 })
      }

      const isLocalhost =
        domain === "localhost" ||
        domain.includes("127.0.0.1") ||
        domain.includes(".vusercontent.net") ||
        domain.includes("preview-")

      if (isLocalhost) {
        domain = "localhost"
      }

      let eventData
      let eventResult
      try {
        eventResult = await sql`
          SELECT *
          FROM events
          WHERE LOWER(TRIM(TRAILING '/' FROM domain)) = ${domain}
          LIMIT 1
        `

        if (eventResult.length === 0) {
          console.log("[v0] Event not found for host:", host)
          return NextResponse.json({ error: "Event not found" }, { status: 404 })
        }

        eventData = eventResult[0]
      } catch (error) {
        console.log("[v0] Error fetching event:", error)
        return NextResponse.json({ error: "Database error" }, { status: 500 })
      }

      console.log("[v0] Event query result length:", eventResult.length)
      console.log("[v0] Event found:", eventData.event_name)

      let themeData = null
      try {
        const themeResult = await sql`
          SELECT primary_color, secondary_color, logo_url
          FROM themes
          WHERE event_id = ${eventData.id}
          LIMIT 1
        `
        if (themeResult.length > 0) {
          themeData = themeResult[0]
        }
      } catch (error) {
        try {
          const fallbackTheme = await sql`SELECT * FROM themes LIMIT 1`
          if (fallbackTheme.length > 0) {
            themeData = fallbackTheme[0]
          }
        } catch (e) {
          console.log("[v0] No themes available")
        }
      }

      let ticketsData = []
      try {
        const ticketsResult = await sql`
          SELECT id, name, description, price, quantity_available, quantity_sold, is_active
          FROM event_tickets
          WHERE event_id = ${eventData.id}
          ORDER BY price ASC
        `

        console.log("[v0] Tickets query result count:", ticketsResult.length)
        console.log("[v0] Tickets found for event:", eventData.id, "count:", ticketsResult.length)

        // Fetch pricing tiers for each ticket
        const now = new Date()
        ticketsData = await Promise.all(
          ticketsResult.map(async (ticket: any) => {
            try {
              const tiers = await sql`
                SELECT id, tier_name, price, start_date, end_date, display_order
                FROM pricing_tiers
                WHERE ticket_id = ${ticket.id}
                ORDER BY display_order ASC, start_date ASC NULLS LAST
              `

              console.log("[v0] Pricing tiers for ticket", ticket.name, ":", tiers.length)

              // Determine which tier is currently active
              const tiersWithStatus = tiers.map((tier: any) => {
                const startDate = tier.start_date ? new Date(tier.start_date) : null
                const endDate = tier.end_date ? new Date(tier.end_date) : null

                const isAfterStart = !startDate || now >= startDate
                const isBeforeEnd = !endDate || now <= endDate
                const isActive = isAfterStart && isBeforeEnd

                return {
                  id: tier.id,
                  name: tier.tier_name,
                  price: tier.price,
                  startDate: tier.start_date,
                  endDate: tier.end_date,
                  displayOrder: tier.display_order,
                  isActive,
                }
              })

              return {
                ...ticket,
                pricingTiers: tiersWithStatus,
              }
            } catch (error) {
              console.log("[v0] Error fetching pricing tiers for ticket:", ticket.id)
              return ticket
            }
          }),
        )
      } catch (error) {
        console.log("[v0] Tickets lookup failed, using fallback:", error)
      }

      const event = {
        id: eventData.id,
        name: eventData.name,
        description: eventData.description,
        support_email: eventData.support_email || null,
        tax_id: eventData.tax_id || null,
        goal: eventData.goal || 0,
        domain: eventData.domain,
        registration_open: eventData.registration_open || false,
        start_date: eventData.start_date,
        end_date: eventData.end_date,
        location: eventData.location || null,
        timezone: eventData.timezone || null,
        go_live_date: eventData.go_live_date,
        bidding_close_time: eventData.bidding_close_time || null,
        event_time: eventData.event_time || null,
        event_style: eventData.event_style || null,
        enable_qr_code_kiosk: eventData.enable_qr_code_kiosk || false,
        require_credit_card: eventData.require_credit_card || false,
        coming_soon_enabled: eventData.coming_soon_enabled || false,
        coming_soon_description: eventData.coming_soon_description || null,
        coming_soon_banner_url: eventData.coming_soon_banner_url || null,
        show_qr_codes: eventData.show_qr_codes || false,
        allow_likes: eventData.allow_likes || false,
        max_bidding: eventData.max_bidding || false,
        auto_bids: eventData.auto_bids || false,
        hero_image_url: eventData.hero_image_url,
        hero_description: eventData.hero_description,
        logo_image_url: eventData.logo_image_url,
        impact_image_url: eventData.impact_image_url || null,
        is_silent_auction: eventData.is_silent_auction || false,
        enable_auction: eventData.enable_auction || false,
        auto_charge: eventData.auto_charge || false,
        invoice_enabled: eventData.invoice_enabled || false,
        payment_deadline_hours: eventData.payment_deadline_hours || 48,
        pickup_instructions: eventData.pickup_instructions || null,
        donation_response_text: eventData.donation_response_text || null,
        request_attendance: eventData.request_attendance || false,
        enable_registration: eventData.enable_registration !== false, // Default to true for backward compatibility
        enable_donation: eventData.enable_donation !== false, // Default to true for backward compatibility
        enable_shop: eventData.enable_shop || false,
        enable_abandoned_cart_reminders: eventData.enable_abandoned_cart_reminders || false,
        enable_gallery: eventData.enable_gallery || false,
        enable_voting: eventData.enable_voting || false,
        enable_raffles: eventData.enable_raffles || false,
        enable_sponsor: eventData.enable_sponsor || false,
        gallery_title: eventData.gallery_title || null,
        gallery_description: eventData.gallery_description || null,
        shop_title: eventData.shop_title || null,
        shop_description: eventData.shop_description || null,
        additional_sections: eventData.additional_sections || [],
        theme_bg_color: eventData.theme_bg_color || null,
        theme_bg_image: eventData.theme_bg_image || null,
        theme_font_family: eventData.theme_font_family || "Inter",
        theme_font_family_regular: eventData.theme_font_family_regular || eventData.theme_font_family || "Inter",
        theme_font_family_bold: eventData.theme_font_family_bold || eventData.theme_font_family || "Inter",
        theme_text_color: eventData.theme_text_color || null,
        theme_bold_text_color: eventData.theme_bold_text_color || null,
        theme_mode: eventData.theme_mode || "not-set",
        seo_title: eventData.seo_title || null,
        seo_description: eventData.seo_description || null,
        seo_og_title: eventData.seo_og_title || null,
        seo_og_description: eventData.seo_og_description || null,
        seo_og_image: eventData.seo_og_image || null,
        seo_canonical_url: eventData.seo_canonical_url || null,
        seo_no_index: eventData.seo_no_index || false,
        theme: themeData
          ? {
              primary_color: themeData.primary_color,
              secondary_color: themeData.secondary_color,
              logo_url: themeData.logo_url,
            }
          : null,
        tickets: ticketsData, // Include tickets in the response
      }

      console.log("[v0] Final event object tickets count:", event.tickets?.length || 0)
      return NextResponse.json({ event })
    }

    console.log("[v0] Fetching event by ID:", eventId)

    let eventData
    let eventResult
    try {
      eventResult = await sql`
        SELECT *
        FROM events
        WHERE id = ${eventId}
        LIMIT 1
      `

      if (eventResult.length === 0) {
        console.log("[v0] Event not found for ID:", eventId)
        return NextResponse.json({ error: "Event not found" }, { status: 404 })
      }

      eventData = eventResult[0]
    } catch (error) {
      console.log("[v0] Error fetching event:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    console.log("[v0] Event query result length:", eventResult.length)
    console.log("[v0] Event found:", eventData.event_name)
    console.log("[v0] Event pickup_instructions:", eventData.pickup_instructions ? "exists" : "null")
    console.log("[v0] Event donation_response_text:", eventData.donation_response_text ? "exists" : "null")

    // Try to fetch theme separately (will fail gracefully if event_id column doesn't exist)
    let themeData = null
    try {
      const themeResult = await sql`
        SELECT primary_color, secondary_color, logo_url
        FROM themes
        WHERE event_id = ${eventData.id}
        LIMIT 1
      `
      if (themeResult.length > 0) {
        themeData = themeResult[0]
      }
    } catch (error) {
      // Theme table doesn't have event_id column yet, use first theme as fallback
      console.log("[v0] Theme event_id column not found, using fallback")
      try {
        const fallbackTheme = await sql`SELECT * FROM themes LIMIT 1`
        if (fallbackTheme.length > 0) {
          themeData = fallbackTheme[0]
        }
      } catch (e) {
        console.log("[v0] No themes available")
      }
    }

    let ticketsData = []
    try {
      const ticketsResult = await sql`
        SELECT id, name, description, price, quantity_available, quantity_sold, is_active
        FROM event_tickets
        WHERE event_id = ${eventData.id}
        ORDER BY price ASC
      `

      console.log("[v0] Tickets query result count:", ticketsResult.length)
      console.log("[v0] Tickets found for event:", eventData.id, "count:", ticketsResult.length)

      // Fetch pricing tiers for each ticket
      const now = new Date()
      ticketsData = await Promise.all(
        ticketsResult.map(async (ticket: any) => {
          try {
            const tiers = await sql`
              SELECT id, tier_name, price, start_date, end_date, display_order
              FROM pricing_tiers
              WHERE ticket_id = ${ticket.id}
              ORDER BY display_order ASC, start_date ASC NULLS LAST
            `

            console.log("[v0] Pricing tiers for ticket", ticket.name, ":", tiers.length)

            // Determine which tier is currently active
            const tiersWithStatus = tiers.map((tier: any) => {
              const startDate = tier.start_date ? new Date(tier.start_date) : null
              const endDate = tier.end_date ? new Date(tier.end_date) : null

              const isAfterStart = !startDate || now >= startDate
              const isBeforeEnd = !endDate || now <= endDate
              const isActive = isAfterStart && isBeforeEnd

              return {
                id: tier.id,
                name: tier.tier_name,
                price: tier.price,
                startDate: tier.start_date,
                endDate: tier.end_date,
                displayOrder: tier.display_order,
                isActive,
              }
            })

            return {
              ...ticket,
              pricingTiers: tiersWithStatus,
            }
          } catch (error) {
            console.log("[v0] Error fetching pricing tiers for ticket:", ticket.id)
            return ticket
          }
        }),
      )
    } catch (error) {
      console.log("[v0] Tickets lookup failed, using fallback:", error)
    }

    const event = {
      id: eventData.id,
      name: eventData.name,
      description: eventData.description,
      support_email: eventData.support_email || null,
      tax_id: eventData.tax_id || null,
      goal: eventData.goal || 0,
      domain: eventData.domain,
      registration_open: eventData.registration_open || false,
      start_date: eventData.start_date,
      end_date: eventData.end_date,
      location: eventData.location || null,
      timezone: eventData.timezone || null,
      go_live_date: eventData.go_live_date,
      bidding_close_time: eventData.bidding_close_time || null,
      event_time: eventData.event_time || null,
      event_style: eventData.event_style || null,
      enable_qr_code_kiosk: eventData.enable_qr_code_kiosk || false,
      require_credit_card: eventData.require_credit_card || false,
      coming_soon_enabled: eventData.coming_soon_enabled || false,
      coming_soon_description: eventData.coming_soon_description || null,
      coming_soon_banner_url: eventData.coming_soon_banner_url || null,
      show_qr_codes: eventData.show_qr_codes || false,
      allow_likes: eventData.allow_likes || false,
      max_bidding: eventData.max_bidding || false,
      auto_bids: eventData.auto_bids || false,
      hero_image_url: eventData.hero_image_url,
      hero_description: eventData.hero_description,
      logo_image_url: eventData.logo_image_url,
      impact_image_url: eventData.impact_image_url || null,
      is_silent_auction: eventData.is_silent_auction || false,
      enable_auction: eventData.enable_auction || false,
      auto_charge: eventData.auto_charge || false,
      invoice_enabled: eventData.invoice_enabled || false,
      payment_deadline_hours: eventData.payment_deadline_hours || 48,
      pickup_instructions: eventData.pickup_instructions || null,
      donation_response_text: eventData.donation_response_text || null,
      request_attendance: eventData.request_attendance || false,
      enable_registration: eventData.enable_registration !== false, // Default to true for backward compatibility
      enable_donation: eventData.enable_donation !== false, // Default to true for backward compatibility
      enable_shop: eventData.enable_shop || false,
      enable_gallery: eventData.enable_gallery || false,
      enable_voting: eventData.enable_voting || false,
      enable_raffles: eventData.enable_raffles || false,
      enable_sponsor: eventData.enable_sponsor || false,
      gallery_title: eventData.gallery_title || null,
      gallery_description: eventData.gallery_description || null,
      shop_title: eventData.shop_title || null,
      shop_description: eventData.shop_description || null,
      additional_sections: eventData.additional_sections || [],
      theme_bg_color: eventData.theme_bg_color || null,
      theme_bg_image: eventData.theme_bg_image || null,
      theme_font_family: eventData.theme_font_family || "Inter",
      theme_font_family_regular: eventData.theme_font_family_regular || eventData.theme_font_family || "Inter",
      theme_font_family_bold: eventData.theme_font_family_bold || eventData.theme_font_family || "Inter",
      theme_text_color: eventData.theme_text_color || null,
      theme_bold_text_color: eventData.theme_bold_text_color || null,
      theme_mode: eventData.theme_mode || "not-set",
      seo_title: eventData.seo_title || null,
      seo_description: eventData.seo_description || null,
      seo_og_title: eventData.seo_og_title || null,
      seo_og_description: eventData.seo_og_description || null,
      seo_og_image: eventData.seo_og_image || null,
      seo_canonical_url: eventData.seo_canonical_url || null,
      seo_no_index: eventData.seo_no_index || false,
      theme: themeData
        ? {
            primary_color: themeData.primary_color,
            secondary_color: themeData.secondary_color,
            logo_url: themeData.logo_url,
          }
        : null,
      tickets: ticketsData, // Include tickets in the response
    }

    console.log("[v0] Final event object tickets count:", event.tickets?.length || 0)
    return NextResponse.json({ event })
  } catch (error) {
    console.error("[v0] Error fetching event:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch event",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Please log in" }, { status: 401 })
    }

    const { eventId } = await params
    const body = await request.json()

    console.log("[v0] PUT request - eventId:", eventId)
    console.log("[v0] PUT request - body:", JSON.stringify(body, null, 2))

    if (body.start_date === "") body.start_date = null
    if (body.end_date === "") body.end_date = null
    if (body.go_live_date === "") body.go_live_date = null
    if (body.hero_image_url === "") body.hero_image_url = null
    if (body.logo_image_url === "") body.logo_image_url = null
    if (body.hero_description === "") body.hero_description = null
    if (body.domain === "") body.domain = null
    if (body.support_email === "") body.support_email = null
    if (body.pickup_instructions === "") body.pickup_instructions = null
    if (body.donation_response_text === "") body.donation_response_text = null
    if (body.impact_image_url === "") body.impact_image_url = null
    if (body.coming_soon_description === "") body.coming_soon_description = null
    if (body.coming_soon_banner_url === "") body.coming_soon_banner_url = null
    if (body.shop_title === "") body.shop_title = null
    if (body.shop_description === "") body.shop_description = null

    if (body.additional_sections && Array.isArray(body.additional_sections)) {
      body.additional_sections = JSON.stringify(body.additional_sections)
    }

    const allowedFields: Record<string, any> = {}

    const fieldNames = [
      "name",
      "description",
      "support_email",
      "tax_id",
      "goal",
      "domain",
      "registration_open",
      "start_date",
      "end_date",
      "location",
      "timezone",
      "go_live_date",
      "bidding_close_time",
      "event_time",
      "event_style",
      "enable_qr_code_kiosk",
      "require_credit_card",
      "coming_soon_enabled",
      "coming_soon_description",
      "coming_soon_banner_url",
      "show_qr_codes",
      "allow_likes",
      "max_bidding",
      "auto_bids",
      "hero_image_url",
      "hero_description",
      "logo_image_url",
      "impact_image_url",
      "goal",
      "is_silent_auction",
      "enable_auction",
      "auto_charge",
      "invoice_enabled",
      "payment_deadline_hours",
      "pickup_instructions",
      "donation_response_text",
      "request_attendance",
      "enable_registration",
      "enable_donation",
      "enable_shop",
      "enable_gallery",
      "enable_voting",
      "enable_raffles",
      "enable_sponsor",
      "gallery_title",
      "gallery_description",
      "shop_title",
      "shop_description",
      "additional_sections",
      "theme_bg_color",
      "theme_bg_image",
      "theme_font_family",
      "theme_font_family_regular",
      "theme_font_family_bold",
      "theme_text_color",
      "theme_bold_text_color",
      "theme_mode",
      "seo_title",
      "seo_description",
      "seo_og_title",
      "seo_og_description",
      "seo_og_image",
      "seo_canonical_url",
      "seo_no_index",
    ]

    for (const field of fieldNames) {
      if (field in body) {
        allowedFields[field] = body[field]
      }
    }

    console.log("[v0] Allowed fields to update:", JSON.stringify(allowedFields, null, 2))

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const setClauses: string[] = []
    const values: any[] = []
    let paramIndex = 1

    Object.entries(allowedFields).forEach(([key, value]) => {
      setClauses.push(`${key} = $${paramIndex}`)
      values.push(value)
      paramIndex++
    })

    values.push(eventId)

    const query = `
      UPDATE events 
      SET ${setClauses.join(", ")}, updated_at = NOW() 
      WHERE id = $${paramIndex}
      RETURNING *
    `

    console.log("[v0] SQL Query:", query)
    console.log("[v0] Query values:", values)

    const result = await sql.query(query, values)

    console.log("[v0] Update result:", result)
    console.log("[v0] Update result length:", result?.length)

    if (!result || result.length === 0) {
      return NextResponse.json({ error: "Event not found or not updated" }, { status: 404 })
    }

    return NextResponse.json({ event: result[0] })
  } catch (error) {
    console.error("[v0] Error updating event:", error)
    return NextResponse.json(
      {
        error: "Failed to update event",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const session = await getSession()
    console.log("[v0] Session:", session ? "exists" : "null")
    console.log("[v0] Is admin:", session?.is_admin)

    if (!session?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { eventId } = await params

    const result = await sql`
      DELETE FROM events
      WHERE id = ${eventId}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting event:", error)
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 })
  }
}
