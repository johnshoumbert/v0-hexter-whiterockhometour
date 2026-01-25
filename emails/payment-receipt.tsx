import { Html, Head, Body, Container, Heading, Text, Hr, Section, Row, Column } from "@react-email/components"

interface PaymentReceiptProps {
  customerName: string
  customerEmail: string
  paymentType: string
  itemName: string
  amount: number
  paymentDate: string
  paymentId: string
  eventName: string
}

export default function PaymentReceipt({
  customerName,
  customerEmail,
  paymentType,
  itemName,
  amount,
  paymentDate,
  paymentId,
  eventName,
}: PaymentReceiptProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f4f4f4", padding: "20px" }}>
        <Container
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            padding: "30px",
            borderRadius: "8px",
          }}
        >
          <Heading style={{ color: "#333", fontSize: "28px", marginBottom: "10px", textAlign: "center" }}>
            Payment Receipt
          </Heading>
          <Text style={{ fontSize: "14px", color: "#666", textAlign: "center", marginBottom: "30px" }}>
            Thank you for your payment!
          </Text>

          <Hr style={{ borderColor: "#e0e0e0", margin: "20px 0" }} />

          <Section style={{ marginBottom: "20px" }}>
            <Text style={{ fontSize: "16px", marginBottom: "15px", color: "#333" }}>
              <strong>Event:</strong> {eventName}
            </Text>
            <Text style={{ fontSize: "16px", marginBottom: "15px", color: "#333" }}>
              <strong>Customer:</strong> {customerName}
            </Text>
            <Text style={{ fontSize: "16px", marginBottom: "15px", color: "#333" }}>
              <strong>Email:</strong> {customerEmail}
            </Text>
            <Text style={{ fontSize: "16px", marginBottom: "15px", color: "#333" }}>
              <strong>Date:</strong> {paymentDate}
            </Text>
          </Section>

          <Hr style={{ borderColor: "#e0e0e0", margin: "20px 0" }} />

          <Section style={{ marginBottom: "20px" }}>
            <Heading style={{ fontSize: "18px", color: "#333", marginBottom: "15px" }}>Payment Details</Heading>
            <Row style={{ marginBottom: "10px" }}>
              <Column style={{ width: "70%" }}>
                <Text style={{ fontSize: "14px", color: "#666", margin: 0 }}>Type:</Text>
              </Column>
              <Column style={{ width: "30%", textAlign: "right" }}>
                <Text style={{ fontSize: "14px", color: "#333", margin: 0, textTransform: "capitalize" }}>
                  {paymentType}
                </Text>
              </Column>
            </Row>
            <Row style={{ marginBottom: "10px" }}>
              <Column style={{ width: "70%" }}>
                <Text style={{ fontSize: "14px", color: "#666", margin: 0 }}>Item:</Text>
              </Column>
              <Column style={{ width: "30%", textAlign: "right" }}>
                <Text style={{ fontSize: "14px", color: "#333", margin: 0 }}>{itemName}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={{ borderColor: "#e0e0e0", margin: "20px 0" }} />

          <Row style={{ marginTop: "20px" }}>
            <Column style={{ width: "70%" }}>
              <Text style={{ fontSize: "20px", fontWeight: "bold", color: "#333", margin: 0 }}>Total Amount:</Text>
            </Column>
            <Column style={{ width: "30%", textAlign: "right" }}>
              <Text style={{ fontSize: "24px", fontWeight: "bold", color: "#10b981", margin: 0 }}>
                ${amount.toFixed(2)}
              </Text>
            </Column>
          </Row>

          <Hr style={{ borderColor: "#e0e0e0", margin: "30px 0" }} />

          <Section>
            <Text style={{ fontSize: "12px", color: "#999", marginBottom: "5px" }}>Receipt ID: {paymentId}</Text>
            <Text style={{ fontSize: "12px", color: "#999" }}>
              Keep this receipt for your records. If you have any questions, please contact us.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
