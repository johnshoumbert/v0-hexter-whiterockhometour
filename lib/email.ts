import type React from "react"
import { sql } from "./db"

export interface SendEmailParams {
  to: string | string[]
  subject: string
  html?: string
  react?: React.ReactElement
  from?: string
  templateId?: string
  templateName?: string
  dynamicTemplateData?: Record<string, any>
}

export async function sendEmail({
  to,
  subject,
  html,
  react,
  from,
  templateId,
  templateName,
  dynamicTemplateData,
}: SendEmailParams) {
  console.log("[v0] sendEmail called with:", { to, subject, templateName, templateId })

  if (!process.env.SENDGRID_API_KEY) {
    console.warn("[v0] SendGrid API key not configured")
    return { success: false, error: "Email service not configured" }
  }

  try {
    const fromEmail = from || process.env.SENDGRID_FROM_EMAIL || "noreply@myschoolauction.com"

    let finalTemplateId = templateId

    if (templateName && !templateId) {
      console.log("[v0] Fetching template for:", templateName)
      const result = await sql`
        SELECT template_id FROM email_templates 
        WHERE email_task = ${templateName} 
        AND is_active = true
        LIMIT 1
      `

      if (result.length > 0) {
        finalTemplateId = result[0].template_id
        console.log("[v0] Found template ID:", finalTemplateId)
      } else {
        console.error("[v0] Template not found:", templateName)
        return { success: false, error: `Template "${templateName}" not found` }
      }
    }

    if (!finalTemplateId && !html) {
      console.error("[v0] No template ID or HTML provided")
      return { success: false, error: "Either templateId or html must be provided" }
    }

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: Array.isArray(to) ? to.map((email) => ({ email })) : [{ email: to }],
            ...(finalTemplateId && dynamicTemplateData ? { dynamic_template_data: dynamicTemplateData } : {}),
          },
        ],
        from: { email: fromEmail },
        ...(finalTemplateId
          ? { template_id: finalTemplateId }
          : { subject, content: [{ type: "text/html", value: html }] }),
        tracking_settings: {
          click_tracking: {
            enable: false,
            enable_text: false,
          },
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] SendGrid error:", errorText)
      return { success: false, error: `SendGrid error: ${errorText}` }
    }

    console.log("[v0] Email sent successfully")
    return { success: true, data: { status: 202 } }
  } catch (error) {
    console.error("[v0] Error sending email:", error)
    return { success: false, error: String(error) }
  }
}
