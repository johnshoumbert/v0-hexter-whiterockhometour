import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

// Generic email sending endpoint that uses the email_templates table
export async function POST(request: Request) {
  try {
    const { emailTask, to, dynamicData } = await request.json()

    if (!emailTask || !to) {
      return NextResponse.json({ error: "emailTask and to are required" }, { status: 400 })
    }

    const sql = getDb()

    // Fetch the template configuration from the database
    const templates = await sql`
      SELECT 
        template_id, 
        subject, 
        required_fields, 
        optional_fields,
        is_active
      FROM email_templates
      WHERE email_task = ${emailTask}
      AND is_active = true
    `

    if (templates.length === 0) {
      return NextResponse.json({ error: `Email template not found for task: ${emailTask}` }, { status: 404 })
    }

    const template = templates[0]
    const requiredFields = template.required_fields || []
    const optionalFields = template.optional_fields || []

    // Validate that all required fields are present in dynamicData
    const missingFields = requiredFields.filter((field: string) => !dynamicData || !(field in dynamicData))

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          missingFields,
          requiredFields,
        },
        { status: 400 },
      )
    }

    // Build the final dynamic template data with only provided fields
    const finalDynamicData: Record<string, any> = {}

    // Add all required fields
    requiredFields.forEach((field: string) => {
      finalDynamicData[field] = dynamicData[field]
    })

    // Add optional fields if they're provided
    optionalFields.forEach((field: string) => {
      if (dynamicData && field in dynamicData) {
        finalDynamicData[field] = dynamicData[field]
      }
    })

    // Add default brand values if not provided
    if (!finalDynamicData.brand) {
      finalDynamicData.brand = "MySchoolAuction"
    }
    if (!finalDynamicData.color) {
      finalDynamicData.color = "#0ea5e9"
    }

    // Queue the email
    await sql`
      INSERT INTO email_queue (
        template_id, 
        subject, 
        to_email, 
        from_email,
        dynamic_template_data, 
        status
      )
      VALUES (
        ${template.template_id},
        ${template.subject},
        ${to},
        ${process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"},
        ${JSON.stringify(finalDynamicData)}::jsonb,
        'pending'
      )
    `

    return NextResponse.json({
      success: true,
      message: "Email queued successfully",
      templateId: template.template_id,
      data: finalDynamicData,
    })
  } catch (error: any) {
    console.error("[v0] Error queuing email:", error)
    return NextResponse.json({ error: error.message || "Failed to queue email" }, { status: 500 })
  }
}

// GET endpoint to list all available email templates
export async function GET() {
  try {
    const sql = getDb()

    const templates = await sql`
      SELECT 
        email_task,
        template_id,
        subject,
        description,
        required_fields,
        optional_fields,
        example_data,
        is_active
      FROM email_templates
      ORDER BY email_task
    `

    return NextResponse.json({ templates })
  } catch (error: any) {
    console.error("[v0] Error fetching email templates:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch templates" }, { status: 500 })
  }
}
