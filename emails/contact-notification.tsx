import { Html, Head, Body, Container, Heading, Text, Hr } from "@react-email/components"

interface ContactNotificationProps {
  name: string
  email: string
  subject: string
  message: string
}

export default function ContactNotification({ name, email, subject, message }: ContactNotificationProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f4f4f4", padding: "20px" }}>
        <Container
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            padding: "20px",
            borderRadius: "8px",
          }}
        >
          <Heading style={{ color: "#333", fontSize: "24px", marginBottom: "20px" }}>
            New Contact Form Submission
          </Heading>
          <Hr style={{ borderColor: "#e0e0e0", margin: "20px 0" }} />
          <Text style={{ fontSize: "16px", marginBottom: "12px" }}>
            <strong>From:</strong> {name}
          </Text>
          <Text style={{ fontSize: "16px", marginBottom: "12px" }}>
            <strong>Email:</strong> {email}
          </Text>
          <Text style={{ fontSize: "16px", marginBottom: "12px" }}>
            <strong>Subject:</strong> {subject}
          </Text>
          <Hr style={{ borderColor: "#e0e0e0", margin: "20px 0" }} />
          <Text style={{ fontSize: "16px", marginBottom: "8px" }}>
            <strong>Message:</strong>
          </Text>
          <Text
            style={{
              fontSize: "14px",
              whiteSpace: "pre-wrap",
              backgroundColor: "#f5f5f5",
              padding: "15px",
              borderRadius: "4px",
            }}
          >
            {message}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
