import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { sendEmail } from "@/lib/email"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string; requestId: string }> }) {
  try {
    const { eventId, requestId } = await params
    console.log("[v0] Verifying sponsor payment for eventId:", eventId, "requestId:", requestId)
    
    const { payment_intent_id } = await request.json()
    console.log("[v0] Payment intent ID:", payment_intent_id)

    console.log("[v0] Retrieving payment intent from Stripe...")
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id)
    console.log("[v0] Payment intent retrieved, status:", paymentIntent.status, "amount:", paymentIntent.amount)

    if (paymentIntent.status !== "succeeded") {
      console.error("[v0] Payment intent not succeeded, status:", paymentIntent.status)
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    console.log("[v0] Fetching sponsor request from database...")
    const requestData = await sql`
      SELECT sr.*, sl.amount as level_amount
      FROM sponsor_requests sr
      LEFT JOIN sponsor_levels sl ON sl.event_id = sr.event_id AND sl.level = sr.sponsorship_level
      WHERE sr.id = ${requestId} AND sr.event_id = ${eventId}
      LIMIT 1
    `
    console.log("[v0] Sponsor request query returned:", requestData.length, "results")

    if (requestData.length === 0) {
      console.error("[v0] Sponsor request not found in database")
      return NextResponse.json({ error: "Sponsor request not found" }, { status: 404 })
    }

    const sponsorRequest = requestData[0]
    const amount = sponsorRequest.custom_amount || sponsorRequest.level_amount
    console.log("[v0] Sponsor request data:", {
      company: sponsorRequest.company_name,
      level: sponsorRequest.sponsorship_level,
      amount: amount
    })

    console.log("[v0] Creating sponsor record in database...")
    const sponsorResult = await sql`
      INSERT INTO sponsors (
        event_id, name, logo_url, website_url, level, 
        sponsorship_amount, description, contact_name, 
        contact_email, contact_phone
      ) VALUES (
        ${eventId},
        ${sponsorRequest.company_name},
        ${sponsorRequest.logo_url || null},
        ${sponsorRequest.company_website || null},
        ${sponsorRequest.sponsorship_level},
        ${amount},
        ${sponsorRequest.notes || null},
        ${sponsorRequest.contact_name},
        ${sponsorRequest.contact_email},
        ${sponsorRequest.contact_phone || null}
      )
      RETURNING *
    `
    console.log("[v0] Sponsor created with ID:", sponsorResult[0]?.id)

    console.log("[v0] Updating sponsor request status...")
    await sql`
      UPDATE sponsor_requests
      SET status = 'approved',
          payment_status = 'completed',
          payment_date = CURRENT_TIMESTAMP,
          stripe_payment_intent_id = ${payment_intent_id},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${requestId}
    `
    console.log("[v0] Sponsor request status updated to approved/completed")

    const eventData = await sql`SELECT event_name FROM events WHERE id = ${eventId} LIMIT 1`
    const event = eventData[0]

    try {
      await sendEmail({
        to: sponsorRequest.contact_email,
        subject: `Sponsorship Payment Confirmed - ${event?.event_name}`,
        templateId: process.env.SENDGRID_PAYMENT_RECEIPT_TEMPLATE_ID || "",
        dynamicTemplateData: {
          eventTitle: event?.event_name,
          companyName: sponsorRequest.company_name,
          sponsorshipLevel: sponsorRequest.sponsorship_level,
          amount: amount,
          transactionId: payment_intent_id,
          date: new Date().toLocaleDateString(),
        },
      })
    } catch (emailError) {
      console.error("[v0] Failed to send confirmation email:", emailError)
    }

    return NextResponse.json({
      success: true,
      sponsor: sponsorResult[0],
      receipt: {
        company_name: sponsorRequest.company_name,
        sponsorship_level: sponsorRequest.sponsorship_level,
        amount: amount,
        transaction_id: payment_intent_id,
        date: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[v0] Error verifying sponsor payment:", error)
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 })
  }
}
