import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

/**
 * Normalize domain safely WITHOUT removing subdomains
 */
function normalizeDomain(input: string): string {
  return input
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(":")[0] // remove port
    .trim()
}

/**
 * Wrap DB calls to safely fall back on rate limits
 */
async function safeQuery<T = any>(
  queryFn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await queryFn()
  } catch (error: any) {
    const msg = error?.message || String(error)
    if (msg.includes("Too Many Requests") || msg.includes("429")) {
      console.warn("[by-domain] Rate limit hit, returning fallback")
      return fallback
    }
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const rawHost =
      searchParams.get("host") ||
      request.headers.get("host") ||
      ""

    console.log("[by-domain] Raw host:", rawHost)

    const domain = normalizeDomain(rawHost)

    console.log("[by-domain] Normalized domain:", domain)

    // Local/dev handling
    if (
      !domain ||
      domain === "localhost" ||
      domain === "127.0.0.1"
    ) {
      console.log("[by-domain] Localhost detected")

      const localResult = await safeQuery(
        async () => sql`
          SELECT *
          FROM events
          WHERE LOWER(domain) = 'localhost'
          LIMIT 1
        `,
        []
      )

      if (!localResult.length) {
        return NextResponse.json(
          { error: "No localhost event configured" },
          { status: 404 }
        )
      }

      return NextResponse.json({ event: localResult[0] })
    }

    // Main platform domain (no event)
    if (domain === "ourneighborhoodtour.com") {
      console.log("[by-domain] Platform root domain hit")
      return NextResponse.json(
        { error: "Platform domain — no event" },
        { status: 404 }
      )
    }

    /**
     * 🔥 EXACT MATCH ONLY 🔥
     * We store full domains in the DB
     * e.g. whiterock-2025.ourneighborhoodtour.com
     */
    const eventResult = await safeQuery(
      async () => sql`
        SELECT *
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
      `,
      []
    )

    console.log("[by-domain] Event query count:", eventResult.length)

    if (!eventResult.length) {
      console.warn("[by-domain] No event found for:", domain)
      
      // For preview/development environments, return a demo event
      if (domain.includes('vusercontent.net') || domain.includes('localhost') || domain.includes('vercel.app')) {
        console.log("[by-domain] Preview/dev environment detected, returning demo event")
        const demoEvent = {
          id: 'demo-event-id',
          event_name: 'White Rock Home Tour 2025',
          start_date: new Date('2025-05-10T09:00:00Z').toISOString(),
          end_date: new Date('2025-05-10T17:00:00Z').toISOString(),
          go_live_date: new Date('2025-01-01T00:00:00Z').toISOString(),
          domain: domain,
          show_qr_codes: true,
          allow_likes: true,
          max_bidding: false,
          auto_bids: false,
          hero_image_url: '/placeholder.jpg',
          enable_gallery: true,
          enable_voting: false,
          enable_donation: true,
          enable_sponsor: true,
          shop_title: 'Event Merchandise',
          shop_description: 'Browse our collection of event merchandise and souvenirs',
          application_name: 'hometour',
          theme: {
            primary_color: '#2563eb',
            secondary_color: '#1e40af',
            logo_url: '/placeholder-logo.png'
          },
          tickets: []
        }
        
        return NextResponse.json({ event: demoEvent })
      }
      
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      )
    }

    const eventData = eventResult[0]

    console.log(
      "[by-domain] Event matched:",
      eventData.event_name,
      "→",
      eventData.domain
    )

    // Fetch theme
    let theme = null
    try {
      const themeResult = await safeQuery(
        async () => sql`
          SELECT primary_color, secondary_color, logo_url
          FROM themes
          WHERE event_id = ${eventData.id}
          LIMIT 1
        `,
        []
      )

      if (themeResult.length) {
        theme = themeResult[0]
      }
    } catch {
      console.warn("[by-domain] Theme lookup failed")
    }

    // Fetch tickets + pricing tiers
    let tickets: any[] = []

    try {
      const ticketRows = await safeQuery(
        async () => sql`
          SELECT id, name, description, price, quantity_available,
                 quantity_sold, is_active
          FROM event_tickets
          WHERE event_id = ${eventData.id}
          ORDER BY price ASC
        `,
        []
      )

      const now = new Date()

      tickets = await Promise.all(
        ticketRows.map(async (ticket: any) => {
          const tiers = await safeQuery(
            async () => sql`
              SELECT id, tier_name, price, start_date, end_date, display_order
              FROM pricing_tiers
              WHERE ticket_id = ${ticket.id}
              ORDER BY display_order ASC, start_date ASC NULLS LAST
            `,
            []
          )

          const pricingTiers = tiers.map((tier: any) => {
            const start = tier.start_date ? new Date(tier.start_date) : null
            const end = tier.end_date ? new Date(tier.end_date) : null

            return {
              id: tier.id,
              name: tier.tier_name,
              price: tier.price,
              startDate: tier.start_date,
              endDate: tier.end_date,
              displayOrder: tier.display_order,
              isActive:
                (!start || now >= start) &&
                (!end || now <= end),
            }
          })

          return {
            ...ticket,
            pricingTiers,
          }
        })
      )
    } catch {
      console.warn("[by-domain] Ticket lookup failed")
    }

    return NextResponse.json({
      event: {
        ...eventData,
        theme,
        tickets,
      },
    })
  } catch (error) {
    console.error("[by-domain] Fatal error:", error)
    return NextResponse.json(
      { error: "Failed to fetch event" },
      { status: 500 }
    )
  }
}
