interface MessageNotificationEmailProps {
  senderName: string
  receiverName: string
  content: string
}

export default function MessageNotificationEmail({ senderName, receiverName, content }: MessageNotificationEmailProps) {
  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ color: "#0070f3", marginBottom: "20px" }}>New Message from {senderName}</h1>

      <div style={{ backgroundColor: "#f5f5f5", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
        <p style={{ color: "#666", fontSize: "14px", marginBottom: "10px" }}>
          <strong>To:</strong> {receiverName}
        </p>
        <p style={{ color: "#666", fontSize: "14px", marginBottom: "20px" }}>
          <strong>From:</strong> {senderName}
        </p>

        <div
          style={{
            backgroundColor: "white",
            padding: "15px",
            borderRadius: "6px",
            borderLeft: "4px solid #0070f3",
          }}
        >
          <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: "1.6" }}>{content}</p>
        </div>
      </div>

      <p style={{ color: "#999", fontSize: "12px", textAlign: "center" }}>
        This is an automated notification from MySchoolAuction. Please log in to reply to this message.
      </p>
    </div>
  )
}
