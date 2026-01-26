import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { normalizeDomain } from "@/lib/normalize-domain"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Safe DB wrapper with timeout
 */
async function safeQuery<T>(
  queryFn: () => Promise<T>,
  label: string,
  timeoutMs: number = 10000
): Promise<T> {
  console.log(`[v0][by-domain] Starting query: ${label}`)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const result = await Promise.race([
      queryFn(),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error(`Query timeout after ${timeoutMs}ms`))
        })
      })
    ])
    console.log(`[v0][by-domain] Query completed: ${label}`)
    return result
  } catch (error: any) {
    const message = error?.message || String(error)
    console.error(`[v0][by-domain][DB ERROR][${label}]`, message)

    if (message.includes("429") || message.includes("Too Many Requests")) {
      throw new Error("RATE_LIMIT")
    }

    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Guard helper — fail fast on invalid state
 */
function invariant(condition: any, message: string): asserts condition {
  if (!condition) {
    console.error(`[v0][by-domain] Invariant failed: ${message}`)
    throw new Error(message)
  }
}

export async function GET(request: NextRequest) {
  console.log("[v0][by-domain] === Request started ===")
  
  try {
    /* ---------------------------------------------
     * Check database configuration first
     * --------------------------------------------- */
    console.log("[v0][by-domain] Step 1: Checking database configuration")
    const dbUrl = process.env.NEON_DATABASE_URL ||
      process.env.NEON_POSTGRES_URL ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL

    if (!dbUrl) {
      console.error("[v0][by-domain] No database URL configured")
      return NextResponse.json(
        { error: "Database not configured", details: "Missing database connection string" },
        { status: 503 }
      )
    }
    console.log("[v0][by-domain] Database URL configured: Yes")

    /* ---------------------------------------------
     * Resolve host + domain
     * --------------------------------------------- */
    console.log("[v0][by-domain] Step 2: Resolving host and domain")
    let rawHost: string | null = null
    
    try {
      const url = new URL(request.url)
      const searchParams = url.searchParams
      rawHost = searchParams.get("host") || request.headers.get("host")
      console.log("[v0][by-domain] Raw host resolved:", rawHost)
    } catch (urlError) {
      console.error("[v0][by-domain] URL parsing error:", urlError)
      return NextResponse.json(
        { error: "Invalid request URL", details: String(urlError) },
        { status: 400 }
      )
    }

    if (!rawHost) {
      console.error("[v0][by-domain] Missing Host header")
      return NextResponse.json(
        { error: "Missing Host header" },
        { status: 400 }
      )
    }

    let domain: string
    try {
      domain = normalizeDomain(rawHost)
      console.log("[v0][by-domain] Normalized domain:", domain)
    } catch (normalizeError) {
      console.error("[v0][by-domain] Domain normalization error:", normalizeError)
      return NextResponse.json(
        { error: "Invalid domain", details: String(normalizeError) },
        { status: 400 }
      )
    }

    if (!domain) {
      console.error("[v0][by-domain] Normalized domain is empty")
      return NextResponse.json(
        { error: "Normalized domain is empty" },
        { status: 400 }
      )
    }

    const isPreview = domain.includes("vusercontent.net")
    const isLocalhost = domain === "localhost" || domain === "127.0.0.1"
    console.log("[v0][by-domain] isPreview:", isPreview, "isLocalhost:", isLocalhost)

    /* ---------------------------------------------
     * Localhost handling
     * --------------------------------------------- */
    if (isLocalhost) {
      console.log("[v0][by-domain] Step 3: Localhost event lookup")
      try {
        const rows = await safeQuery(
          () =>
            sql`
              SELECT *
              FROM events
              WHERE domain = 'localhost'
                AND application_name = 'hometour'
              LIMIT 1
            `,
          "localhost-event"
        )

        if (!rows.length) {
          console.log("[v0][by-domain] No localhost event found")
          return NextResponse.json(
            { error: "No localhost event configured" },
            { status: 404 }
          )
        }

        console.log("[v0][by-domain] Localhost event found")
        return NextResponse.json({ event: rows[0] })
      } catch (localhostError) {
        console.error("[v0][by-domain] Localhost query error:", localhostError)
        throw localhostError
      }
    }

    /* ---------------------------------------------
     * Main platform domain — no event
     * --------------------------------------------- */
    if (domain === "hometour.com") {
      console.log("[v0][by-domain] Main platform domain - returning 404")
      return NextResponse.json(
        { error: "Main platform domain — no event" },
        { status: 404 }
      )
    }

    /* ---------------------------------------------
     * Domain override for preview links
     * --------------------------------------------- */
    if (isPreview) {
      console.log("[v0][by-domain] Preview domain detected")
      try {
        const url = new URL(request.url)
        const overrideDomain = url.searchParams.get("domain")
        if (overrideDomain) {
          const override = normalizeDomain(overrideDomain)
          console.log("[v0][by-domain] Preview override domain:", override)
        }
      } catch (previewError) {
        console.warn("[v0][by-domain] Preview domain parsing error:", previewError)
      }
    }

    /* ---------------------------------------------
     * EVENT LOOKUP — exact match ONLY
     * --------------------------------------------- */
    console.log("[v0][by-domain] Step 4: Event lookup for domain:", domain)
    let eventRows: any[]
    try {
      eventRows = await safeQuery(
        () =>
          sql`
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
        "event-lookup"
      )
    } catch (eventLookupError) {
      console.error("[v0][by-domain] Event lookup query error:", eventLookupError)
      throw eventLookupError
    }

    if (!eventRows.length) {
      console.warn("[v0][by-domain] Event not found for domain:", domain)
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      )
    }

    const eventData = eventRows[0]

    if (!eventData?.id) {
      console.error("[v0][by-domain] Event missing ID")
      return NextResponse.json(
        { error: "Event data invalid" },
        { status: 500 }
      )
    }

    console.log("[v0][by-domain] Event found:", eventData.event_name, "ID:", eventData.id)

    /* ---------------------------------------------
     * Theme lookup (optional)
     * --------------------------------------------- */
    console.log("[v0][by-domain] Step 5: Theme lookup")
    let theme = null

    try {
      const themeRows = await safeQuery(
        () =>
          sql`
            SELECT primary_color, secondary_color, logo_url
            FROM themes
            WHERE event_id = ${eventData.id}
            LIMIT 1
          `,
        "theme-lookup"
      )

      if (themeRows.length) {
        theme = themeRows[0]
        console.log("[v0][by-domain] Theme found")
      } else {
        console.log("[v0][by-domain] No theme found")
      }
    } catch (themeError) {
      console.warn("[v0][by-domain] Theme lookup failed:", themeError)
    }

    /* ---------------------------------------------
     * Ticket + pricing tiers
     * --------------------------------------------- */
    console.log("[v0][by-domain] Step 6: Ticket lookup")
    let tickets: any[] = []

    try {
      const ticketRows = await safeQuery(
        () =>
          sql`
            SELECT id, name, description, price,
                   quantity_available, quantity_sold, is_active
            FROM event_tickets
            WHERE event_id = ${eventData.id}
            ORDER BY price ASC
          `,
        "tickets-lookup"
      )
      console.log("[v0][by-domain] Found", ticketRows.length, "tickets")

      const now = new Date()

      tickets = await Promise.all(
        ticketRows.map(async (ticket: any) => {
          if (!ticket?.id) {
            console.warn("[v0][by-domain] Ticket missing ID, skipping")
            return { ...ticket, pricingTiers: [] }
          }

          try {
            const tiers = await safeQuery(
              () =>
                sql`
                  SELECT id, tier_name, price,
                         start_date, end_date, display_order
                  FROM pricing_tiers
                  WHERE ticket_id = ${ticket.id}
                  ORDER BY display_order ASC
                `,
              `pricing-tiers-${ticket.id}`
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
                isActive: (!start || now >= start) && (!end || now <= end),
              }
            })

            return { ...ticket, pricingTiers }
          } catch (tierError) {
            console.error("[v0][by-domain] Pricing tier failure for ticket:", ticket.id, tierError)
            return { ...ticket, pricingTiers: [] }
          }
        })
      )
    } catch (ticketError) {
      console.error("[v0][by-domain] Ticket lookup failed:", ticketError)
    }

    /* ---------------------------------------------
     * Final response
     * --------------------------------------------- */
    console.log("[v0][by-domain] === Request completed successfully ===")
    return NextResponse.json({
      event: {
        ...eventData,
        theme,
        tickets,
      },
    })
  } catch (error: any) {
    console.error("[v0][by-domain] === Fatal handler error ===")
    console.error("[v0][by-domain] Error name:", error?.name)
    console.error("[v0][by-domain] Error message:", error?.message)
    console.error("[v0][by-domain] Error stack:", error?.stack)

    if (error.message === "RATE_LIMIT") {
      return NextResponse.json(
        { error: "Rate limited — please retry" },
        { status: 429 }
      )
    }

    return NextResponse.json(
      {
        error: "Failed to fetch event",
        details: error?.message || String(error),
      },
      { status: 500 }
    )
  }
}
