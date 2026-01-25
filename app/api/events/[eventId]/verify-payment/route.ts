import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getEventStripe } from "@/lib/stripe"
import { getSession } from "@/lib/auth"
import { sendEmail } from "@/lib/email"

async function trackCouponUsage(
  couponCode: string,
  userId: string,
  eventId: string,
  orderType: string,
  orderId: string,
  discountAmount: number,
) {
  try {
    // Get the coupon ID from the code
    const couponResult = await sql`
      SELECT id FROM discount_codes 
      WHERE code = ${couponCode} AND event_id = ${eventId}
      LIMIT 1
    `

    if (couponResult.length === 0) {
      console.warn("[v0] Coupon code not found for usage tracking:", couponCode)
      return
    }

    const couponId = couponResult[0].id

    // The current_uses is now calculated dynamically from coupon_usage + payments table
    await sql`
      INSERT INTO coupon_usage (
        coupon_id, user_id, event_id, order_type, order_id, discount_applied, created_at
      )
      VALUES (
        ${couponId}, ${userId}, ${eventId}, ${orderType}, ${orderId}, ${discountAmount}, NOW()
      )
    `

    console.log("[v0] Coupon usage tracked:", { couponCode, userId, orderType, orderId, discountAmount })
  } catch (error) {
    console.error("[v0] Failed to track coupon usage:", error)
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  let type: string | undefined
  let paymentIntentId: string | undefined
  // Await params to get eventId (Next.js 15 requirement)
  const { eventId } = await params

  try {
    const session = await getSession()
    const body = await request.json()
    type = body.type
    paymentIntentId = body.paymentIntent

    console.log("[v0] Payment verification starting:", { eventId, paymentIntent: paymentIntentId, type })

    const { stripe, keySource } = await getEventStripe(eventId)
    
    console.log("[v0] VERIFY-PAYMENT - Using Stripe key source:", keySource, "for eventId:", eventId)

    // Retrieve payment intent from Stripe
    console.log("[v0] Attempting to retrieve payment intent:", paymentIntentId, "from keySource:", keySource)
    
    let intent
    try {
      intent = await stripe.paymentIntents.retrieve(paymentIntentId)
      console.log("[v0] Payment intent retrieved successfully:", {
        id: intent.id, 
        status: intent.status,
        metadata: intent.metadata,
        amount: intent.amount,
        keySource: keySource
      })
      
      // Verify the eventId matches
      if (intent.metadata.event_id && intent.metadata.event_id !== eventId) {
        console.error("[v0] EVENT ID MISMATCH DETECTED:", {
          verifyPaymentEventId: eventId,
          paymentIntentEventId: intent.metadata.event_id,
          message: "The payment intent was created for a DIFFERENT event! This will cause Stripe account mismatch."
        })
      } else {
        console.log("[v0] Event ID verification passed - both match:", eventId)
      }
    } catch (stripeError: any) {
      console.error("[v0] STRIPE ERROR - Failed to retrieve payment intent:", {
        error: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        paymentIntentId: paymentIntentId,
        verifyPaymentEventId: eventId,
        keySource: keySource,
        requestType: type
      })
      console.error("[v0] DIAGNOSIS: Payment intent was likely created on a different Stripe account")
      console.error("[v0] POSSIBLE CAUSES:")
      console.error("[v0] 1. Event ID mismatch - checkout used different eventId than verification")
      console.error("[v0] 2. Stripe config changed between payment creation and verification")
      console.error("[v0] 3. Database has multiple Stripe configs and wrong one is being used")
      throw stripeError
    }

    if (intent.status !== "succeeded") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    const userId = intent.metadata.user_id || session?.id

    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 400 })
    }

    const userResult = await sql`SELECT id, name, email FROM users WHERE id = ${userId}`
    const user = userResult[0]

    const paymentMethod = intent.payment_method
      ? await stripe.paymentMethods.retrieve(intent.payment_method as string)
      : null

    const paymentData: any = {
      id: intent.id,
      user_name: user?.name || "Guest",
      user_email: user?.email || "",
      amount: intent.amount / 100,
      created_at: new Date(intent.created * 1000).toISOString(),
      stripe_payment_intent: intent.id,
      payment_method_brand: paymentMethod?.card?.brand || "card",
      payment_method_last4: paymentMethod?.card?.last4 || null,
      discount_code: intent.metadata.coupon_code || null,
      discount_amount: intent.metadata.discount_amount ? Number.parseFloat(intent.metadata.discount_amount) : null,
    }

    const currentYear = new Date().getFullYear()
    const eventDomain = process.env.NEXT_PUBLIC_APP_URL || "https://myschoolauction.com"

    if (type === "sponsor") {
      const requestId = intent.metadata.sponsor_request_id
      
      console.log("[v0] Sponsor payment processing - requestId:", requestId, "metadata:", intent.metadata)

      // Insert payment record
      const result = await sql`
        INSERT INTO payments (
          event_id, user_id, amount, payment_type, payment_method,
          payment_gateway, gateway_transaction_id, status, stripe_payment_intent, created_at
        )
        VALUES (
          ${eventId}, ${userId}, ${intent.amount / 100}, 'sponsor',
          'card', 'stripe', ${intent.id}, 'completed', ${intent.id}, NOW()
        )
        RETURNING id
      `
      
      console.log("[v0] Sponsor payment record inserted:", result[0].id)

      if (intent.metadata.coupon_code && intent.metadata.discount_amount) {
        await trackCouponUsage(
          intent.metadata.coupon_code,
          userId,
          eventId,
          "sponsor",
          result[0].id,
          Number.parseFloat(intent.metadata.discount_amount),
        )
      }

      console.log("[v0] Fetching sponsor request data for requestId:", requestId)

      const requestData = await sql`
        SELECT sr.*, sl.amount as level_amount, sl.name as level_name
        FROM sponsor_requests sr
        LEFT JOIN sponsor_levels sl ON sr.sponsorship_level = sl.level AND sr.event_id = sl.event_id
        WHERE sr.id = ${requestId}
      `
      
      console.log("[v0] Sponsor request query result:", requestData.length, "records found")
      
      const sponsorRequest = requestData[0]

      if (sponsorRequest) {
        console.log("[v0] Sponsor request found:", {
          company: sponsorRequest.company_name,
          level: sponsorRequest.sponsorship_level,
          requestId: sponsorRequest.id
        })
        const sponsorAmount = sponsorRequest.custom_amount || sponsorRequest.level_amount

        console.log("[v0] Inserting sponsor record:", {
          company: sponsorRequest.company_name,
          level: sponsorRequest.sponsorship_level,
          amount: sponsorAmount,
          eventId: eventId
        })

        const insertResult = await sql`
          INSERT INTO sponsors (
            name,
            logo_url,
            website_url,
            level,
            sponsorship_amount,
            description,
            contact_name,
            contact_email,
            contact_phone,
            event_id,
            created_at
          )
          VALUES (
            ${sponsorRequest.company_name},
            ${sponsorRequest.logo_url || null},
            ${sponsorRequest.website || null},
            ${sponsorRequest.sponsorship_level},
            ${sponsorAmount},
            ${sponsorRequest.additional_info || null},
            ${sponsorRequest.contact_name},
            ${sponsorRequest.contact_email},
            ${sponsorRequest.contact_phone || null},
            ${eventId},
            NOW()
          )
          RETURNING id, name, level
        `
        
        console.log("[v0] Sponsor record inserted:", insertResult[0])

        // Update sponsor request status
        await sql`
          UPDATE sponsor_requests
          SET status = 'approved',
              payment_status = 'paid',
              payment_date = NOW(),
              stripe_payment_intent_id = ${intent.id},
              updated_at = NOW()
          WHERE id = ${requestId}
        `
        
        console.log("[v0] Sponsor request status updated to approved/paid")

        const eventData = await sql`
          SELECT event_name, domain FROM events WHERE id = ${eventId} LIMIT 1
        `
        const event = eventData[0]

        if (event && sponsorRequest.contact_email) {
          try {
            const sponsorEmailData = {
              eventTitle: event.event_name || "Our Event",
              year: currentYear,
              sponsorName: sponsorRequest.company_name,
              sponsorLevel: sponsorRequest.level_name || sponsorRequest.sponsorship_level,
              sponsorAmount: sponsorAmount,
              invoiceNumber: intent.metadata.invoice_number || requestId,
              paymentDate: new Date().toLocaleDateString(),
              transactionId: intent.id,
            }

            console.log("[v0] Sending sponsor confirmation email with template: sponsor-payment-confirmation")

            // Send email using templateName (same pattern as finish-account)
            const sendResult = await sendEmail({
              to: sponsorRequest.contact_email,
              subject: `Thank you for your sponsorship of ${event.event_name}!`,
              templateName: "sponsor-payment-confirmation",
              dynamicTemplateData: sponsorEmailData,
            })

            console.log("[v0] Sponsor confirmation email send result:", sendResult)

            const emailStatus = sendResult.success ? "sent" : "failed"
            const errorMessage = !sendResult.success ? sendResult.error : null

            // Get the SendGrid template ID from email_templates
            const templateResult = await sql`
              SELECT template_id FROM email_templates 
              WHERE email_task = 'sponsor-payment-confirmation'
              AND is_active = true
              LIMIT 1
            `
            const sendgridTemplateId = templateResult[0]?.template_id || "d-sponsor-payment-confirmation"

            // Log to email_queue (same pattern as finish-account)
            await sql`
              INSERT INTO email_queue (
                template_id, subject, to_email, from_email,
                dynamic_template_data, status, error_message, created_at
              )
              VALUES (
                ${sendgridTemplateId},
                ${"Thank you for your sponsorship of " + event.event_name + "!"},
                ${sponsorRequest.contact_email},
                ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
                ${JSON.stringify(sponsorEmailData)},
                ${emailStatus},
                ${errorMessage},
                NOW()
              )
            `

            if (!sendResult.success) {
              console.warn("[v0] Sponsor confirmation email failed, but recorded in queue:", sendResult.error)
            } else {
              console.log("[v0] Sponsor confirmation email sent successfully to:", sponsorRequest.contact_email)
            }
          } catch (emailError) {
            console.error("[v0] Failed to send sponsor confirmation email:", emailError)
          }

          try {
            const admins = await sql`
              SELECT u.email, u.name 
              FROM event_admins ea
              JOIN users u ON ea.user_id = u.id
              WHERE ea.event_id = ${eventId} AND u.email IS NOT NULL
            `

            console.log("[v0] Sending admin notification emails to", admins.length, "admins")

            for (const admin of admins) {
              const adminEmailData = {
                eventTitle: event.event_name || "Your Event",
                year: currentYear,
                sponsorName: sponsorRequest.company_name,
                sponsorLevel: sponsorRequest.level_name || sponsorRequest.sponsorship_level,
                sponsorAmount: sponsorAmount,
                contactName: sponsorRequest.contact_name,
                contactEmail: sponsorRequest.contact_email,
                adminDashboardUrl: `${eventDomain}/admin/sponsors`,
                adminName: admin.name || "Admin",
              }

              // Send email using templateName
              const adminSendResult = await sendEmail({
                to: admin.email,
                subject: `Sponsorship Payment Received — ${sponsorRequest.company_name}`,
                templateName: "sponsor-payment-received",
                dynamicTemplateData: adminEmailData,
              })

              const adminEmailStatus = adminSendResult.success ? "sent" : "failed"
              const adminErrorMessage = !adminSendResult.success ? adminSendResult.error : null

              // Get template ID
              const adminTemplateResult = await sql`
                SELECT template_id FROM email_templates 
                WHERE email_task = 'sponsor-payment-received'
                AND is_active = true
                LIMIT 1
              `
              const adminTemplateId = adminTemplateResult[0]?.template_id || "d-sponsor-payment-received"

              // Log to email_queue
              await sql`
                INSERT INTO email_queue (
                  template_id, subject, to_email, from_email,
                  dynamic_template_data, status, error_message, created_at
                )
                VALUES (
                  ${adminTemplateId},
                  ${"Sponsorship Payment Received — " + sponsorRequest.company_name},
                  ${admin.email},
                  ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
                  ${JSON.stringify(adminEmailData)},
                  ${adminEmailStatus},
                  ${adminErrorMessage},
                  NOW()
                )
              `

              if (adminSendResult.success) {
                console.log("[v0] Admin notification sent to:", admin.email)
              }
            }
          } catch (adminEmailError) {
            console.error("[v0] Failed to send admin notification emails:", adminEmailError)
          }
        }

        paymentData.id = result[0].id
        paymentData.payment_type = "sponsor"
        paymentData.invoice_number = intent.metadata.invoice_number || null
        paymentData.company_name = sponsorRequest.company_name
        paymentData.level = sponsorRequest.level_name || sponsorRequest.sponsorship_level
      } else {
        console.error("[v0] Sponsor request NOT FOUND for requestId:", requestId)
        console.error("[v0] This is why the sponsor record was not inserted into the sponsors table")
      }
    } else if (type === "donation") {
      const result = await sql`
        INSERT INTO payments (
          event_id, user_id, amount, payment_type, payment_method, 
          payment_gateway, gateway_transaction_id, status, message, stripe_payment_intent, created_at
        )
        VALUES (
          ${eventId}, ${userId}, ${intent.amount / 100}, 'donation', 
          'card', 'stripe', ${intent.id}, 'completed',
          ${intent.metadata.message || null}, ${intent.id}, NOW()
        )
        RETURNING id
      `

      if (intent.metadata.coupon_code && intent.metadata.discount_amount) {
        await trackCouponUsage(
          intent.metadata.coupon_code,
          userId,
          eventId,
          "donation",
          result[0].id,
          Number.parseFloat(intent.metadata.discount_amount),
        )
      }

      paymentData.id = result[0].id
      paymentData.payment_type = "donation"
      paymentData.message = intent.metadata.message || null

      const eventData = await sql`
        SELECT event_name, domain FROM events WHERE id = ${eventId} LIMIT 1
      `
      const event = eventData[0]

      console.log("[v0] Donation completed, preparing to send thank-you email")

      if (user && user.email && event) {
        try {
          const eventDomain = event.domain
            ? `https://${event.domain}`
            : process.env.NEXT_PUBLIC_APP_URL || "https://myschoolauction.com"

          const emailData = {
            name: user.name || "Donor",
            eventTitle: event.event_name,
            year: currentYear,
            donationAmount: intent.amount / 100,
            message: intent.metadata.message || "",
            transactionId: intent.id,
            link: eventDomain,
            eventName: event.event_name, // Added for template compatibility
            amount: intent.amount / 100, // Added alternative field name
          }

          console.log("[v0] Sending donation thank-you email with template: thank-you-donation")

          const sendResult = await sendEmail({
            to: user.email,
            subject: `Thank you for your donation to ${event.event_name}`,
            templateName: "thank-you-donation",
            dynamicTemplateData: emailData,
          })

          console.log("[v0] Donation thank-you email send result:", sendResult)

          const emailStatus = sendResult.success ? "sent" : "failed"
          const errorMessage = !sendResult.success ? sendResult.error : null

          // Get the SendGrid template ID from email_templates
          const templateResult = await sql`
            SELECT template_id FROM email_templates 
            WHERE email_task = 'thank-you-donation'
            AND is_active = true
            LIMIT 1
          `
          const sendgridTemplateId = templateResult[0]?.template_id || "d-thank-you-donation"

          // Log to email_queue
          await sql`
            INSERT INTO email_queue (
              template_id, subject, to_email, from_email,
              dynamic_template_data, status, error_message, created_at
            )
            VALUES (
              ${sendgridTemplateId},
              ${"Thank you for your donation to " + event.event_name},
              ${user.email},
              ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
              ${JSON.stringify(emailData)},
              ${emailStatus},
              ${errorMessage},
              NOW()
            )
          `

          if (!sendResult.success) {
            console.warn("[v0] Donation thank-you email failed, but recorded in queue:", sendResult.error)
          } else {
            console.log("[v0] Donation thank-you email sent successfully to:", user.email)
          }
        } catch (emailError) {
          console.error("[v0] Failed to send donation thank-you email:", emailError)
        }
      }
    } else if (type === "shop_order" || type === "shop") {
      const orderIds = intent.metadata.order_ids?.split(",") || []

      const orders = await sql`
        SELECT so.id, so.quantity, so.selected_options, si.title as name, si.price, si.image_url
        FROM shop_orders so
        JOIN shop_items si ON so.shop_item_id = si.id
        WHERE so.id = ANY(${orderIds})
      `

      for (const orderId of orderIds) {
        // Update order status
        await sql`
          UPDATE shop_orders
          SET status = 'completed', updated_at = NOW()
          WHERE id = ${orderId}
        `

        // Update inventory
        const order = await sql`SELECT shop_item_id, quantity FROM shop_orders WHERE id = ${orderId}`
        if (order.length > 0) {
          await sql`
            UPDATE shop_items
            SET quantity_sold = quantity_sold + ${order[0].quantity}
            WHERE id = ${order[0].shop_item_id}
          `
        }
      }

      const result = await sql`
        INSERT INTO payments (
          event_id, user_id, amount, payment_type, payment_method,
          payment_gateway, gateway_transaction_id, status, stripe_payment_intent, created_at
        )
        VALUES (
          ${eventId}, ${userId}, ${intent.amount / 100}, 'shop', 
          'card', 'stripe', ${intent.id}, 'completed', ${intent.id}, NOW()
        )
        RETURNING id
      `

      if (intent.metadata.coupon_code && intent.metadata.discount_amount) {
        await trackCouponUsage(
          intent.metadata.coupon_code,
          userId,
          eventId,
          "shop",
          result[0].id,
          Number.parseFloat(intent.metadata.discount_amount),
        )
      }

      paymentData.id = result[0].id
      paymentData.payment_type = "shop"
      paymentData.items = orders.map((order: any) => ({
        name: order.name,
        quantity: order.quantity,
        size: order.selected_options?.size || order.selected_options?.Size || null,
        price: Number.parseFloat(order.price),
        image_url: order.image_url,
      }))

      const eventData = await sql`
        SELECT event_name, domain FROM events WHERE id = ${eventId} LIMIT 1
      `
      const event = eventData[0]

      console.log("[v0] Shop order completed, preparing to send purchase receipt email")

      if (user && user.email && event) {
        try {
          const eventDomain = event.domain
            ? `https://${event.domain}`
            : process.env.NEXT_PUBLIC_APP_URL || "https://myschoolauction.com"

          const emailData = {
            name: user.name || "Customer",
            eventTitle: event.event_name,
            year: currentYear,
            orderNumber: result[0].id,
            items: orders.map((order: any) => ({
              name: order.name,
              quantity: order.quantity,
              size: order.selected_options?.size || order.selected_options?.Size || "N/A",
              price: Number.parseFloat(order.price),
              total: Number.parseFloat(order.price) * order.quantity,
              image_url: order.image_url || null, // Include image URL for template
            })),
            totalAmount: intent.amount / 100,
            transactionId: intent.id,
            link: eventDomain,
            eventName: event.event_name, // Added for template compatibility
            purchaseDate: new Date().toLocaleDateString(), // Added purchase date
          }

          console.log("[v0] Sending shop purchase thank-you email with template: thank-you-purchase")

          const sendResult = await sendEmail({
            to: user.email,
            subject: `Thank you for your purchase from ${event.event_name}`,
            templateName: "thank-you-purchase",
            dynamicTemplateData: emailData,
          })

          console.log("[v0] Shop purchase thank-you email send result:", sendResult)

          const emailStatus = sendResult.success ? "sent" : "failed"
          const errorMessage = !sendResult.success ? sendResult.error : null

          // Get the SendGrid template ID from email_templates
          const templateResult = await sql`
            SELECT template_id FROM email_templates 
            WHERE email_task = 'thank-you-purchase'
            AND is_active = true
            LIMIT 1
          `
          const sendgridTemplateId = templateResult[0]?.template_id || "d-thank-you-purchase"

          // Log to email_queue
          await sql`
            INSERT INTO email_queue (
              template_id, subject, to_email, from_email,
              dynamic_template_data, status, error_message, created_at
            )
            VALUES (
              ${sendgridTemplateId},
              ${"Thank you for your purchase from " + event.event_name},
              ${user.email},
              ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
              ${JSON.stringify(emailData)},
              ${emailStatus},
              ${errorMessage},
              NOW()
            )
          `
        } catch (emailError) {
          console.error("[v0] Failed to send shop purchase thank-you email:", emailError)
        }
      }
    } else if (type === "ticket_purchase" || type === "ticket") {
      const purchaseIds = intent.metadata.purchase_ids?.split(",") || []

      console.log("[v0] Processing ticket purchase verification:", { purchaseIds })

      const purchases = await sql`
        SELECT tp.id, tp.quantity, et.name, et.description, tp.total_amount, tp.total_amount / tp.quantity as unit_price
        FROM ticket_purchases tp
        JOIN event_tickets et ON tp.ticket_id = et.id
        WHERE tp.id = ANY(${purchaseIds})
      `

      console.log("[v0] Found ticket purchases:", purchases.length)

      for (const purchaseId of purchaseIds) {
        // Update purchase status
        await sql`
          UPDATE ticket_purchases
          SET status = 'completed', updated_at = NOW()
          WHERE id = ${purchaseId}
        `

        // Update ticket sales
        const purchase = await sql`SELECT ticket_id, quantity FROM ticket_purchases WHERE id = ${purchaseId}`
        if (purchase.length > 0) {
          await sql`
            UPDATE event_tickets
            SET quantity_sold = quantity_sold + ${purchase[0].quantity}
            WHERE id = ${purchase[0].ticket_id}
          `

          const existingEventUser = await sql`
            SELECT id FROM event_users 
            WHERE event_id = ${eventId} AND user_id = ${userId}
          `

          if (existingEventUser.length === 0) {
            await sql`
              INSERT INTO event_users (event_id, user_id, role, created_at)
              VALUES (${eventId}, ${userId}, 'participant', NOW())
            `
          }

          const existingAttendance = await sql`
            SELECT id FROM event_attendance 
            WHERE event_id = ${eventId} AND user_id = ${userId}
          `

          if (existingAttendance.length === 0) {
            await sql`
              INSERT INTO event_attendance (event_id, user_id, status)
              VALUES (${eventId}, ${userId}, 'going')
            `
          } else {
            await sql`
              UPDATE event_attendance 
              SET status = 'going' 
              WHERE event_id = ${eventId} AND user_id = ${userId}
            `
          }
        }
      }

      const items = purchases.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: Number(p.unit_price),
        quantity: p.quantity,
        total: Number(p.total_amount),
      }))

      const result = await sql`
        INSERT INTO payments (
          event_id, user_id, amount, payment_type, payment_method, 
          payment_gateway, gateway_transaction_id, status, stripe_payment_intent, created_at
        )
        VALUES (
          ${eventId}, ${userId}, ${intent.amount / 100}, 'ticket', 
          'card', 'stripe', ${intent.id}, 'completed', ${intent.id}, NOW()
        )
        RETURNING id
      `

      if (intent.metadata.coupon_code && intent.metadata.discount_amount) {
        await trackCouponUsage(
          intent.metadata.coupon_code,
          userId,
          eventId,
          "ticket",
          result[0].id,
          Number.parseFloat(intent.metadata.discount_amount),
        )
      }

      paymentData.id = result[0].id
      paymentData.payment_type = "ticket"
      paymentData.items = items
      paymentData.tickets = items // Also add as tickets for backward compatibility

      if (user && user.email) {
        try {
          const eventData = await sql`
            SELECT event_name, domain FROM events WHERE id = ${eventId} LIMIT 1
          `
          const event = eventData[0]

          if (event) {
            const eventDomain = event.domain
              ? `https://${event.domain}`
              : process.env.NEXT_PUBLIC_APP_URL || "https://myschoolauction.com"

            const emailData = {
              name: user.name || "Guest",
              eventTitle: event.event_name,
              year: currentYear,
              link: eventDomain,
            }

            console.log("[v0] Sending ticket RSVP confirmation email")

            const sendResult = await sendEmail({
              to: user.email,
              subject: `Your tickets for ${event.event_name}`,
              templateName: "rsvp-confirmation",
              dynamicTemplateData: emailData,
            })

            console.log("[v0] Ticket RSVP email send result:", sendResult)

            const emailStatus = sendResult.success ? "sent" : "failed"
            const errorMessage = !sendResult.success ? sendResult.error : null

            // Get the SendGrid template ID
            const templateResult = await sql`
              SELECT template_id FROM email_templates 
              WHERE email_task = 'rsvp-confirmation'
              AND is_active = true
              LIMIT 1
            `
            const sendgridTemplateId = templateResult[0]?.template_id || "d-rsvp-confirmation"

            // Log to email_queue
            await sql`
              INSERT INTO email_queue (
                template_id, subject, to_email, from_email,
                dynamic_template_data, status, error_message, created_at
              )
              VALUES (
                ${sendgridTemplateId},
                ${"Your tickets for " + event.event_name},
                ${user.email},
                ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
                ${JSON.stringify(emailData)},
                ${emailStatus},
                ${errorMessage},
                NOW()
              )
            `
          }
        } catch (emailError) {
          console.error("[v0] Failed to send ticket RSVP email:", emailError)
        }
      }
    } else if (type === "invoice") {
      const invoiceId = intent.metadata.invoice_id
      const invoiceNumber = intent.metadata.invoice_number

      console.log("[v0] Processing invoice payment verification:", { invoiceId, invoiceNumber })

      // Check if a payment record already exists for this invoice
      const existingPayment = await sql`
        SELECT id, status FROM payments
        WHERE event_id = ${eventId}
          AND user_id = ${userId}
          AND payment_type = 'invoice'
          AND status = 'pending'
        ORDER BY created_at DESC
        LIMIT 1
      `

      let paymentId: string

      if (existingPayment.length > 0) {
        // Update existing pending payment
        console.log("[v0] Updating existing pending payment:", existingPayment[0].id)
        await sql`
          UPDATE payments
          SET status = 'completed',
              stripe_payment_intent = ${intent.id},
              gateway_transaction_id = ${intent.id},
              payment_method = 'card',
              payment_gateway = 'stripe',
              updated_at = NOW()
          WHERE id = ${existingPayment[0].id}
        `
        paymentId = existingPayment[0].id
        console.log("[v0] Updated existing payment record:", paymentId)
      } else {
        // Create new payment record
        const result = await sql`
          INSERT INTO payments (
            event_id, user_id, amount, payment_type, payment_method,
            payment_gateway, gateway_transaction_id, status, stripe_payment_intent, created_at
          )
          VALUES (
            ${eventId}, ${userId}, ${intent.amount / 100}, 'invoice',
            'card', 'stripe', ${intent.id}, 'completed', ${intent.id}, NOW()
          )
          RETURNING id
        `
        paymentId = result[0].id
        console.log("[v0] Created new payment record:", paymentId)
      }

      // Get invoice items from po_requests_item table
      const items = await sql`
        SELECT 
          item_type,
          item_id,
          item_name,
          item_description,
          quantity,
          unit_price,
          total_amount,
          metadata
        FROM po_requests_item
        WHERE po_request_id = ${invoiceId}
        ORDER BY item_name
      `

      console.log("[v0] Found invoice items from po_requests_item:", items.length)

      // Check if payment_items already exist for this payment
      const existingItems = await sql`
        SELECT id FROM payment_items WHERE payment_id = ${paymentId}
      `

      // Only create payment_items if they don't exist
      if (items.length > 0 && existingItems.length === 0) {
        for (const item of items) {
          await sql`
            INSERT INTO payment_items (
              payment_id,
              item_type,
              item_id,
              item_name,
              quantity,
              unit_price,
              total_amount,
              metadata,
              created_at,
              updated_at
            )
            VALUES (
              ${paymentId},
              ${item.item_type},
              ${item.item_id},
              ${item.item_name},
              ${item.quantity},
              ${item.unit_price},
              ${item.total_amount},
              ${item.metadata},
              NOW(),
              NOW()
            )
          `
        }
        console.log("[v0] Created", items.length, "payment_items for payment record")
      } else if (existingItems.length > 0) {
        console.log("[v0] Payment items already exist, skipping creation")
      }

      // Update po_requests with payment_id and status
      await sql`
        UPDATE po_requests
        SET payment_id = ${paymentId},
            status = 'paid',
            updated_at = NOW()
        WHERE id = ${invoiceId}
      `

      console.log("[v0] Updated po_request with payment_id and status 'paid'")

      paymentData.id = paymentId
      paymentData.payment_type = "invoice"
      paymentData.invoice_number = invoiceNumber
      paymentData.invoice_id = invoiceId
      paymentData.items = items.map((item: any) => ({
        name: item.item_name,
        quantity: item.quantity,
        price: Number(item.unit_price),
        total: Number(item.total_amount),
      }))

      // Send confirmation email
      if (user && user.email) {
        try {
          const eventData = await sql`
            SELECT event_name, domain FROM events WHERE id = ${eventId} LIMIT 1
          `
          const event = eventData[0]

          if (event) {
            const eventDomain = event.domain
              ? `https://${event.domain}`
              : process.env.NEXT_PUBLIC_APP_URL || "https://myschoolauction.com"

            const amountPaid = intent.amount / 100
            const paymentMethod = intent.payment_method_types?.[0] || "card"
            
            const emailData = {
              payerName: user.name || "Customer",
              name: user.name || "Customer",
              eventTitle: event.event_name,
              year: currentYear,
              invoiceNumber: invoiceNumber,
              amountPaid: `$${amountPaid.toFixed(2)}`,
              totalAmount: amountPaid,
              paymentMethod: paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1),
              paymentDate: new Date().toLocaleDateString(),
              transactionId: intent.id,
              link: eventDomain,
              eventName: event.event_name,
              invoiceDownloadUrl: `${eventDomain}/invoice/${invoiceId}`,
              supportEmail: process.env.SENDGRID_FROM_EMAIL || "support@myschoolauction.com",
              organizationName: event.event_name,
            }

            console.log("[v0] Sending invoice payment confirmation email")

            const sendResult = await sendEmail({
              to: user.email,
              subject: `Payment received for ${invoiceNumber} - ${event.event_name}`,
              templateName: "invoice-payment-confirmation",
              dynamicTemplateData: emailData,
            })

            console.log("[v0] Invoice payment email send result:", sendResult)

            const emailStatus = sendResult.success ? "sent" : "failed"
            const errorMessage = !sendResult.success ? sendResult.error : null

            const templateResult = await sql`
              SELECT template_id FROM email_templates 
              WHERE email_task = 'invoice-payment-confirmation'
              AND is_active = true
              LIMIT 1
            `
            const sendgridTemplateId = templateResult[0]?.template_id || "d-invoice-payment-confirmation"

            await sql`
              INSERT INTO email_queue (
                template_id, subject, to_email, from_email,
                dynamic_template_data, status, error_message, created_at
              )
              VALUES (
                ${sendgridTemplateId},
                ${"Payment received for " + invoiceNumber + " - " + event.event_name},
                ${user.email},
                ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
                ${JSON.stringify(emailData)},
                ${emailStatus},
                ${errorMessage},
                NOW()
              )
            `
          }
        } catch (emailError) {
          console.error("[v0] Failed to send invoice payment confirmation email:", emailError)
        }
      }
    }

    return NextResponse.json({ status: "success", payment: paymentData })
  } catch (error) {
    console.error("[v0] Payment verification error:", error)
    console.error("[v0] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: type,
      eventId: eventId,
      paymentIntent: paymentIntentId,
    })
    return NextResponse.json(
      {
        error: "Payment verification failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
