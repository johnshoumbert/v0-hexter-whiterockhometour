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
    return result
  } catch (error: any) {
    const message = error?.message || String(error)
    console.error(`[v0][DB ERROR][${label}]`, message)

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
    throw new Error(message)
  }
}

export async function GET(request: NextRequest) {
  console.log("[v0][by-domain] Request started")
  
  try {
    /* ---------------------------------------------
     * Check database configuration first
     * --------------------------------------------- */
    const dbUrl = process.env.NEON_DATABASE_URL ||
      process.env.NEON_POSTGRES_URL ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL

    if (!dbUrl) {
      console.error("[v0] No database URL configured")
      return NextResponse.json(
        { error: "Database not configured", details: "Missing database connection string" },
        { status: 503 }
      )
    }

    /* ---------------------------------------------
     * Resolve host + domain
     * --------------------------------------------- */
    const { searchParams } = new URL(request.url)

    const rawHost =
      searchParams.get("host") ||
      request.headers.get("host")

    invariant(rawHost, "Missing Host header")

    const domain = normalizeDomain(rawHost)

    invariant(domain, "Normalized domain is empty")

    console.log("[v0] Incoming domain:", domain)
    console.log("[v0] Database URL configured:", dbUrl ? "Yes" : "No")

    const isPreview = domain.includes("vusercontent.net")
    const isLocalhost =
      domain === "localhost" ||
      domain === "127.0.0.1"

    /* ---------------------------------------------
     * Localhost handling
     * --------------------------------------------- */
    if (isLocalhost) {
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
        return NextResponse.json(
          { error: "No localhost event configured" },
          { status: 404 }
        )
      }

      return NextResponse.json({ event: rows[0] })
    }

    /* ---------------------------------------------
     * Main platform domain — no event
     * --------------------------------------------- */
    if (domain === "hometour.com") {
      return NextResponse.json(
        { error: "Main platform domain — no event" },
        { status: 404 }
      )
    }

    /* ---------------------------------------------
     * Domain override for preview links
     * --------------------------------------------- */
    if (isPreview && searchParams.get("domain")) {
      const override = normalizeDomain(searchParams.get("domain")!)
      invariant(override, "Preview domain override invalid")
      console.log("[v0] Preview override domain:", override)
    }

    /* ---------------------------------------------
     * EVENT LOOKUP — exact match ONLY
     * --------------------------------------------- */
    const eventRows = await safeQuery(
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

    if (!eventRows.length) {
      console.warn("[v0] Event not found for domain:", domain)
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      )
    }

    const eventData = eventRows[0]

    invariant(eventData?.id, "Event missing ID")

    console.log("[v0] Event found:", eventData.event_name)

    /* ---------------------------------------------
     * Theme lookup (optional)
     * --------------------------------------------- */
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
      }
    } catch (error) {
      console.warn("[v0] Theme lookup failed:", error)
    }

    /* ---------------------------------------------
     * Ticket + pricing tiers
     * --------------------------------------------- */
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

      const now = new Date()

      tickets = await Promise.all(
        ticketRows.map(async (ticket: any) => {
          invariant(ticket?.id, "Ticket missing ID")

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
              const start = tier.start_date
                ? new Date(tier.start_date)
                : null
              const end = tier.end_date
                ? new Date(tier.end_date)
                : null

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

            return { ...ticket, pricingTiers }
          } catch (tierError) {
            console.error(
              "[v0] Pricing tier failure for ticket:",
              ticket.id,
              tierError
            )
            return { ...ticket, pricingTiers: [] }
          }
        })
      )
    } catch (ticketError) {
      console.error("[v0] Ticket lookup failed:", ticketError)
    }

    /* ---------------------------------------------
     * Final response
     * --------------------------------------------- */
    return NextResponse.json({
      event: {
        ...eventData,
        theme,
        tickets,
      },
    })
  } catch (error: any) {
    console.error("[v0] Fatal handler error:", error)

    if (error.message === "RATE_LIMIT") {
      return NextResponse.json(
        { error: "Rate limited — please retry" },
        { status: 429 }
      )
    }

    return NextResponse.json(
      {
        error: "Failed to fetch event",
        details: error.message,
      },
      { status: 500 }
    )
  }
}
