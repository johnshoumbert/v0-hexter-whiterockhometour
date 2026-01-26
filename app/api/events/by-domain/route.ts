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
      isVusercontentPreview

    if (isLocalhost) {
      console.log("[v0] Local/dev/preview domain detected - returning White Rock event")
      // Use specific event ID for localhost
      const localhostEventId = 'd42fcc36-3f53-4a65-982c-373776747c44'
      const eventResult = await safeQuery(
        async () =>
          sql`
        SELECT *
        FROM events
        WHERE id = ${localhostEventId}
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



    const isVercelApp = host.includes(".vercel.app")

    // If it's a preview/Vercel domain with a domain query param, use that
    if ((isVusercontentPreview || isVercelApp) && searchParams.get("domain")) {
      domain = searchParams.get("domain") || domain
      console.log("[v0] Preview/Vercel domain detected, using query param domain:", domain)
    }
    
    // For Vercel app domains, use the full vercel.app URL as the domain to match
    if (isVercelApp && !searchParams.get("domain")) {
      console.log("[v0] Using Vercel app domain for lookup:", domain)
      // domain is already set to the normalized vercel.app subdomain
    }

    let eventResult = []

    const allEvents = await safeQuery(async () => sql`SELECT id, event_name, domain FROM events`, [])
    console.log("[v0] All events in database:", JSON.stringify(allEvents, null, 2))

    // Explicit domain mapping for whiterock.ourneighborhoodtour.com and whiterock-2025.ourneighborhoodtour.com
    const isWhiteRockDomain = domain === 'whiterock.ourneighborhoodtour.com' || domain === 'whiterock-2025.ourneighborhoodtour.com'
    if (isWhiteRockDomain) {
      console.log(`[v0] Explicit domain mapping: ${domain} -> d42fcc36-3f53-4a65-982c-373776747c44`)
      const whiteRockEventId = 'd42fcc36-3f53-4a65-982c-373776747c44'
      eventResult = await safeQuery(
        async () => sql`SELECT * FROM events WHERE id = ${whiteRockEventId} LIMIT 1`,
        []
      )
      console.log("[v0] Explicit mapping result count:", eventResult.length)
    }

    // If we found the event via explicit mapping, process it and return
    if (eventResult.length > 0 && isWhiteRockDomain) {
      const eventData = eventResult[0]
      console.log("[v0] Processing explicitly mapped event:", eventData.event_name)

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
        console.log("[v0] Theme lookup failed for explicit mapping, using fallback")
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

        console.log("[v0] Tickets query result count for explicit mapping:", ticketsResult.length)

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
        console.log("[v0] Tickets lookup failed for explicit mapping")
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
        tickets: ticketsData,
      }

      console.log("[v0] Returning explicitly mapped event:", event.event_name)
      return NextResponse.json({ event })
    }

    // Determine application based on domain
    const isOurNeighborhoodTour = domain.includes('ourneighborhoodtour.com')
    const applicationName = isOurNeighborhoodTour ? 'hometour' : 'myschoolauction'
    console.log("[v0] Domain-based application filter:", applicationName)

    if (eventResult.length === 0) {
      console.log("[v0] Strategy 1: Trying exact match for:", domain)
      eventResult = await safeQuery(
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
        ) = ${domain}
        AND application_name = ${applicationName}
        LIMIT 1
      `,
        [],
      )
      console.log("[v0] Strategy 1 result count:", eventResult.length)
    }

    // Strategy 2: If it's a Vercel app domain, try matching against the full vercel.app URL
    if (eventResult.length === 0 && domain.includes(".vercel.app")) {
      console.log("[v0] Strategy 2: Trying Vercel app domain match for:", domain)
      
      eventResult = await safeQuery(
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
        ) = ${domain}
        AND application_name = ${applicationName}
        LIMIT 1
      `,
        [],
      )
      console.log("[v0] Strategy 2 result count:", eventResult.length)
    }

    // Strategy 3: If it's a myschoolauction.com subdomain, try matching just the subdomain part
    if (eventResult.length === 0 && domain.includes(".myschoolauction.com")) {
      const subdomain = domain.split(".myschoolauction.com")[0]
      console.log("[v0] Strategy 3: Trying subdomain match for:", subdomain)

      // Try matching against domains that are just the subdomain
      eventResult = await safeQuery(
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
        ) = ${subdomain}
        AND application_name = ${applicationName}
        LIMIT 1
      `,
        [],
      )
      console.log("[v0] Strategy 3a result count:", eventResult.length)

      // Also try matching against full subdomain URLs
      if (eventResult.length === 0) {
        console.log("[v0] Strategy 3b: Trying full subdomain URL match")
        eventResult = await safeQuery(
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
          ) LIKE ${subdomain + "%"}
          AND application_name = ${applicationName}
          LIMIT 1
        `,
          [],
        )
        console.log("[v0] Strategy 3b result count:", eventResult.length)
      }
    }

    // Strategy 4: For custom domains, try partial match
    if (eventResult.length === 0 && !domain.includes("myschoolauction.com") && !domain.includes(".vercel.app")) {
      console.log("[v0] Strategy 4: Trying custom domain partial match")
      const domainParts = domain.split(".")
      const baseDomain = domainParts.slice(-2).join(".")

      eventResult = await safeQuery(
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
        ) LIKE ${"%" + baseDomain + "%"}
        AND application_name = ${applicationName}
        LIMIT 1
      `,
        [],
      )
      console.log("[v0] Strategy 4 result count:", eventResult.length)
    }

    if (eventResult.length === 0 && isVusercontentPreview) {
      console.log("[v0] Strategy 5: Preview domain fallback - finding most recent non-localhost event")
      eventResult = await safeQuery(
        async () =>
          sql`
        SELECT *
        FROM events
        WHERE LOWER(domain) != 'localhost'
        AND application_name = ${applicationName}
        ORDER BY created_at DESC
        LIMIT 1
      `,
        [],
      )
      console.log("[v0] Strategy 5 result count:", eventResult.length)
    }

    if (eventResult.length === 0) {
      console.log("[v0] No event found for domain:", domain)
      console.log("[v0] Tried strategies: exact match, vercel domain match, subdomain match, custom domain match, preview fallback")
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
