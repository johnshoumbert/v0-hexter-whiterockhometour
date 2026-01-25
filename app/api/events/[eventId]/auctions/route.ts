import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params

  console.log("[v0] GET /api/events/[eventId]/auctions - eventId:", eventId)

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "all"
    const featured = searchParams.get("featured")
    const limit = searchParams.get("limit")
    const offset = searchParams.get("offset")
    const page = searchParams.get("page")
    const pageSize = searchParams.get("pageSize")
    const includeWinners = searchParams.get("include_winners") === "true"

    console.log("[v0] Query params:", { status, featured, limit, offset, page, pageSize, includeWinners })

    let countQuery = `
      SELECT COUNT(*) as total
      FROM auctions
      WHERE event_id = $1
    `

    const countParams: any[] = [eventId]
    let countParamIndex = 2

    if (status && status !== "all") {
      countQuery += ` AND status = $${countParamIndex}`
      countParams.push(status)
      countParamIndex++
    }

    if (featured === "true") {
      countQuery += ` AND featured = true`
    } else if (featured === "false") {
      countQuery += ` AND featured = false`
    }

    console.log("[v0] Count query:", countQuery)
    console.log("[v0] Count params:", countParams)

    const countResult = await sql.query(countQuery, countParams)
    const totalCount = Number.parseInt(countResult[0]?.total || "0")

    console.log("[v0] Total count:", totalCount)

    let query = `
      SELECT 
        a.id, a.title, a.description, a.min_bid,
        COALESCE(MAX(b.amount), a.min_bid) as current_bid,
        a.image_url, 
        a.start_time,
        a.end_time,
        a.category, a.status,
        a.slug, a.featured, a.event_id, a.donor, a.bid_increment,
        a.created_at,
        COUNT(DISTINCT b.id) as bid_count,
        (
          SELECT u.name 
          FROM bids b2 
          JOIN users u ON b2.user_id = u.id
          WHERE b2.auction_id = a.id 
          ORDER BY b2.amount DESC 
          LIMIT 1
        ) as top_bidder_name,
        (
          SELECT u.profile_image 
          FROM bids b2 
          JOIN users u ON b2.user_id = u.id
          WHERE b2.auction_id = a.id 
          ORDER BY b2.amount DESC 
          LIMIT 1
        ) as top_bidder_avatar
        ${includeWinners ? `, w.id as winner_id, w.user_id as winner_user_id, w.payment_status, w.final_bid as winner_final_bid, u.name as winner_name, CASE WHEN w.id IS NOT NULL THEN true ELSE false END as has_winner` : ""}
      FROM auctions a
      LEFT JOIN bids b ON a.id = b.auction_id
      ${includeWinners ? `LEFT JOIN winners w ON w.auction_id = a.id LEFT JOIN users u ON u.id = w.user_id` : ""}
      WHERE a.event_id = $1
    `

    const queryParams: any[] = [eventId]
    let paramIndex = 2

    if (status && status !== "all") {
      query += ` AND a.status = $${paramIndex}`
      queryParams.push(status)
      paramIndex++
    }

    if (featured === "true") {
      query += ` AND a.featured = true`
    } else if (featured === "false") {
      query += ` AND a.featured = false`
    }

    const groupByColumns = `
      a.id, 
      a.title, 
      a.description, 
      a.min_bid,
      a.image_url, 
      a.start_time, 
      a.end_time, 
      a.category, 
      a.status,
      a.slug, 
      a.featured, 
      a.event_id, 
      a.donor, 
      a.bid_increment,
      a.created_at
      ${includeWinners ? `, w.id, w.user_id, w.payment_status, w.final_bid, u.name, u.profile_image` : ""}
    `

    query += ` GROUP BY ${groupByColumns} ORDER BY a.created_at DESC`

    if (pageSize && page) {
      const limitNum = Number.parseInt(pageSize)
      const pageNum = Number.parseInt(page)
      const offsetNum = (pageNum - 1) * limitNum
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
      queryParams.push(limitNum, offsetNum)
    } else if (limit) {
      query += ` LIMIT $${paramIndex}`
      queryParams.push(Number.parseInt(limit))
      if (offset) {
        paramIndex++
        query += ` OFFSET $${paramIndex}`
        queryParams.push(Number.parseInt(offset))
      }
    }

    console.log("[v0] Main query:", query)
    console.log("[v0] Main query params:", queryParams)

    const auctions = await sql.query(query, queryParams)

    console.log("[v0] Auctions query returned:", auctions?.length || 0, "items")
    if (auctions && auctions.length > 0) {
      console.log("[v0] First auction (preview):", {
        id: auctions[0].id,
        title: auctions[0].title,
        status: auctions[0].status,
        current_bid: auctions[0].current_bid,
      })
    }

    return NextResponse.json({
      auctions,
      pagination: {
        total: totalCount,
        page: page ? Number.parseInt(page) : 1,
        pageSize: pageSize ? Number.parseInt(pageSize) : auctions.length,
        totalPages: pageSize ? Math.ceil(totalCount / Number.parseInt(pageSize)) : 1,
      },
    })
  } catch (error: any) {
    console.error("[v0] Error fetching auctions:", error)
    console.error("[v0] Error details:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack,
    })

    return NextResponse.json(
      {
        auctions: [],
        pagination: { total: 0, page: 1, pageSize: 0, totalPages: 1 },
        error: error.message,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const body = await request.json()
    const {
      title,
      description,
      min_bid,
      bid_increment,
      valued_at,
      image_url,
      start_time,
      end_time,
      category,
      donor,
      featured = false,
      status = "active",
      is_donation,
      donor_user_id,
      donor_name,
      donor_email,
      donor_phone,
      donor_organization,
      donor_address,
      delivery_method,
      donation_notes,
    } = body

    const baseSlug =
      body.slug ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")

    let slug = baseSlug
    let counter = 1

    while (true) {
      const existingAuction = await sql.query(`SELECT id FROM auctions WHERE slug = $1 AND event_id = $2`, [
        slug,
        eventId,
      ])

      if (existingAuction.length === 0) {
        break
      }

      slug = `${baseSlug}-${counter}`
      counter++
    }

    let donorId = null
    if (donor_email && (donor_name || donor_organization)) {
      // Check if donor already exists by email
      const existingDonor = await sql`
        SELECT id FROM auction_donors WHERE donor_email = ${donor_email}
      `

      if (existingDonor.length > 0) {
        donorId = existingDonor[0].id
        // Update donor information if provided
        if (donor_name || donor_phone || donor_organization || donor_address) {
          await sql`
            UPDATE auction_donors
            SET 
              donor_name = COALESCE(${donor_name}, donor_name),
              donor_phone = COALESCE(${donor_phone}, donor_phone),
              donor_organization = COALESCE(${donor_organization}, donor_organization),
              donor_address = COALESCE(${donor_address}, donor_address),
              updated_at = NOW()
            WHERE id = ${donorId}
          `
        }
      } else {
        // Create new donor record
        const newDonor = await sql`
          INSERT INTO auction_donors (
            donor_name, donor_email, donor_phone, donor_organization, donor_address
          )
          VALUES (
            ${donor_name}, ${donor_email}, ${donor_phone}, ${donor_organization}, ${donor_address}
          )
          RETURNING id
        `
        donorId = newDonor[0].id
      }
    }

    const result = await sql`
      INSERT INTO auctions (
        title, description, min_bid, bid_increment, valued_at, image_url,
        start_time, end_time, category, donor, status, slug, featured, event_id,
        is_donation, donor_user_id, donor_id, delivery_method, donation_notes
      )
      VALUES (
        ${title}, ${description}, ${min_bid}, ${bid_increment}, ${valued_at}, ${image_url},
        ${start_time}, ${end_time}, ${category}, ${donor}, ${status}, ${slug}, ${featured}, ${eventId},
        ${is_donation || false}, ${donor_user_id || null}, ${donorId}, ${delivery_method || null}, ${donation_notes || null}
      )
      RETURNING *
    `

    if (is_donation && donor_user_id) {
      console.log("[v0] Item donation detected, sending email notifications...")

      try {
        const donorResult = await sql`
          SELECT name, email FROM users WHERE id = ${donor_user_id}
        `

        if (donorResult.length === 0) {
          console.error("[v0] Donor user not found")
        } else {
          const donorUser = donorResult[0]
          const donor_email = donorUser.email
          const donor_name = donorUser.name

          const eventResult = await sql`
            SELECT id, event_name, domain
            FROM events
            WHERE id = ${eventId}
          `

          if (eventResult.length === 0) {
            console.error("[v0] Event not found for donation emails")
          } else {
            const event = eventResult[0]
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
            const eventUrl = `${appUrl}`
            const currentYear = new Date().getFullYear()
            const donorFirstName = donor_name ? donor_name.split(" ")[0] : "Donor"

            const donorEmailData = {
              to: donor_email,
              template_id: process.env.SENDGRID_DONATION_ITEM_REQUESTOR_TEMPLATE_ID || "new-donation-item-requestor",
              dynamic_template_data: {
                eventTitle: event.event_name,
                year: currentYear,
                itemTitle: title,
                donorFirstName: donorFirstName,
                eventUrl: eventUrl,
              },
            }

            console.log("[v0] Sending confirmation email to donor:", donor_email)

            const donorEmailResponse = await fetch(`${appUrl}/api/emails/send`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(donorEmailData),
            })

            if (!donorEmailResponse.ok) {
              console.error("[v0] Failed to send donor confirmation email")
            } else {
              console.log("[v0] Donor confirmation email sent successfully")
            }

            const admins = await sql`
              SELECT u.email, u.name
              FROM event_admins ea
              JOIN users u ON ea.user_id = u.id
              WHERE ea.event_id = ${eventId}
            `

            console.log("[v0] Found", admins.length, "event admins to notify")

            for (const admin of admins) {
              const adminEmailData = {
                to: admin.email,
                template_id: process.env.SENDGRID_DONATION_ITEM_ADMIN_TEMPLATE_ID || "new-donation-item-admin",
                dynamic_template_data: {
                  eventTitle: event.event_name,
                  year: currentYear,
                  itemTitle: title,
                  estimatedValue: valued_at || min_bid,
                  donorName: donor_name || "Anonymous",
                  donorEmail: donor_email,
                  adminDashboardUrl: `${eventUrl}/admin`,
                },
              }

              console.log("[v0] Sending notification email to admin:", admin.email)

              const adminEmailResponse = await fetch(`${appUrl}/api/emails/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(adminEmailData),
              })

              if (!adminEmailResponse.ok) {
                console.error("[v0] Failed to send admin notification email to:", admin.email)
              } else {
                console.log("[v0] Admin notification email sent successfully to:", admin.email)
              }
            }
          }
        }
      } catch (emailError) {
        console.error("[v0] Error sending donation item emails:", emailError)
      }
    }

    return NextResponse.json({ auction: result[0] }, { status: 201 })
  } catch (error: any) {
    console.error("[v0] Error creating auction:", error)

    if (error.code === "23505" || error.message?.includes("duplicate key")) {
      return NextResponse.json(
        {
          error: "An auction with this title already exists. Please use a different title.",
          details: error.message,
        },
        { status: 409 },
      )
    }

    return NextResponse.json(
      {
        error: "Failed to create auction",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
