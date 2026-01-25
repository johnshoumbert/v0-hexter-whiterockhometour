"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Loader2, CreditCard, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { loadStripe, type Stripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"

interface BidConsentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  auctionId: string
  auctionTitle: string
  bidAmount: number
  onSuccess: () => void
  eventId: string
  hasExistingAuth?: boolean
}

function PaymentForm({
  auctionId,
  bidAmount,
  onSuccess,
  onCancel,
}: {
  auctionId: string
  bidAmount: number
  onSuccess: () => void
  onCancel: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [message, setMessage] = useState<string>("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    if (!authorized) {
      toast.error("Please authorize payment to place your bid")
      return
    }

    setIsProcessing(true)
    setMessage("")

    try {
      // Confirm the setup
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      })

      if (error) {
        setMessage(error.message || "An error occurred")
        toast.error(error.message || "Payment authorization failed")
        setIsProcessing(false)
        return
      }

      if (setupIntent && setupIntent.status === "succeeded") {
        // Place the bid with payment method authorization
        const bidResponse = await fetch("/api/bids", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            auction_id: auctionId,
            amount: bidAmount,
            authorized: true,
            payment_method_id: setupIntent.payment_method,
          }),
        })

        if (bidResponse.ok) {
          toast.success("Payment method authorized. Your bid has been placed!", {
            description: "Your card will only be charged if you win the auction.",
          })
          onSuccess()
        } else {
          const data = await bidResponse.json()
          throw new Error(data.error || "Failed to place bid")
        }
      }
    } catch (err) {
      console.error("[v0] Payment authorization error:", err)
      setMessage(err instanceof Error ? err.message : "Failed to authorize payment")
      toast.error(err instanceof Error ? err.message : "Failed to authorize payment")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-4 border-2">
        <PaymentElement />
      </Card>

      <div className="flex items-start space-x-3 rounded-lg border p-4 bg-muted/50">
        <Checkbox
          id="authorize"
          checked={authorized}
          onCheckedChange={(checked) => setAuthorized(checked as boolean)}
        />
        <div className="space-y-1 leading-none">
          <Label htmlFor="authorize" className="text-sm font-medium cursor-pointer">
            I authorize MySchoolAuction to charge this card automatically if my bid wins
          </Label>
          <p className="text-xs text-muted-foreground">
            Your card will only be charged if you are the winning bidder when the auction closes.
          </p>
        </div>
      </div>

      {message && <p className="text-sm text-destructive">{message}</p>}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 bg-transparent"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || !authorized || isProcessing} className="flex-1">
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Authorizing...
            </>
          ) : (
            <>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Authorize Bid
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

export function BidConsentDialog({
  open,
  onOpenChange,
  auctionId,
  auctionTitle,
  bidAmount,
  onSuccess,
  eventId,
  hasExistingAuth = false,
}: BidConsentDialogProps) {
  const [clientSecret, setClientSecret] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    if (open && eventId) {
      console.log("[v0] Dialog opened, fetching Stripe config for event:", eventId)
      fetchStripeConfig()
    }

    return () => {
      setStripePromise(null)
      setClientSecret("")
      setError("")
    }
  }, [open, eventId])

  const fetchStripeConfig = async () => {
    try {
      console.log("[v0] Fetching Stripe config for event:", eventId)
      const response = await fetch(`/api/events/${eventId}/stripe-config`)

      console.log("[v0] Stripe config response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[v0] Stripe config error:", errorData)
        throw new Error(errorData.error || "Failed to fetch Stripe configuration")
      }

      const data = await response.json()
      console.log("[v0] Stripe config fetched:", data.source, "connected:", data.connected)

      if (data.publishableKey && data.connected) {
        console.log("[v0] Loading Stripe with publishable key")
        setStripePromise(loadStripe(data.publishableKey))
        fetchSetupIntent()
      } else {
        console.error("[v0] No publishable key or Stripe not connected")
        throw new Error("Stripe is not configured for this event. Please contact the event organizer.")
      }
    } catch (error) {
      console.error("[v0] Failed to fetch Stripe config:", error)
      const errorMessage = error instanceof Error ? error.message : "Stripe is not configured for this event"
      setError(errorMessage)
      setIsLoading(false)
    }
  }

  const fetchSetupIntent = async () => {
    setIsLoading(true)
    setError("")
    try {
      console.log("[v0] Fetching setup intent for auction:", auctionId)
      const response = await fetch("/api/bids/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auctionId }),
      })

      console.log("[v0] Setup intent response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[v0] Setup intent error:", errorData)
        throw new Error(errorData.error || "Failed to initialize payment")
      }

      const data = await response.json()
      console.log("[v0] Setup intent created, client secret received")
      setClientSecret(data.clientSecret)
    } catch (error) {
      console.error("[v0] Failed to fetch setup intent:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to initialize payment authorization"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setClientSecret("")
    setStripePromise(null)
    setError("")
    onOpenChange(false)
  }

  const handleSuccess = () => {
    setClientSecret("")
    setStripePromise(null)
    setError("")
    onSuccess()
    onOpenChange(false)
  }

  const handleBidWithExistingAuth = async () => {
    try {
      const bidResponse = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auction_id: auctionId,
          amount: bidAmount,
          authorized: true,
        }),
      })

      if (bidResponse.ok) {
        toast.success("Yay, you're winning!", {
          description: `Your authorized bid of $${bidAmount.toFixed(2)} has been placed!`,
        })
        onSuccess()
        onOpenChange(false)
      } else {
        const data = await bidResponse.json()
        throw new Error(data.error || "Failed to place bid")
      }
    } catch (err) {
      console.error("[v0] Bid placement with existing auth error:", err)
      toast.error(err instanceof Error ? err.message : "Failed to place bid")
      onOpenChange(false)
    }
  }

  if (hasExistingAuth && open) {
    handleBidWithExistingAuth()
    return null
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleCancel()
        } else {
          onOpenChange(isOpen)
        }
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Authorize Payment for Bid
          </DialogTitle>
          <DialogDescription>
            Bidding on: <span className="font-semibold">{auctionTitle}</span>
            <br />
            Bid Amount: <span className="font-semibold text-primary">${bidAmount.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
              <p className="text-sm text-destructive font-medium">Payment Authorization Error</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleCancel} className="flex-1 bg-transparent">
                Close
              </Button>
              <Button
                onClick={() => {
                  setError("")
                  fetchStripeConfig()
                }}
                className="flex-1"
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : isLoading || !stripePromise ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
            <PaymentForm
              auctionId={auctionId}
              bidAmount={bidAmount}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </Elements>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
