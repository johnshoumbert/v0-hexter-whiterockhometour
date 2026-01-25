import { type NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/email"
import { Html, Head, Body, Container, Heading, Text, Hr } from "@react-email/components"

function TestEmailTemplate() {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f4f4f4" }}>
        <Container style={{ backgroundColor: "white", padding: "20px", borderRadius: "5px", margin: "40px auto" }}>
          <Heading style={{ color: "#333" }}>Email Test Successful!</Heading>
          <Text style={{ fontSize: "16px", color: "#666" }}>
            This is a test email from MySchoolAuction. If you received this, the email service is working correctly.
          </Text>
          <Hr style={{ borderColor: "#e0e0e0", margin: "20px 0" }} />
          <Text style={{ fontSize: "14px", color: "#999" }}>Sent from MySchoolAuction Email Service</Text>
        </Container>
      </Body>
    </Html>
  )
}

export async function GET(request: NextRequest) {
  console.log("[v0] Test email endpoint called")

  try {
    console.log("[v0] Sending test email to john.shoumbert@gmail.com")
    const result = await sendEmail({
      to: "john.shoumbert@gmail.com",
      subject: "MySchoolAuction - Test Email",
      react: <TestEmailTemplate />,
    })

    console.log("[v0] Test email result:", result)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: "Email service not configured or failed to send",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Test email sent successfully to john.shoumbert@gmail.com",
      data: result.data,
    })
  } catch (error) {
    console.error("[v0] Error sending test email:", error)
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 },
    )
  }
}
