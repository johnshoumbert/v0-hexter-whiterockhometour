"use client"

import { useEffect, useState, Suspense, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Elements } from "@stripe/react-stripe-js"
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle } from "lucide-react"
import { CheckoutForm } from "@/components/checkout-form"
import { useAuth } from "@/contexts/auth-context"

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [stripePromise, setStripePromise] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkoutData, setCheckoutData] = useState<any>(null)
  const hasInitialized = useRef(false)

  console.log("[v0] CheckoutContent component rendered")
  console.log("[v0] searchParams toString:", searchParams.toString())
  
  const type = searchParams.get("type") // "donation" | "shop" | "ticket" | "sponsor" | "invoice"
  const eventId = searchParams.get("eventId")
  const requestId = searchParams.get("requestId")
  const invoiceNumber = searchParams.get("invoiceNumber")
  const invoiceId = searchParams.get("invoiceId")
  const amount = searchParams.get("amount")
  
  console.log("[v0] URL params parsed - type:", type, "eventId:", eventId, "invoiceId:", invoiceId, "requestId:", requestId)

  useEffect(() => {
    console.log("[v0] Checkout page - type:", type, "eventId:", eventId)
    console.log("[v0] Checkout page - invoiceId:", invoiceId, "requestId:", requestId, "amount:", amount)
    console.log("[v0] Checkout page - sessionStorage tickets:", sessionStorage.getItem("checkout_tickets"))
    console.log("[v0] Checkout page - sessionStorage shop:", sessionStorage.getItem("checkout_shop_items"))
  }, [type, eventId, invoiceId, requestId, amount])

  useEffect(() => {
    if (!authLoading && !user) {
      const currentUrl = window.location.href
      router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`)
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (authLoading || !user || hasInitialized.current) return

    const initializeCheckout = async () => {
      if (!type || !eventId) {
        setError("Missing checkout parameters")
        setIsLoading(false)
        return
      }

      try {
        hasInitialized.current = true

        const configResponse = await fetch(`/api/events/${eventId}/stripe-config`)
        if (!configResponse.ok) {
          throw new Error("Failed to load payment configuration")
        }
        const config = await configResponse.json()

        const stripe = await loadStripe(config.publishableKey)
        setStripePromise(stripe)
        
        // Store the stripe config flag
        if (!checkoutData) {
          setCheckoutData({ usingDefaultStripe: config.usingDefaultStripe })
        }

        let intentResponse
        if (type === "donation") {
          const amount = searchParams.get("amount")
          const message = searchParams.get("message")

          intentResponse = await fetch(`/api/events/${eventId}/donations/create-intent`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount,
              donor_name: user.name,
              donor_email: user.email,
              message,
            }),
          })
        } else if (type === "shop") {
          const items = sessionStorage.getItem("checkout_shop_items")
          if (!items) {
            throw new Error("No items found for checkout")
          }

          intentResponse = await fetch(`/api/events/${eventId}/shop/create-intent`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: items,
          })
        } else if (type === "ticket") {
          const tickets = sessionStorage.getItem("checkout_tickets")
          const responses = sessionStorage.getItem("checkout_responses")

          if (!tickets) {
            throw new Error("No tickets found for checkout. Please add tickets to your cart first.")
          }

          intentResponse = await fetch(`/api/events/${eventId}/tickets/create-intent`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tickets: JSON.parse(tickets), responses: responses ? JSON.parse(responses) : {} }),
          })
        } else if (type === "sponsor") {
          const amount = searchParams.get("amount")

          if (!requestId) {
            throw new Error("Missing sponsor request ID")
          }

          intentResponse = await fetch(`/api/events/${eventId}/sponsor-requests/${requestId}/checkout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: Number.parseFloat(amount || "0"),
              invoiceNumber,
            }),
          })
        } else if (type === "invoice") {
          const amount = searchParams.get("amount")

          console.log("[v0] Invoice checkout - invoiceId:", invoiceId, "type:", typeof invoiceId)
          console.log("[v0] Invoice checkout - requestId:", requestId, "type:", typeof requestId)
          console.log("[v0] Invoice checkout - amount:", amount)
          console.log("[v0] Invoice checkout - all params:", {
            type, eventId, invoiceId, requestId, invoiceNumber, amount
          })
          
          const paymentInvoiceId = invoiceId || requestId

          console.log("[v0] Invoice checkout - paymentInvoiceId:", paymentInvoiceId)
          
          if (!paymentInvoiceId) {
            const errorDetails = `Missing invoice ID. Received: invoiceId=${invoiceId}, requestId=${requestId}, searchParams=${searchParams.toString()}`
            console.error("[v0]", errorDetails)
            setError(errorDetails)
            setIsLoading(false)
            return
          }

          intentResponse = await fetch(`/api/po-requests/${paymentInvoiceId}/checkout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: Number.parseFloat(amount || "0"),
            }),
          })
        } else {
          throw new Error("Invalid checkout type")
        }

        if (!intentResponse.ok) {
          const contentType = intentResponse.headers.get("content-type")
          if (contentType?.includes("application/json")) {
            const errorData = await intentResponse.json()
            throw new Error(errorData.error || "Failed to create payment")
          } else {
            const errorText = await intentResponse.text()
            throw new Error(errorText || "Failed to create payment")
          }
        }

        const data = await intentResponse.json()

        setClientSecret(data.clientSecret)
        setCheckoutData({ ...data, usingDefaultStripe: config.usingDefaultStripe })
        setIsLoading(false)
      } catch (err: any) {
        console.error("[v0] Checkout initialization error:", err)
        setError(err.message || "Failed to initialize checkout")
        setIsLoading(false)
        hasInitialized.current = false
      }
    }

    initializeCheckout()
  }, [type, eventId, user, authLoading])

  useEffect(() => {
    return () => {
      // This prevents deleting ticket_purchases before they can be verified
    }
  }, [type, eventId, clientSecret])

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verifying authentication...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Preparing checkout...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <CardTitle className="text-destructive">Checkout Error</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <div className="flex gap-3">
              <Button onClick={() => router.back()} variant="outline">
                Go Back
              </Button>
              {type === "ticket" && (
                <Button onClick={() => router.push(`/?tab=tickets`)} variant="default">
                  View Tickets
                </Button>
              )}
              {type === "shop" && (
                <Button onClick={() => router.push(`/?tab=shop`)} variant="default">
                  View Shop
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!clientSecret || !stripePromise) {
    return null
  }

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: "stripe",
      variables: {
        colorPrimary: "hsl(var(--primary))",
      },
    },
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <Elements stripe={stripePromise} options={options}>
        <CheckoutForm checkoutData={checkoutData} type={type!} eventId={eventId!} user={user} />
      </Elements>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-16 max-w-2xl">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}
