import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/db"

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = getDb()
    const body = await request.json()
    const { email_task, template_id, subject, description, is_active } = body

    await sql`
      UPDATE email_templates
      SET 
        template_id = ${template_id},
        subject = ${subject},
        description = ${description},
        is_active = ${is_active},
        updated_at = NOW()
      WHERE email_task = ${email_task}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating email template:", error)
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 })
  }
}
