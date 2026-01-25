import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const sql = getDb()

    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ valid: false, message: "No code provided" })
    }

    // Check if code exists and is not redeemed
    const result = await sql`
      SELECT id, code, discount_amount, is_redeemed
      FROM discount_codes
      WHERE code = ${code.toUpperCase()}
    `

    if (result.length === 0) {
      return NextResponse.json({ valid: false, message: "Invalid discount code" })
    }

    const discountCode = result[0]

    if (discountCode.is_redeemed) {
      return NextResponse.json({ valid: false, message: "This discount code has already been redeemed" })
    }

    return NextResponse.json({
      valid: true,
      discount: Number(discountCode.discount_amount),
      message: "Valid discount code",
    })
  } catch (error) {
    console.error("[v0] Error validating discount code:", error)
    return NextResponse.json({ valid: false, message: "Error validating code" }, { status: 500 })
  }
}
