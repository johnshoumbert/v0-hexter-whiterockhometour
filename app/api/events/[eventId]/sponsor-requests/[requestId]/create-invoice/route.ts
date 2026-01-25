import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getSession } from "@/lib/session"

const sql = neon(process.env.NEON_DATABASE_URL!)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; requestId: string }> },
) {
  try {
    const session = await getSession()
    const { eventId, requestId } = await params

    console.log("[v0] Create invoice for sponsor request:", { eventId, requestId })

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check admin permissions
    if (!session.is_admin) {
      const isEventAdmin = await sql`
        SELECT 1 FROM event_users 
        WHERE event_id = ${eventId} AND user_id = ${session.userId} AND role = 'admin'
      `

      if (!isEventAdmin || isEventAdmin.length === 0) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const body = await request.json()
    const { contactName, contactEmail, companyName, amount, sponsorshipLevel } = body

    // Fetch the sponsor request to get user_id and custom_amount
    const sponsorRequest = await sql`
      SELECT user_id, contact_name, contact_email, company_name, custom_amount, sponsorship_level
      FROM sponsor_requests
      WHERE id = ${requestId} AND event_id = ${eventId}
    `

    if (sponsorRequest.length === 0) {
      return NextResponse.json({ error: "Sponsor request not found" }, { status: 404 })
    }

    const userId = sponsorRequest[0].user_id
    const finalContactName = contactName || sponsorRequest[0].contact_name
    const finalContactEmail = contactEmail || sponsorRequest[0].contact_email
    const finalSponsorshipLevel = sponsorshipLevel || sponsorRequest[0].sponsorship_level
    const finalCompanyName = companyName || sponsorRequest[0].company_name
    
    // Get amount from custom_amount, or fetch from sponsor level pricing
    let finalAmount = amount || sponsorRequest[0].custom_amount

    // If still no amount, fetch from sponsor_levels table
    if (!finalAmount || finalAmount <= 0) {
      const levelPricing = await sql`
        SELECT amount FROM sponsor_levels
        WHERE event_id = ${eventId} AND level = ${finalSponsorshipLevel}
      `
      
      if (levelPricing.length > 0 && levelPricing[0].amount) {
        finalAmount = Number(levelPricing[0].amount)
      }
    }

    console.log("[v0] Invoice details:", { 
      userId, 
      finalAmount, 
      finalContactName, 
      finalContactEmail,
      finalSponsorshipLevel 
    })

    if (!finalAmount || finalAmount <= 0) {
      return NextResponse.json({ 
        error: "Invalid amount: Amount must be greater than 0. Please set a custom amount or ensure the sponsorship level has a price set." 
      }, { status: 400 })
    }

    // Check if an invoice already exists for this sponsor request
    const existingInvoice = await sql`
      SELECT pr.id, pr.invoice_number, pr.status
      FROM po_requests pr
      WHERE pr.event_id = ${eventId}
        AND pr.item_description LIKE ${'%' + requestId + '%'}
      ORDER BY pr.created_at DESC
      LIMIT 1
    `

    if (existingInvoice.length > 0) {
      console.log("[v0] Found existing invoice:", existingInvoice[0])
      return NextResponse.json({ 
        invoiceId: existingInvoice[0].id,
        invoiceNumber: existingInvoice[0].invoice_number,
        status: existingInvoice[0].status,
        alreadyExists: true
      })
    }

    // Generate unique invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`

    // Set due date to 30 days from now
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)

    // Create invoice in po_requests table
    // Note: sponsor_id references the sponsors table (approved sponsors), not sponsor_requests
    // Store sponsor request ID in item_description for tracking
    const invoice = await sql`
      INSERT INTO po_requests (
        event_id,
        invoice_number,
        status,
        total_amount,
        unit_price,
        email,
        name,
        user_id,
        due_date,
        item_description,
        created_at,
        updated_at
      )
      VALUES (
        ${eventId},
        ${invoiceNumber},
        'pending',
        ${finalAmount},
        ${finalAmount},
        ${finalContactEmail},
        ${finalContactName},
        ${userId},
        ${dueDate.toISOString()},
        'Sponsor Request: ' || ${requestId},
        NOW(),
        NOW()
      )
      RETURNING id, invoice_number
    `

    if (invoice.length === 0) {
      throw new Error("Failed to create invoice")
    }

    const invoiceId = invoice[0].id

    // Create invoice item for the sponsorship
    await sql`
      INSERT INTO po_requests_item (
        po_request_id,
        item_type,
        item_id,
        item_name,
        quantity,
        unit_price,
        total_amount,
        created_at,
        updated_at
      )
      VALUES (
        ${invoiceId},
        'sponsor',
        ${requestId},
        ${finalCompanyName || 'Company'} || ' - ' || ${finalSponsorshipLevel || 'Sponsorship'} || ' Sponsorship',
        1,
        ${finalAmount},
        ${finalAmount},
        NOW(),
        NOW()
      )
    `

    console.log("[v0] Invoice created successfully:", { invoiceId, invoiceNumber })

    return NextResponse.json({
      success: true,
      invoiceId,
      invoiceNumber,
      message: "Invoice created successfully",
    })
  } catch (error: any) {
    console.error("[v0] Error creating invoice for sponsor request:", error)
    return NextResponse.json(
      { error: "Failed to create invoice", details: error.message },
      { status: 500 },
    )
  }
}
