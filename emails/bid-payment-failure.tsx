interface BidPaymentFailureProps {
  name: string
  auctionTitle: string
  amount: number
  eventName: string
  reason?: string
}

export default function BidPaymentFailure({ name, auctionTitle, amount, eventName, reason }: BidPaymentFailureProps) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ color: "#dc2626" }}>Payment Required</h1>
      <p>Hello {name},</p>
      <p>
        You won the auction for <strong>{auctionTitle}</strong>, but we were unable to process your payment.
      </p>
      <div
        style={{
          backgroundColor: "#fef2f2",
          border: "1px solid #fecaca",
          padding: "20px",
          borderRadius: "8px",
          margin: "20px 0",
        }}
      >
        <h2 style={{ marginTop: 0, color: "#dc2626" }}>Payment Details</h2>
        <p>
          <strong>Amount Due:</strong> ${amount.toFixed(2)}
        </p>
        <p>
          <strong>Event:</strong> {eventName}
        </p>
        {reason && (
          <p style={{ fontSize: "14px", color: "#991b1b" }}>
            <strong>Reason:</strong> {reason}
          </p>
        )}
      </div>
      <p>Please update your payment method and complete the payment as soon as possible to claim your item.</p>
      <p>
        If you have any questions, please contact the event organizers at <strong>{eventName}</strong>.
      </p>
    </div>
  )
}
