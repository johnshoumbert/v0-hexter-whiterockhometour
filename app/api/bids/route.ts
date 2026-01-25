import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { sendEmail } from "@/lib/email"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const auctionIdParam = searchParams.get("auction_id") || searchParams.get("auction")
    const userParam = searchParams.get("user")
    const eventIdParam = searchParams.get("event_id")

    if (!auctionIdParam && !userParam) {
      const user = await getSession()
      if (!user || !user.is_admin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      const bids = await sql`
        SELECT b.*, 
          a.title as auction_title,
          u.name as bidder_name
        FROM bids b
        JOIN auctions a ON b.auction_id = a.id
        JOIN users u ON b.user_id = u.id
        ORDER BY b.created_at DESC
      `

      return NextResponse.json({ bids })
    }

    if (userParam && userParam !== "me") {
      const user = await getSession()
      if (!user || !user.is_admin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      const bids = await sql`
        SELECT b.*, 
          a.title as auction_title,
          a.image_url as auction_image_url,
          a.end_time as auction_end_time,
          a.status as auction_status,
          (SELECT MAX(amount) FROM bids WHERE auction_id = b.auction_id) as current_highest_bid,
          (b.amount = (SELECT MAX(amount) FROM bids WHERE auction_id = b.auction_id)) as is_winning
        FROM bids b
        JOIN auctions a ON b.auction_id = a.id
        WHERE b.user_id = ${userParam}
        ORDER BY b.created_at DESC
      `

      return NextResponse.json({ bids })
    }

    if (userParam === "me") {
      const user = await getSession()
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      let query
      if (eventIdParam) {
        query = sql`
          SELECT DISTINCT ON (b.auction_id) b.*, 
            a.title as auction_title,
            a.image_url as auction_image_url,
            a.end_time as auction_end_time,
            a.status as auction_status,
            a.event_id as auction_event_id,
            e.domain as event_domain,
            e.event_name as event_name,
            (SELECT MAX(amount) FROM bids WHERE auction_id = b.auction_id) as current_highest_bid,
            (b.amount = (SELECT MAX(amount) FROM bids WHERE auction_id = b.auction_id)) as is_winning
          FROM bids b
          JOIN auctions a ON b.auction_id = a.id
          JOIN events e ON a.event_id = e.id
          WHERE b.user_id = ${user.id} AND b.event_id = ${eventIdParam}
          ORDER BY b.auction_id, b.amount DESC, b.created_at DESC
        `
      } else {
        query = sql`
          SELECT DISTINCT ON (b.auction_id) b.*, 
            a.title as auction_title,
            a.image_url as auction_image_url,
            a.end_time as auction_end_time,
            a.status as auction_status,
            a.event_id as auction_event_id,
            e.domain as event_domain,
            e.event_name as event_name,
            (SELECT MAX(amount) FROM bids WHERE auction_id = b.auction_id) as current_highest_bid,
            (b.amount = (SELECT MAX(amount) FROM bids WHERE auction_id = b.auction_id)) as is_winning
          FROM bids b
          JOIN auctions a ON b.auction_id = a.id
          JOIN events e ON a.event_id = e.id
          WHERE b.user_id = ${user.id}
          ORDER BY b.auction_id, b.amount DESC, b.created_at DESC
        `
      }

      const bids = await query

      const formattedBids = bids.map((bid: any) => ({
        id: bid.id,
        amount: bid.amount,
        created_at: bid.created_at,
        event_id: bid.auction_event_id,
        auction: {
          id: bid.auction_id,
          title: bid.auction_title,
          image_url: bid.auction_image_url,
          end_time: bid.auction_end_time,
          status: bid.auction_status,
        },
        event: {
          domain: bid.event_domain,
          name: bid.event_name,
        },
        is_winning: bid.is_winning,
        current_highest_bid: bid.current_highest_bid,
      }))

      return NextResponse.json({ bids: formattedBids })
    }

    if (auctionIdParam) {
      const bids = await sql`
        SELECT b.*, 
          u.name as user_name,
          u.email as user_email,
          u.profile_image,
          (b.amount = (SELECT MAX(amount) FROM bids WHERE auction_id = b.auction_id)) as is_highest
        FROM bids b
        JOIN users u ON b.user_id = u.id
        WHERE b.auction_id = ${auctionIdParam}
        ORDER BY b.amount DESC, b.created_at DESC
      `

      return NextResponse.json({ bids })
    }

    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Get bids error:", error)
    return NextResponse.json({ error: "Failed to fetch bids" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { auction_id, amount, authorized, payment_method_id, event_id } = await request.json()

    if (!auction_id || !amount) {
      return NextResponse.json({ error: "Auction ID and amount are required" }, { status: 400 })
    }

    // Get auction details
    const auctions = await sql`
      SELECT a.*, e.event_name, e.domain as event_domain
      FROM auctions a
      JOIN events e ON a.event_id = e.id
      WHERE a.id = ${auction_id}
    `

    if (auctions.length === 0) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 })
    }

    const auction = auctions[0]

    const hasEnded = auction.end_time && new Date(auction.end_time) < new Date()

    // Get current highest bid and check if user is the winner
    const currentBids = await sql`
      SELECT b.*, b.user_id = ${user.id} as is_current_winner, u.name as user_name, u.email as user_email
      FROM bids b
      JOIN users u ON b.user_id = u.id
      WHERE b.auction_id = ${auction_id}
      ORDER BY b.amount DESC
      LIMIT 1
    `

    const highestBid = currentBids[0]
    const isWinner = highestBid?.is_current_winner || false

    if (hasEnded && isWinner) {
      // Winner can still authorize after auction ends
      if (authorized && payment_method_id) {
        // Store authorization at auction level
        await sql`
          INSERT INTO auction_authorizations (
            auction_id, user_id, event_id, 
            stripe_customer_id, stripe_payment_method_id, 
            authorized_at, created_at, updated_at
          ) VALUES (
            ${auction_id}, ${user.id}, ${auction.event_id},
            ${user.stripe_customer_id || null}, ${payment_method_id},
            NOW(), NOW(), NOW()
          )
          ON CONFLICT (auction_id, user_id)
          DO UPDATE SET
            stripe_customer_id = EXCLUDED.stripe_customer_id,
            stripe_payment_method_id = EXCLUDED.stripe_payment_method_id,
            authorized_at = NOW(),
            updated_at = NOW()
        `
        return NextResponse.json({ bid: highestBid, message: "Payment authorized for auction" })
      }
    }

    if (auction.status !== "active") {
      return NextResponse.json({ error: "Auction is not active" }, { status: 400 })
    }

    const currentBid = highestBid?.amount || auction.min_bid

    // Validate bid amount
    if (amount <= currentBid) {
      return NextResponse.json({ error: `Bid must be higher than current bid of $${currentBid}` }, { status: 400 })
    }

    const previousHighestBidder = highestBid
      ? {
          user_id: highestBid.user_id,
          name: highestBid.user_name,
          email: highestBid.user_email,
          amount: highestBid.amount,
        }
      : null

    const newBids = await sql`
      INSERT INTO bids (auction_id, user_id, amount, event_id)
      VALUES (
        ${auction_id}, 
        ${user.id}, 
        ${amount},
        ${auction.event_id}
      )
      RETURNING *
    `

    if (authorized && payment_method_id) {
      await sql`
        INSERT INTO auction_authorizations (
          auction_id, user_id, event_id, 
          stripe_customer_id, stripe_payment_method_id, 
          authorized_at, created_at, updated_at
        ) VALUES (
          ${auction_id}, ${user.id}, ${auction.event_id},
          ${user.stripe_customer_id || null}, ${payment_method_id},
          NOW(), NOW(), NOW()
        )
        ON CONFLICT (auction_id, user_id)
        DO UPDATE SET
          stripe_customer_id = EXCLUDED.stripe_customer_id,
          stripe_payment_method_id = EXCLUDED.stripe_payment_method_id,
          authorized_at = NOW(),
          updated_at = NOW()
      `
    }

    try {
      const currentYear = new Date().getFullYear()

      // Fetch template ID for bid confirmation
      const bidConfirmTemplate = await sql`
        SELECT template_id FROM email_templates 
        WHERE email_task = 'bid-confirmation' 
        AND is_active = true
        LIMIT 1
      `

      const bidConfirmTemplateId = bidConfirmTemplate[0]?.template_id

      const confirmationResult = await sendEmail({
        to: user.email,
        subject: `Thank You for Your Bid on ${auction.title}`,
        templateId: bidConfirmTemplateId,
        dynamicTemplateData: {
          name: user.name || "Bidder",
          auctionTitle: auction.title,
          amount: amount,
          year: currentYear,
          eventName: auction.event_name,
        },
      })

      const status = confirmationResult.success ? "sent" : "failed"
      const dynamicData = JSON.stringify({
        name: user.name || "Bidder",
        auctionTitle: auction.title,
        amount: amount,
        year: currentYear,
        eventName: auction.event_name,
      })

      // Store actual template ID in email_queue
      await sql`
        INSERT INTO email_queue (
          template_id, subject, to_email, from_email,
          dynamic_template_data, status, error_message
        )
        VALUES (
          ${bidConfirmTemplateId},
          ${"Thank You for Your Bid on " + auction.title},
          ${user.email},
          ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
          ${dynamicData}::jsonb,
          ${status},
          ${!confirmationResult.success ? confirmationResult.error : null}
        )
      `
    } catch (emailError) {
      console.error("Failed to send bid confirmation email:", emailError)
    }

    if (previousHighestBidder && previousHighestBidder.email) {
      try {
        const currentYear = new Date().getFullYear()

        const outbidTemplate = await sql`
          SELECT template_id FROM email_templates 
          WHERE email_task = 'outbid-notification' 
          AND is_active = true
          LIMIT 1
        `

        const outbidTemplateId = outbidTemplate[0]?.template_id

        const eventDomain = auction.event_domain
          ? `https://${auction.event_domain}`
          : request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://myschoolauction.com"

        const outbidResult = await sendEmail({
          to: previousHighestBidder.email,
          subject: `You Were Outbid on ${auction.title}`,
          templateId: outbidTemplateId,
          dynamicTemplateData: {
            name: previousHighestBidder.name || "Bidder",
            auctionTitle: auction.title,
            currentBid: amount,
            yourBid: previousHighestBidder.amount,
            year: currentYear,
            eventName: auction.event_name,
            link: `${eventDomain}/auctions/${auction_id}`,
          },
        })

        const status = outbidResult.success ? "sent" : "failed"
        const dynamicData = JSON.stringify({
          name: previousHighestBidder.name || "Bidder",
          auctionTitle: auction.title,
          currentBid: amount,
          yourBid: previousHighestBidder.amount,
          year: new Date().getFullYear(),
          eventName: auction.event_name,
          link: `${eventDomain}/auctions/${auction_id}`,
        })

        // Store actual template ID in email_queue
        await sql`
          INSERT INTO email_queue (
            template_id, subject, to_email, from_email,
            dynamic_template_data, status, error_message
          )
          VALUES (
            ${outbidTemplateId},
            ${"You Were Outbid on " + auction.title},
            ${previousHighestBidder.email},
            ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
            ${dynamicData}::jsonb,
            ${status},
            ${!outbidResult.success ? outbidResult.error : null}
          )
        `
      } catch (emailError) {
        console.error("Failed to send outbid notification email:", emailError)
      }
    }

    return NextResponse.json({ bid: newBids[0] })
  } catch (error) {
    console.error("Place bid error:", error)
    return NextResponse.json({ error: "Failed to place bid" }, { status: 500 })
  }
}
