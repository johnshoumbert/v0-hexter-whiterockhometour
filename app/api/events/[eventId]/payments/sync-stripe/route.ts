import { type NextRequest, NextResponse } from "next/server"
import { verifyAuth, isEventAdmin } from "@/lib/auth"
import { getEventStripe } from "@/lib/stripe"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const user = await verifyAuth(request)

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isAdmin = user.is_admin
    const isEventAdminUser = await isEventAdmin(user.id, eventId)

    if (!isAdmin && !isEventAdminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    console.log("[v0] Syncing Stripe payments for event:", eventId)

    let stripe
    let keySource
    try {
      const stripeConfig = await getEventStripe(eventId)
      stripe = stripeConfig.stripe
      keySource = stripeConfig.keySource
      console.log("[v0] Stripe client initialized. Key source:", keySource)
    } catch (error: any) {
      console.error("[v0] Failed to get Stripe configuration:", error)
      return NextResponse.json(
        {
          error: "Stripe not configured",
          message: "Please configure Stripe in your environment variables or event settings.",
        },
        { status: 400 },
      )
    }

    console.log("[v0] Stripe API Version:", stripe.getApiField("version"))

    /* ------------------------------------------------------------------
     * 🔍 STRIPE SEARCH (METADATA INDEXED)
     * ------------------------------------------------------------------ */
    const eventPayments: any[] = []
    let nextPage: string | undefined = undefined
    let pageCount = 0

    try {
      const searchQuery = `metadata["event_id"]:"${eventId}"`
      console.log("[v0] Starting Stripe search with query:", searchQuery)
      console.log("[v0] Event ID being searched:", eventId)

      do {
        pageCount++

        try {
          const searchParams = {
            query: searchQuery,
            limit: 100,
            ...(nextPage ? { page: nextPage } : {}),
          }

          const result = await stripe.paymentIntents.search(searchParams)

          eventPayments.push(...result.data)
          nextPage = result.next_page
        } catch (searchError: any) {
          // Handle specific Stripe errors
          if (searchError.type === "StripePermissionError") {
            return NextResponse.json(
              {
                error: "Permission Denied",
                message:
                  "Your Stripe API key does not have permission to search payment intents. Please ensure you're using a key with 'read' permissions for payment intents.",
                details: searchError.message,
              },
              { status: 403 },
            )
          }

          if (searchError.type === "StripeAuthenticationError") {
            return NextResponse.json(
              {
                error: "Authentication Failed",
                message: "Invalid Stripe API key. Please check your STRIPE_SECRET_KEY environment variable.",
                details: searchError.message,
              },
              { status: 401 },
            )
          }

          if (searchError.type === "StripeConnectionError") {
            return NextResponse.json(
              {
                error: "Connection Error",
                message: "Failed to connect to Stripe. Please check your internet connection and try again.",
                details: searchError.message,
              },
              { status: 503 },
            )
          }

          // Re-throw for generic handling
          throw searchError
        }
      } while (nextPage)

      console.log("[v0] Stripe search complete. Total payment intents found:", eventPayments.length)

      if (eventPayments.length === 0) {
        console.log("[v0] No payment intents found with event_id metadata:", eventId)
        return NextResponse.json({
          success: true,
          message:
            "No Stripe payments found for this event. This could mean: 1) No payments have been made yet, 2) Payments don't have event_id in metadata, 3) The event_id doesn't match.",
          total: 0,
          created: 0,
          updated: 0,
          skipped: 0,
        })
      }
    } catch (error: any) {
      console.error("[v0] Stripe search failed:", error)
      return NextResponse.json(
        {
          error: "Stripe Search Failed",
          message: error.message || "Failed to search Stripe payment intents",
          details: error.stack,
        },
        { status: 500 },
      )
    }

    /* ------------------------------------------------------------------
     * 🗑️ DELETE OLD PENDING PAYMENTS (OLDER THAN 5 DAYS)
     * ------------------------------------------------------------------ */
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    
    const deletedPending = await sql`
      DELETE FROM payments
      WHERE event_id = ${eventId}
        AND status = 'pending'
        AND created_at < ${fiveDaysAgo}
      RETURNING id
    `
    
    console.log("[v0] Deleted old pending payments:", deletedPending.length)

    /* ------------------------------------------------------------------
     * 🔄 SYNC INTO DATABASE (SKIP PENDING PAYMENTS)
     * ------------------------------------------------------------------ */
    let createdCount = 0
    let updatedCount = 0
    let skippedCount = 0
    const errors: string[] = []

    for (const paymentIntent of eventPayments) {
      try {
        const metadata = paymentIntent.metadata || {}
        const paymentType = metadata.type || "other"
        const userId = metadata.user_id || null
        const auctionId = metadata.auction_id || null

        const stripeStatus = paymentIntent.status === "succeeded" ? "completed" : paymentIntent.status

        // Skip pending payments - only import succeeded, canceled, etc.
        if (stripeStatus === "pending" || paymentIntent.status === "requires_payment_method" || paymentIntent.status === "requires_confirmation") {
          skippedCount++
          continue
        }

        const existingPayment = await sql`
          SELECT id, status, created_at
          FROM payments
          WHERE stripe_payment_intent = ${paymentIntent.id}
          LIMIT 1
        `

        const stripeCreatedAt = new Date(paymentIntent.created * 1000).toISOString()

        if (existingPayment.length > 0) {
          const existing = existingPayment[0]
          const statusDifferent = existing.status !== stripeStatus
          const createdAtDifferent = existing.created_at !== stripeCreatedAt

          if (statusDifferent || createdAtDifferent) {
            await sql`
              UPDATE payments
              SET status = ${stripeStatus}, created_at = ${stripeCreatedAt}, updated_at = NOW()
              WHERE id = ${existing.id}
            `
            updatedCount++
          } else {
            skippedCount++
          }
          continue
        }

        const amount = (paymentIntent.amount / 100).toFixed(2)

        const newPayment = await sql`
          INSERT INTO payments (
            event_id,
            user_id,
            auction_id,
            payment_type,
            amount,
            stripe_payment_intent,
            stripe_session_id,
            status,
            created_at,
            updated_at
          ) VALUES (
            ${eventId},
            ${userId},
            ${auctionId},
            ${paymentType},
            ${amount},
            ${paymentIntent.id},
            ${metadata.stripe_session_id || null},
            ${stripeStatus},
            ${stripeCreatedAt},
            NOW()
          )
          RETURNING id
        `

        createdCount++

        /* --------------------------------------------------------------
         * 🛒 SHOP ITEMS (OPTIONAL)
         * -------------------------------------------------------------- */
        if (paymentType === "shop_order" && metadata.items_data) {
          const itemsData = JSON.parse(metadata.items_data)

          if (Array.isArray(itemsData)) {
            for (const item of itemsData) {
              await sql`
                INSERT INTO payment_items (
                  payment_id,
                  item_type,
                  item_id,
                  quantity,
                  unit_price,
                  metadata
                ) VALUES (
                  ${newPayment[0].id},
                  'shop_item',
                  ${item.itemId},
                  ${item.quantity || 1},
                  ${item.unitPrice},
                  ${JSON.stringify({ selectedOptions: item.selectedOptions })}
                )
              `
            }
          }
        }
      } catch (err: any) {
        console.error("[v0] Payment sync error:", paymentIntent.id, err)
        errors.push(`Payment ${paymentIntent.id}: ${err.message}`)
        skippedCount++
      }
    }

    console.log("[v0] Sync complete")

    return NextResponse.json({
      success: true,
      total: eventPayments.length,
      created: createdCount,
      updated: updatedCount,
      skipped: skippedCount,
      deletedOldPending: deletedPending.length,
      errors: errors.length ? errors : undefined,
    })
  } catch (error: any) {
    console.error("[v0] Stripe sync failure:", error)
    return NextResponse.json(
      {
        error: "Sync Failed",
        message: error.message || "Unexpected error",
      },
      { status: 500 },
    )
  }
}
