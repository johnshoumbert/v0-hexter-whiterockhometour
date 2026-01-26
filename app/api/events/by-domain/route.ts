import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { normalizeDomain } from "@/lib/normalize-domain"

async function safeQuery<T = any>(queryFn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await queryFn()
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    if (errorMessage.includes("Too Many Requests") || errorMessage.includes("429")) {
      console.log("[v0] Rate limit detected, using fallback")
      return fallback
    }
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const host = searchParams.get("host") || request.headers.get("host") || ""

    console.log("[v0] by-domain request detected, fetching for host:", host)

    let domain = normalizeDomain(host)
    console.log("[v0] Normalized domain:", domain)

    const isVusercontentPreview = host.includes(".vusercontent.net")
    const isLocalhost =
      !domain ||
      domain === "" ||
      domain === "localhost" ||
      domain === "127.0.0.1" ||
      domain.includes("vusercontent.net")

    if (isLocalhost) {
      console.log("[v0] Local/dev/empty domain detected - returning localhost event")
      const eventResult = await safeQuery(
        async () =>
          sql`
        SELECT *
        FROM events
        WHERE LOWER(
          REGEXP_REPLACE(
            REGEXP_REPLACE(TRIM(domain), '^https?://', ''),
            '^www\\.',
            ''
          )
        ) = 'localhost' and application_name='hometour'
        LIMIT 1
      `,
        [],
      )
      console.log("[v0] Localhost event query result count:", eventResult.length)

      if (eventResult.length > 0) {
        const eventData = eventResult[0]
        console.log("[v0] Localhost event found:", eventData.event_name, "id:", eventData.id)

        // Try to fetch theme separately
        let themeData = null
        try {
          const themeResult = await safeQuery(
            async () =>
              sql`
            SELECT primary_color, secondary_color, logo_url
            FROM themes
            WHERE event_id = ${eventData.id}
            LIMIT 1
          `,
            [],
          )
          if (themeResult.length > 0) {
            themeData = themeResult[0]
          }
        } catch (error) {
          console.log("[v0] Theme lookup failed, using fallback")
        }

        let ticketsData = []
        try {
          const ticketsResult = await safeQuery(
            async () =>
              sql`
            SELECT id, name, description, price, quantity_available, quantity_sold, is_active
            FROM event_tickets
            WHERE event_id = ${eventData.id}
            ORDER BY price ASC
          `,
            [],
          )

          console.log("[v0] Tickets query result count:", ticketsResult.length)
          console.log("[v0] Tickets found for event:", eventData.id, "count:", ticketsResult.length)

          // Fetch pricing tiers for each ticket
          const now = new Date()
          ticketsData = await Promise.all(
            ticketsResult.map(async (ticket: any) => {
              try {
                const tiers = await safeQuery(
                  async () =>
                    sql`
                    SELECT id, tier_name, price, start_date, end_date, display_order
                    FROM pricing_tiers
                    WHERE ticket_id = ${ticket.id}
                    ORDER BY display_order ASC, start_date ASC NULLS LAST
                  `,
                  [],
                )

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
          console.log("[v0] Tickets lookup failed, using fallback")
        }

        const event = {
          ...eventData,
          theme: themeData
            ? {
                primary_color: themeData.primary_color,
                secondary_color: themeData.secondary_color,
                logo_url: themeData.logo_url,
              }
            : null,
          tickets: ticketsData, // Include tickets in event response
        }

        console.log("[v0] Shop title from database:", eventData.shop_title)
        console.log("[v0] Shop description from database:", eventData.shop_description)
        console.log("[v0] Shop title in event object:", event.shop_title)
        console.log("[v0] Shop description in event object:", event.shop_description)

        console.log("[v0] Final event object tickets count:", event.tickets?.length || 0)
        console.log("[v0] Event found and returning:", event.event_name)
        return NextResponse.json({ event })
      } else {
        console.log("[v0] No localhost event found in database")
        return NextResponse.json({ error: "No localhost event configured" }, { status: 404 })
      }
    }

    // Check if this is the main platform domain (no event)
    if (domain === "myschoolauction.com") {
      console.log("[v0] Main domain detected - no event")
      return NextResponse.json({ error: "Main domain - no event" }, { status: 404 })
    }

    // If it's a preview domain, try to use the domain query param if available
    if (isVusercontentPreview && searchParams.get("domain")) {
      domain = searchParams.get("domain") || domain
      console.log("[v0] Preview domain detected, using query param domain:", domain)
    }

    let eventResult = []

    // Prepare subdomain for ourneighborhoodtour.com domains
    let subdomain = ""
    if (domain.includes(".ourneighborhoodtour.com")) {
      subdomain = domain.split(".ourneighborhoodtour.com")[0]
    }

    // Use a single optimized query with OR conditions instead of multiple sequential queries
    console.log("[v0] Trying unified domain match for:", domain)
    eventResult = await safeQuery(
      async () => {
        // For ourneighborhoodtour.com subdomains
        if (subdomain) {
          return sql`
            SELECT *
            FROM events
            WHERE application_name = 'hometour'
            AND (
              LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(domain), '^https?://', ''), '^www\\.', '')) = ${domain}
              OR LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(domain), '^https?://', ''), '^www\\.', '')) = ${subdomain}
              OR LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(domain), '^https?://', ''), '^www\\.', '')) LIKE ${subdomain + "%"}
            )
            LIMIT 1
          `
        }
        
        // For custom domains or preview fallback
        const domainParts = domain.split(".")
        const baseDomain = domainParts.length >= 2 ? domainParts.slice(-2).join(".") : domain

        return sql`
          SELECT *
          FROM events
          WHERE application_name = 'hometour'
          AND (
            LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(domain), '^https?://', ''), '^www\\.', '')) = ${domain}
            ${
              isVusercontentPreview
                ? sql`OR LOWER(domain) != 'localhost'`
                : sql`OR LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(domain), '^https?://', ''), '^www\\.', '')) LIKE ${"%" + baseDomain + "%"}`
            }
          )
          ORDER BY 
            CASE WHEN LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(domain), '^https?://', ''), '^www\\.', '')) = ${domain} THEN 0 ELSE 1 END,
            created_at DESC
          LIMIT 1
        `
      },
      [],
    )
    console.log("[v0] Unified query result count:", eventResult.length)

    if (eventResult.length === 0) {
      console.log("[v0] No event found for domain:", domain)
      console.log("[v0] Tried strategies: exact match, subdomain match, custom domain match, preview fallback")
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    const eventData = eventResult[0]
    console.log("[v0] Event found:", eventData.event_name, "with domain:", eventData.domain)

    // Try to fetch theme separately
    let themeData = null
    try {
      const themeResult = await safeQuery(
        async () =>
          sql`
        SELECT primary_color, secondary_color, logo_url
        FROM themes
        WHERE event_id = ${eventData.id}
        LIMIT 1
      `,
        [],
      )
      if (themeResult.length > 0) {
        themeData = themeResult[0]
      }
    } catch (error) {
      console.log("[v0] Theme lookup failed, using fallback")
      try {
        const fallbackTheme = await safeQuery(async () => sql`SELECT * FROM themes LIMIT 1`, [])
        if (fallbackTheme.length > 0) {
          themeData = fallbackTheme[0]
        }
      } catch (e) {
        console.log("[v0] No themes available")
      }
    }

    let ticketsData = []
    try {
      const ticketsResult = await safeQuery(
        async () =>
          sql`
        SELECT id, name, description, price, quantity_available, quantity_sold, is_active
        FROM event_tickets
        WHERE event_id = ${eventData.id}
        ORDER BY price ASC
      `,
        [],
      )

      console.log("[v0] Tickets query result count:", ticketsResult.length)
      console.log("[v0] Tickets found for event:", eventData.id, "count:", ticketsResult.length)

      // Fetch pricing tiers for each ticket
      const now = new Date()
      ticketsData = await Promise.all(
        ticketsResult.map(async (ticket: any) => {
          try {
            const tiers = await safeQuery(
              async () =>
                sql`
                SELECT id, tier_name, price, start_date, end_date, display_order
                FROM pricing_tiers
                WHERE ticket_id = ${ticket.id}
                ORDER BY display_order ASC, start_date ASC NULLS LAST
              `,
              [],
            )

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
      console.log("[v0] Tickets lookup failed, using fallback")
    }

    const event = {
      ...eventData,
      theme: themeData
        ? {
            primary_color: themeData.primary_color,
            secondary_color: themeData.secondary_color,
            logo_url: themeData.logo_url,
          }
        : null,
      tickets: ticketsData, // Include tickets in event response
    }

    console.log("[v0] Shop title from database:", eventData.shop_title)
    console.log("[v0] Shop description from database:", eventData.shop_description)
    console.log("[v0] Shop title in event object:", event.shop_title)
    console.log("[v0] Shop description in event object:", event.shop_description)

    console.log("[v0] Final event object tickets count:", event.tickets?.length || 0)
    console.log("[v0] Event found and returning:", event.event_name)
    return NextResponse.json({ event })
  } catch (error) {
    console.error("[v0] Error fetching event by domain:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: "Failed to fetch event", details: errorMessage }, { status: 500 })
  }
}
