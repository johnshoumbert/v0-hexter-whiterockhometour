import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getSession } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    // Check admin authentication
    const session = await getSession()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    const sql = getDb()

    // Build query with filters
    let query = sql`
      SELECT 
        id,
        template_id,
        subject,
        to_email,
        from_email,
        status,
        sendgrid_message_id,
        error_message,
        processed_at,
        created_at
      FROM email_queue
      WHERE 1=1
    `

    // Add search filter
    if (search) {
      query = sql`
        SELECT 
          id,
          template_id,
          subject,
          to_email,
          from_email,
          status,
          sendgrid_message_id,
          error_message,
          processed_at,
          created_at
        FROM email_queue
        WHERE to_email ILIKE ${"%" + search + "%"}
      `
    }

    // Add status filter
    if (status) {
      query = sql`
        SELECT 
          id,
          template_id,
          subject,
          to_email,
          from_email,
          status,
          sendgrid_message_id,
          error_message,
          processed_at,
          created_at
        FROM email_queue
        WHERE status = ${status}
        ${search ? sql`AND to_email ILIKE ${"%" + search + "%"}` : sql``}
      `
    }

    const emails = await sql`
      SELECT 
        id,
        template_id,
        subject,
        to_email,
        from_email,
        status,
        sendgrid_message_id,
        error_message,
        processed_at,
        created_at
      FROM email_queue
      ${search ? sql`WHERE to_email ILIKE ${"%" + search + "%"}` : sql``}
      ${status ? sql`${search ? sql`AND` : sql`WHERE`} status = ${status}` : sql``}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM email_queue
      ${search ? sql`WHERE to_email ILIKE ${"%" + search + "%"}` : sql``}
      ${status ? sql`${search ? sql`AND` : sql`WHERE`} status = ${status}` : sql``}
    `

    const total = Number.parseInt(countResult[0]?.total || "0")

    return NextResponse.json({
      emails,
      total,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error("[v0] Error fetching email logs:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
