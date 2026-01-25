import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    console.log("[v0] Checking email queue status...")

    // Check pending emails
    const pendingEmails = await sql`
      SELECT 
        id, 
        to_email, 
        subject, 
        template_id,
        status,
        created_at,
        error_message
      FROM email_queue 
      WHERE status = 'pending'
      ORDER BY created_at ASC 
      LIMIT 10
    `

    // Check recent emails
    const recentEmails = await sql`
      SELECT 
        id,
        to_email,
        subject,
        status,
        created_at,
        processed_at,
        error_message
      FROM email_queue 
      ORDER BY created_at DESC 
      LIMIT 20
    `

    // Check email templates
    const templates = await sql`
      SELECT 
        email_task,
        template_id,
        is_active
      FROM email_templates
      ORDER BY email_task
    `

    return NextResponse.json({
      pendingCount: pendingEmails.length,
      pendingEmails,
      recentEmails,
      templates,
      cronUrl: "/api/cron/process-emails",
      note: "Call the cron endpoint to process pending emails",
    })
  } catch (error) {
    console.error("[v0] Error checking email queue:", error)
    return NextResponse.json(
      {
        error: "Failed to check email queue",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
