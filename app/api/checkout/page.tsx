"use client"

import { useState } from "react"

import { useEffect } from "react"

const CheckoutPage = ({ event, type, invoiceId }) => {
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeCheckout = async () => {
      try {
        if (!event?.id) {
          console.error("[v0] No event context available")
          setError("Event not found")
          setLoading(false)
          return
        }

        // ... existing checkout initialization code ...

        if (type === "invoice" && invoiceId) {
          fetch(`/api/invoices/${invoiceId}/track-checkout`, {
            method: "POST",
          }).catch((err) => console.error("[v0] Failed to track checkout:", err))
        }

        setLoading(false)
      } catch (error) {
        console.error("[v0] Error during checkout initialization:", error)
        setError("An error occurred during checkout")
        setLoading(false)
      }
    }

    initializeCheckout()
  }, [event, type, invoiceId])

  // ... rest of code here ...

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {/* ... other JSX code here ... */}
    </div>
  )
}

export default CheckoutPage
