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

    // Production domain mappings (hardcoded until DB is updated)
    const productionDomainMap: Record<string, string> = {
      "whiterock-2025.ourneighborhoodtour.com": "d42fcc36-3f53-4a65-982c-373776747c44",
    }

    /**
     * 🔥 EXACT MATCH ONLY 🔥
     * We store full domains in the DB
     * e.g. whiterock-2025.ourneighborhoodtour.com
     */
    let eventResult: any[] = []
    
    // Check if this is a known production domain
    const mappedEventId = productionDomainMap[domain]
    if (mappedEventId) {
      console.log("[by-domain] Production domain matched, using mapped event ID:", mappedEventId)
      eventResult = await safeQuery(
        async () => sql`
          SELECT *
          FROM events
          WHERE id = ${mappedEventId}
          LIMIT 1
        `,
        []
      )
    } else {
      // Standard domain lookup
      eventResult = await safeQuery(
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
    }

    console.log("[by-domain] Event query count:", eventResult.length)

    if (!eventResult.length) {
      console.warn("[by-domain] No event found for:", domain)
      
      // For preview/development environments, fetch the localhost demo event
      if (domain.includes('vusercontent.net') || domain.includes('vercel.app')) {
        console.log("[by-domain] Preview/dev environment detected, fetching localhost demo event")
        
        try {
          const demoResult = await safeQuery(
            async () => sql`
              SELECT *
              FROM events
              WHERE id = '63c3a678-2a30-4777-93b4-4522095fe0aa'
              LIMIT 1
            `,
            []
          )
          
          if (demoResult.length) {
            const eventData = demoResult[0]
            
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
              console.warn("[by-domain] Theme lookup failed for demo event")
            }
            
            // Fetch tickets
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
              console.warn("[by-domain] Ticket lookup failed for demo event")
            }
            
            console.log("[by-domain] Returning localhost demo event:", eventData.event_name)
            return NextResponse.json({
              event: {
                ...eventData,
                theme,
                tickets,
              },
            })
          }
        } catch (error) {
          console.error("[by-domain] Failed to fetch demo event:", error)
        }
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
