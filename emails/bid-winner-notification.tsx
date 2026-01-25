interface BidWinnerNotificationProps {
  name: string
  auctionTitle: string
  amount: number
  eventName: string
}

export default function BidWinnerNotification({ name, auctionTitle, amount, eventName }: BidWinnerNotificationProps) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ color: "#2563eb" }}>Congratulations, {name}!</h1>
      <p>
        You won the auction for <strong>{auctionTitle}</strong>!
      </p>
      <div
        style={{
          backgroundColor: "#f3f4f6",
          padding: "20px",
          borderRadius: "8px",
          margin: "20px 0",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Payment Confirmation</h2>
        <p>
          <strong>Amount Charged:</strong> ${amount.toFixed(2)}
        </p>
        <p>
          <strong>Event:</strong> {eventName}
        </p>
      </div>
      <p>Your payment has been processed successfully. Thank you for supporting our event!</p>
      <p style={{ color: "#6b7280", fontSize: "14px" }}>
        Please check your email for pickup/delivery instructions, or contact the event organizers for more information.
      </p>
    </div>
  )
}
