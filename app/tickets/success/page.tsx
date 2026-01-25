"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Loader2, Ticket } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEvent } from "@/contexts/event-context"

function TicketsSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const sessionId = searchParams?.get("session_id")
  const { event } = useEvent()

  const [purchaseData, setPurchaseData] = useState<any>(null)
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (sessionId && event?.id) {
      fetch(`/api/events/${event.id}/tickets/session?session_id=${sessionId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch ticket purchase details")
          return res.json()
        })
        .then((data) => {
          console.log("[v0] Ticket purchase data retrieved:", data)
          setPurchaseData(data)
          setPaymentStatus(data.paymentStatus || data.purchaseStatus)
          setIsLoading(false)
        })
        .catch((err) => {
          console.error("[v0] Error fetching ticket purchase details:", err)
          setError("Failed to load ticket purchase details")
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }
  }, [sessionId, event?.id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-destructive">Error Loading Purchase</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 justify-center pt-4">
              <Button onClick={() => router.push("/tickets")}>Back to Tickets</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getStatusBadge = () => {
    if (paymentStatus === "succeeded" || paymentStatus === "completed") {
      return (
        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
          Payment Confirmed
        </span>
      )
    }
    if (paymentStatus === "processing" || paymentStatus === "pending") {
      return (
        <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
          Processing Payment
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
        Registration Received
      </span>
    )
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-3xl">Registration Successful!</CardTitle>
          <CardDescription>Thank you for registering. You will receive a confirmation email shortly.</CardDescription>
          <div className="mt-4 flex justify-center">{getStatusBadge()}</div>
        </CardHeader>
        <CardContent className="space-y-6">
          {purchaseData && (
            <>
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Ticket Summary</h3>
                <div className="space-y-3">
                  {purchaseData.purchases.map((purchase: any) => (
                    <div key={purchase.id} className="flex gap-3 items-start">
                      <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Ticket className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{purchase.ticketName}</p>
                        {purchase.ticketDescription && (
                          <p className="text-sm text-muted-foreground">{purchase.ticketDescription}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          Quantity: {purchase.quantity} × ${purchase.unitPrice}
                        </p>
                      </div>
                      <p className="font-semibold">${purchase.totalAmount}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 flex justify-between items-center">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold">${purchaseData.subtotal}</span>
              </div>

              {purchaseData.customerEmail && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm">
                    <span className="font-medium">Confirmation sent to:</span> {purchaseData.customerEmail}
                  </p>
                  {purchaseData.stripePaymentIntent && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Payment ID: {purchaseData.stripePaymentIntent.substring(0, 20)}...
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              Your ticket registration has been confirmed. Please check your email for further details.
            </p>
          </div>
          <div className="flex gap-4 justify-center pt-4">
            <Button variant="outline" onClick={() => router.push("/")}>
              Back to Home
            </Button>
            <Button onClick={() => router.push("/user/purchases")}>View My Tickets</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function TicketsSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <TicketsSuccessContent />
    </Suspense>
  )
}
