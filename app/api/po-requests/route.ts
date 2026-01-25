import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

// Generate invoice number
function generateInvoiceNumber() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")
  return `INV-${year}${month}-${random}`
}

export async function POST(request: NextRequest) {
  try {
    const sql = getDb()

    const body = await request.json()
    const { userId, discountCode } = body

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log("[v0] Creating PO request for user:", userId)

    // Get user details to verify user exists
    const users = await sql`
      SELECT id, email, name FROM users WHERE id = ${userId}
    `

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const user = users[0]

    let discountAmount = 0
    let discountCodeId = null

    if (discountCode) {
      const codeResult = await sql`
        SELECT id, code, discount_amount, is_redeemed
        FROM discount_codes
        WHERE code = ${discountCode.toUpperCase()}
      `

      if (codeResult.length === 0) {
        return NextResponse.json({ error: "Invalid discount code" }, { status: 400 })
      }

      const code = codeResult[0]

      if (code.is_redeemed) {
        return NextResponse.json({ error: "This discount code has already been redeemed" }, { status: 400 })
      }

      discountAmount = Number(code.discount_amount)
      discountCodeId = code.id

      // Mark the discount code as redeemed
      await sql`
        UPDATE discount_codes
        SET is_redeemed = TRUE,
            redeemed_at = CURRENT_TIMESTAMP,
            redeemed_by = ${user.email}
        WHERE id = ${discountCodeId}
      `
    }

    const unitPrice = 500.0
    const totalAmount = unitPrice - discountAmount

    // Generate invoice number and dates
    const invoiceNumber = generateInvoiceNumber()
    const invoiceDate = new Date()
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 14) // 14 days from now

    const result = await sql`
      INSERT INTO po_requests (
        user_id, invoice_number, invoice_date, due_date,
        item_description, quantity, unit_price, discount, total_amount, payment_terms, discount_code
      ) VALUES (
        ${userId},
        ${invoiceNumber},
        ${invoiceDate},
        ${dueDate},
        ${"Software License - MySchoolAuction app"},
        ${1},
        ${unitPrice},
        ${discountAmount},
        ${totalAmount},
        ${"1 Payment"},
        ${discountCode || null}
      )
      RETURNING id
    `

    const poRequestId = result[0].id

    console.log("[v0] PO request created:", poRequestId)

    return NextResponse.json({
      success: true,
      id: poRequestId,
      invoiceNumber,
      total: totalAmount,
      discount: discountAmount,
    })
  } catch (error: any) {
    console.error("[v0] Error creating PO request:", error)

    if (error.code === "42P01") {
      return NextResponse.json(
        {
          error: "Database tables not initialized. Please run the SQL scripts from the scripts folder.",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ error: "Failed to create PO request" }, { status: 500 })
  }
}
