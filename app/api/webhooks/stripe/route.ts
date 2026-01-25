import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { sql } from "@/lib/db"
import type Stripe from "stripe"
import { sendEmail } from "@/lib/email"
import ContactNotification from "@/emails/contact-notification"
import PaymentReceipt from "@/emails/payment-receipt"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error("[v0] Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  console.log("[v0] Stripe webhook event:", event.type)

  try {
    if (event.type === "setup_intent.succeeded") {
      const setupIntent = event.data.object as Stripe.SetupIntent
      const { auctionId, userId, eventId } = setupIntent.metadata || {}

      if (auctionId && userId && eventId && setupIntent.customer && setupIntent.payment_method) {
        await sql`
          INSERT INTO auction_authorizations (
            auction_id, user_id, event_id, 
            stripe_customer_id, stripe_payment_method_id, 
            authorized_at, created_at, updated_at
          ) VALUES (
            ${auctionId}, ${userId}, ${eventId},
            ${setupIntent.customer as string}, ${setupIntent.payment_method as string},
            NOW(), NOW(), NOW()
          )
          ON CONFLICT (auction_id, user_id)
          DO UPDATE SET
            stripe_customer_id = EXCLUDED.stripe_customer_id,
            stripe_payment_method_id = EXCLUDED.stripe_payment_method_id,
            authorized_at = NOW(),
            updated_at = NOW()
        `
        console.log(`Authorization stored for auction ${auctionId}, user ${userId}`)
        return NextResponse.json({ received: true })
      }
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      const {
        licenseId,
        licenseCode,
        email,
        eventId,
        type,
        purchase_id,
        ticket_id,
        quantity,
        order_ids,
        invoice_id,
        invoice_number,
      } = session.metadata || {}

      if (type === "donation" && eventId) {
        const paymentIntent = session.payment_intent as string
        const amount = session.amount_total ? session.amount_total / 100 : 0
        const userId = session.metadata?.user_id || null
        const paymentId = session.metadata?.payment_id

        if (paymentId) {
          await sql`
            UPDATE payments 
            SET 
              stripe_payment_intent = ${paymentIntent},
              stripe_session_id = ${session.id},
              payment_type = 'donation',
              status = 'completed',
              updated_at = NOW()
            WHERE id = ${paymentId}
          `
          console.log(`[v0] Updated payment ${paymentId} to completed for donation of $${amount}`)

          // Insert payment item record
          await sql`
            INSERT INTO payment_items (
              payment_id, item_type, item_name, quantity, unit_price, total_amount, created_at
            ) VALUES (
              ${paymentId}, 'donation', 'Donation', 1, ${amount}, ${amount}, NOW()
            )
          `

          try {
            const userResult = await sql`
              SELECT u.first_name, u.last_name, u.email
              FROM users u
              WHERE u.id = ${userId}
            `
            const eventResult = await sql`
              SELECT name FROM events WHERE id = ${eventId}
            `

            if (userResult.length > 0 && eventResult.length > 0) {
              const user = userResult[0]
              const eventName = eventResult[0].name

              await sendEmail({
                to: user.email,
                subject: `Payment Receipt - ${eventName}`,
                react: PaymentReceipt({
                  customerName: `${user.first_name} ${user.last_name}`,
                  customerEmail: user.email,
                  paymentType: "donation",
                  itemName: "Donation",
                  amount: amount,
                  paymentDate: new Date().toLocaleString(),
                  paymentId: paymentId,
                  eventName: eventName,
                }),
              })
              console.log(`[v0] Receipt email sent for payment ${paymentId}`)
            }
          } catch (emailError) {
            console.error("[v0] Failed to send receipt email:", emailError)
          }
        }

        return NextResponse.json({ received: true })
      }

      if (type === "ticket_purchase" && session.metadata?.purchase_ids) {
        const paymentIntent = session.payment_intent as string
        const purchaseIds = session.metadata.purchase_ids.split(",")
        const amount = session.amount_total ? session.amount_total / 100 : 0
        const userId = session.metadata.user_id
        const eventId = session.metadata.event_id

        for (const purchaseId of purchaseIds) {
          await sql`
            UPDATE ticket_purchases 
            SET status = 'completed', 
                stripe_payment_intent = ${paymentIntent},
                updated_at = NOW()
            WHERE id = ${purchaseId}
          `
        }

        for (const purchaseId of purchaseIds) {
          await sql`
            UPDATE event_tickets et
            SET quantity_sold = quantity_sold + tp.quantity,
                updated_at = NOW()
            FROM ticket_purchases tp
            WHERE et.id = tp.ticket_id
            AND tp.id = ${purchaseId}
          `
        }

        if (userId && eventId) {
          await sql`
            INSERT INTO event_users (event_id, user_id, role, created_at)
            VALUES (${eventId}, ${userId}, 'participant', NOW())
            ON CONFLICT (event_id, user_id) DO NOTHING
          `

          await sql`
            INSERT INTO event_attendance (event_id, user_id, status, created_at, updated_at)
            VALUES (${eventId}, ${userId}, 'going', NOW(), NOW())
            ON CONFLICT (event_id, user_id)
            DO UPDATE SET status = 'going', updated_at = NOW()
          `
        }

        const paymentResult = await sql`
          INSERT INTO payments (user_id, auction_id, event_id, amount, stripe_payment_intent, 
          stripe_session_id, payment_type, status, created_at)
          VALUES (
            ${userId}, NULL, ${eventId}, ${amount}, ${paymentIntent},
            ${session.id}, 'ticket', 'completed', NOW()
          )
          RETURNING id
        `
        const paymentId = paymentResult[0].id

        const ticketData = []
        for (const purchaseId of purchaseIds) {
          const ticketResult = await sql`
            SELECT tp.id, tp.ticket_id, tp.quantity, tp.total_amount, et.name
            FROM ticket_purchases tp
            JOIN event_tickets et ON tp.ticket_id = et.id
            WHERE tp.id = ${purchaseId}
          `
          if (ticketResult.length > 0) {
            ticketData.push(ticketResult[0])
          }
        }

        for (const ticket of ticketData) {
          await sql`
            INSERT INTO payment_items (
              payment_id, item_type, item_id, item_name, quantity, 
              unit_price, total_amount, created_at
            ) VALUES (
              ${paymentId}, 'ticket', ${ticket.ticket_id}, ${ticket.name}, 
              ${ticket.quantity}, ${ticket.total_amount / ticket.quantity}, 
              ${ticket.total_amount}, NOW()
            )
          `
        }

        try {
          const userResult = await sql`
            SELECT u.first_name, u.last_name, u.email
            FROM users u
            WHERE u.id = ${userId}
          `
          const eventResult = await sql`
            SELECT name FROM events WHERE id = ${eventId}
          `

          if (userResult.length > 0 && eventResult.length > 0) {
            const user = userResult[0]
            const eventName = eventResult[0].name

            await sendEmail({
              to: user.email,
              subject: `Ticket Receipt - ${eventName}`,
              react: PaymentReceipt({
                customerName: `${user.first_name} ${user.last_name}`,
                customerEmail: user.email,
                paymentType: "ticket",
                itemName: "Event Tickets",
                amount: amount,
                paymentDate: new Date().toLocaleString(),
                paymentId: paymentId,
                eventName: eventName,
              }),
            })
            console.log(`[v0] Receipt email sent for ticket purchase`)
          }
        } catch (emailError) {
          console.error("[v0] Failed to send receipt email:", emailError)
        }

        console.log(`[v0] Updated ${purchaseIds.length} ticket purchases to completed`)
        return NextResponse.json({ received: true })
      }

      if (type === "shop_order" && session.metadata?.order_ids) {
        const paymentIntent = session.payment_intent as string
        const amount = session.amount_total ? session.amount_total / 100 : 0
        const userId = session.metadata?.user_id
        const eventId = session.metadata?.event_id
        const orderIds = session.metadata.order_ids.split(",")

        console.log("[v0] ===== SHOP ORDER WEBHOOK PROCESSING STARTING =====")
        console.log("[v0] Payment Intent:", paymentIntent)
        console.log("[v0] Amount:", amount)
        console.log("[v0] User ID:", userId)
        console.log("[v0] Event ID:", eventId)
        console.log("[v0] Order IDs:", orderIds)

        console.log(`[v0] Processing shop order with ${orderIds.length} items, total: $${amount}`)

        for (const orderId of orderIds) {
          await sql`
            UPDATE shop_orders
            SET status = 'completed',
                updated_at = NOW()
            WHERE id = ${orderId}
          `
          console.log(`[v0] ✓ Updated shop order ${orderId} to completed`)
        }

        console.log("[v0] All shop orders updated to completed")

        for (const orderId of orderIds) {
          console.log("[v0] Updating inventory for order:", orderId)
          await sql`
            UPDATE shop_items si
            SET quantity_sold = quantity_sold + so.quantity,
                updated_at = NOW()
            FROM shop_orders so
            WHERE si.id = so.shop_item_id
            AND so.id = ${orderId}
          `
          console.log("[v0] ✓ Inventory updated for order:", orderId)
        }

        console.log("[v0] Creating payment record...")
        const paymentResult = await sql`
          INSERT INTO payments (
            user_id, auction_id, event_id, amount, stripe_payment_intent, 
            stripe_session_id, payment_type, status, created_at
          )
          VALUES (
            ${userId}, NULL, ${eventId}, ${amount}, ${paymentIntent},
            ${session.id}, 'shop', 'completed', NOW()
          )
          RETURNING id
        `
        const paymentId = paymentResult[0].id
        console.log(`[v0] ✓ Created payment record ${paymentId} for event ${eventId}, amount $${amount}`)

        console.log("[v0] Fetching shop order details for payment items...")
        const shopOrderData = []
        for (const orderId of orderIds) {
          const orderResult = await sql`
            SELECT so.id, so.shop_item_id, so.quantity, so.unit_price, so.total_amount, 
                   so.selected_options, si.title
            FROM shop_orders so
            JOIN shop_items si ON so.shop_item_id = si.id
            WHERE so.id = ${orderId}
          `
          if (orderResult.length > 0) {
            shopOrderData.push(orderResult[0])
            console.log("[v0] ✓ Fetched order details:", orderResult[0].title)
          }
        }

        console.log("[v0] Creating payment items...")
        for (const order of shopOrderData) {
          await sql`
            INSERT INTO payment_items (
              payment_id, item_type, item_id, item_name, quantity, 
              unit_price, total_amount, metadata, created_at
            ) VALUES (
              ${paymentId}, 'shop_item', ${order.shop_item_id}, ${order.title}, 
              ${order.quantity}, ${order.unit_price}, ${order.total_amount},
              ${order.selected_options || null}::jsonb, NOW()
            )
          `
          console.log("[v0] ✓ Created payment item for:", order.title)
        }

        try {
          console.log("[v0] Sending receipt email...")
          const userResult = await sql`
            SELECT u.first_name, u.last_name, u.email
            FROM users u
            WHERE u.id = ${userId}
          `
          const eventResult = await sql`
            SELECT name FROM events WHERE id = ${eventId}
          `

          if (userResult.length > 0 && eventResult.length > 0) {
            const user = userResult[0]
            const eventName = eventResult[0].name
            const itemTitle = shopOrderData.length > 1 ? `${shopOrderData.length} items` : shopOrderData[0].title

            await sendEmail({
              to: user.email,
              subject: `Purchase Receipt - ${eventName}`,
              react: PaymentReceipt({
                customerName: `${user.first_name} ${user.last_name}`,
                customerEmail: user.email,
                paymentType: "shop",
                itemName: itemTitle,
                amount: amount,
                paymentDate: new Date().toLocaleString(),
                paymentId: paymentId,
                eventName: eventName,
              }),
            })
            console.log(`[v0] ✓ Receipt email sent for payment ${paymentId} to ${user.email}`)
          } else {
            console.log("[v0] ⚠ User or event not found for email")
          }
        } catch (emailError) {
          console.error("[v0] ✗ Failed to send receipt email:", emailError)
        }

        console.log(`[v0] ===== SHOP ORDER COMPLETED: ${orderIds.length} orders, payment ${paymentId} =====`)
        return NextResponse.json({ received: true })
      }

      if (type === "invoice" && session.metadata?.invoice_id) {
        const paymentIntent = session.payment_intent as string
        const amount = session.amount_total ? session.amount_total / 100 : 0
        const userId = session.metadata.user_id
        const eventId = session.metadata.event_id
        const invoiceId = session.metadata.invoice_id
        const invoiceNumber = session.metadata.invoice_number

        console.log("[v0] ===== INVOICE PAYMENT WEBHOOK PROCESSING =====")
        console.log("[v0] Payment Intent:", paymentIntent)
        console.log("[v0] Amount:", amount)
        console.log("[v0] User ID:", userId)
        console.log("[v0] Event ID:", eventId)
        console.log("[v0] Invoice ID:", invoiceId)

        // Create payment record
        const paymentResult = await sql`
          INSERT INTO payments (
            user_id, auction_id, event_id, amount, stripe_payment_intent,
            stripe_session_id, payment_type, status, created_at
          )
          VALUES (
            ${userId}, NULL, ${eventId}, ${amount}, ${paymentIntent},
            ${session.id}, 'invoice', 'completed', NOW()
          )
          RETURNING id
        `
        const paymentId = paymentResult[0].id
        console.log("[v0] ✓ Created payment record:", paymentId)

        // Update po_requests with payment_id and status
        await sql`
          UPDATE po_requests
          SET payment_id = ${paymentId},
              status = 'paid',
              updated_at = NOW()
          WHERE id = ${invoiceId}
        `
        console.log("[v0] ✓ Updated po_request status to 'paid'")

        // Send confirmation email
        try {
          const userResult = await sql`
            SELECT u.first_name, u.last_name, u.email
            FROM users u
            WHERE u.id = ${userId}
          `
          const eventResult = await sql`
            SELECT event_name FROM events WHERE id = ${eventId}
          `

          if (userResult.length > 0 && eventResult.length > 0) {
            const user = userResult[0]
            const eventName = eventResult[0].event_name

            await sendEmail({
              to: user.email,
              subject: `Payment Received - ${invoiceNumber}`,
              react: PaymentReceipt({
                customerName: `${user.first_name} ${user.last_name}`,
                customerEmail: user.email,
                paymentType: "invoice",
                itemName: `Invoice ${invoiceNumber}`,
                amount: amount,
                paymentDate: new Date().toLocaleString(),
                paymentId: paymentId,
                eventName: eventName,
              }),
            })
            console.log("[v0] ✓ Invoice payment confirmation email sent")
          }
        } catch (emailError) {
          console.error("[v0] ✗ Failed to send invoice payment email:", emailError)
        }

        console.log("[v0] ===== INVOICE PAYMENT COMPLETED =====")
        return NextResponse.json({ received: true })
      }

      if (type === "registration_balance" && purchase_id) {
        const paymentIntent = session.payment_intent as string
        const amount = session.amount_total ? session.amount_total / 100 : 0

        await sql`
          UPDATE ticket_purchases
          SET 
            ticket_id = ${ticket_id},
            quantity = ${Number.parseInt(quantity || "1")},
            total_amount = total_amount + ${amount},
            stripe_payment_intent = ${paymentIntent},
            stripe_session_id = ${session.id},
            status = 'completed',
            updated_at = NOW()
          WHERE id = ${purchase_id}
        `
        console.log(`[v0] Updated registration with balance payment for purchase ${purchase_id}`)
        return NextResponse.json({ received: true })
      }

      if (!licenseId) {
        console.error("[v0] No license ID in webhook metadata")
        return NextResponse.json({ error: "No license ID" }, { status: 400 })
      }

      console.log("[v0] Processing payment for license:", licenseId, "Code:", licenseCode)

      await sql`
        UPDATE licenses 
        SET status = 'paid', 
            stripe_payment_intent = ${(session.payment_intent as string) || null},
            stripe_session_id = ${session.id},
            updated_at = NOW()
        WHERE id = ${licenseId}
      `

      if (eventId) {
        await sql`
          UPDATE events 
          SET license_status = 'paid',
              updated_at = NOW()
          WHERE id = ${eventId}
        `
        console.log("[v0] Updated event license status:", eventId)
      }

      if (email && licenseCode) {
        try {
          await sendEmail({
            to: email,
            subject: "Your MySchoolAuction License Code",
            react: ContactNotification({
              name: email,
              email: email,
              subject: "Your License Code",
              message: `Thank you for your purchase! Your license code is: ${licenseCode}\n\nUse this code when creating your auction event. Keep this email for your records.`,
            }),
          })
          console.log("[v0] License code email sent to:", email)
        } catch (emailError) {
          console.error("[v0] Failed to send license email:", emailError)
        }
      }

      console.log("[v0] License payment processed successfully")
    }

    if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session
      const { type, order_ids } = session.metadata || {}

      if (type === "shop_order" && order_ids) {
        const orderIds = order_ids.split(",")
        console.log("[v0] ===== CHECKOUT FAILED/EXPIRED =====")
        console.log("[v0] Deleting checkout orders:", orderIds)

        for (const orderId of orderIds) {
          await sql`
            DELETE FROM shop_orders
            WHERE id = ${orderId} AND status = 'checkout'
          `
          console.log(`[v0] ✓ Deleted checkout order ${orderId}`)
        }

        console.log("[v0] ===== CHECKOUT ORDERS CLEANED UP =====")
      }

      return NextResponse.json({ received: true })
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent

      console.log("[v0] ===== PAYMENT FAILED =====")
      console.log("[v0] Payment Intent:", paymentIntent.id)

      // Mark orders as failed instead of deleting them so there's a record
      await sql`
        UPDATE shop_orders
        SET status = 'failed',
            updated_at = NOW()
        WHERE stripe_payment_intent = ${paymentIntent.id} AND status = 'checkout'
      `

      console.log("[v0] ✓ Updated orders to failed status")
      console.log("[v0] ===== PAYMENT FAILURE HANDLED =====")

      return NextResponse.json({ received: true })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[v0] Webhook handler error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
