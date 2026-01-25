"use client"

import { useEffect } from "react"

import { useState, type FormEvent } from "react"
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, ShoppingCart, Ticket, Heart, User, Building2, Tag, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface CheckoutFormProps {
  checkoutData: any
  type: string
  eventId: string
  user: any
}

export function CheckoutForm({ checkoutData, type, eventId, user }: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [discountCode, setDiscountCode] = useState("")
  const [isApplyingCode, setIsApplyingCode] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null)
  const [discountedTotal, setDiscountedTotal] = useState<number | null>(null)
  const [discountDetails, setDiscountDetails] = useState<any>(null)
  const [updatedClientSecret, setUpdatedClientSecret] = useState<string | null>(null)
  const [isPaymentReady, setIsPaymentReady] = useState(false)

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      toast.error("Please enter a discount code")
      return
    }

    setIsApplyingCode(true)
    setErrorMessage(null)

    try {
      const requestPayload = {
        code: discountCode.toUpperCase(),
        type,
        items: checkoutData.items,
        totalAmount: checkoutData.totalAmount,
        userEmail: user.email,
      }

      console.log("[v0] Applying discount code:", discountCode)

      const response = await fetch(`/api/events/${eventId}/coupons/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      })

      const responseText = await response.text()
      console.log("[v0] Validate response status:", response.status, "text:", responseText)

      if (!responseText) {
        const errorMsg = "Server returned an empty response. Please try again."
        toast.error(errorMsg)
        setErrorMessage(errorMsg)
        return
      }

      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error("[v0] Failed to parse response as JSON:", parseError)
        const errorMsg = "Invalid response from server. Please try again."
        toast.error(errorMsg)
        setErrorMessage(errorMsg)
        return
      }

      if (!response.ok) {
        const errorMsg = data.error || "Invalid discount code"
        console.log("[v0] Discount validation failed:", errorMsg)
        toast.error(errorMsg)
        setErrorMessage(errorMsg)
        return
      }

      console.log("[v0] Discount validated successfully:", data)

      // If total is $0, we'll skip payment intent entirely
      if (data.newTotal > 0) {
        const updateResponse = await fetch(`/api/events/${eventId}/update-payment-intent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientSecret: checkoutData.clientSecret,
            newAmount: data.newTotal,
            couponCode: discountCode.toUpperCase(),
            discountAmount: data.discountAmount,
          }),
        })

        if (!updateResponse.ok) {
          const errorMsg = "Failed to apply discount to payment. Please try again."
          toast.error(errorMsg)
          setErrorMessage(errorMsg)
          return
        }

        const updateData = await updateResponse.json()
        setUpdatedClientSecret(updateData.clientSecret)
      } else {
        console.log("[v0] Total is $0, skipping payment intent update")
      }

      setAppliedCoupon(data.coupon)
      setDiscountedTotal(data.newTotal)
      setDiscountDetails({
        discountAmount: data.discountAmount,
        applicableTotal: data.applicableTotal,
      })
      toast.success(`Discount applied! You saved $${data.discountAmount.toFixed(2)}`)
      setErrorMessage(null)
    } catch (error) {
      console.error("[v0] Error applying discount:", error)
      const errorMsg = "Failed to apply discount code. Please try again."
      toast.error(errorMsg)
      setErrorMessage(errorMsg)
    } finally {
      setIsApplyingCode(false)
    }
  }

  const handleRemoveDiscount = async () => {
    const originalAmount = Number.parseFloat(checkoutData.totalAmount)

    if (originalAmount > 0 && discountedTotal === 0) {
      // Need to recreate payment intent since it was bypassed for $0 order
      try {
        const response = await fetch(`/api/events/${eventId}/tickets/create-intent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tickets: checkoutData.items, // or appropriate items based on type
            totalAmount: originalAmount,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setUpdatedClientSecret(data.clientSecret)
          // Need to reload the page to reinitialize Stripe with new client secret
          window.location.reload()
          return
        }
      } catch (error) {
        console.error("[v0] Error recreating payment intent:", error)
        toast.error("Failed to remove discount. Please refresh the page.")
        return
      }
    } else if (originalAmount > 0) {
      // Just update existing payment intent back to original amount
      try {
        const updateResponse = await fetch(`/api/events/${eventId}/update-payment-intent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientSecret: updatedClientSecret || checkoutData.clientSecret,
            newAmount: originalAmount,
          }),
        })

        if (updateResponse.ok) {
          const updateData = await updateResponse.json()
          setUpdatedClientSecret(updateData.clientSecret)
        }
      } catch (error) {
        console.error("[v0] Error removing discount:", error)
      }
    }

    setAppliedCoupon(null)
    setDiscountedTotal(null)
    setDiscountDetails(null)
    setDiscountCode("")
    toast.success("Discount removed")
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    setIsProcessing(true)
    setErrorMessage(null)

    const finalTotal = discountedTotal !== null ? discountedTotal : Number.parseFloat(checkoutData.totalAmount) || 0

    if (finalTotal === 0) {
      try {
        console.log("[v0] Processing free order with coupon")

        const response = await fetch(`/api/events/${eventId}/create-free-order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            items: checkoutData.items,
            couponCode: appliedCoupon?.code,
            discountAmount: discountDetails?.discountAmount || 0,
            originalAmount: checkoutData.totalAmount,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to process free order")
        }

        const data = await response.json()

        // Redirect to success page with the free order ID
        router.push(`/checkout/success?type=${type}&eventId=${eventId}&payment_intent=free_${data.orderId}`)
        return
      } catch (error) {
        console.error("[v0] Error processing free order:", error)
        setErrorMessage(error instanceof Error ? error.message : "Failed to process order")
        setIsProcessing(false)
        return
      }
    }

    if (!stripe || !elements) {
      setIsProcessing(false)
      return
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        receipt_email: user.email,
      },
    })

    if (error) {
      setErrorMessage(error.message || "An error occurred")
      setIsProcessing(false)
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      // Coupon tracking is now handled in verify-payment route
      router.push(`/checkout/success?type=${type}&eventId=${eventId}&payment_intent=${paymentIntent.id}`)
    }
  }

  const getIcon = () => {
    switch (type) {
      case "donation":
        return <Heart className="h-6 w-6 text-primary" />
      case "shop":
        return <ShoppingCart className="h-6 w-6 text-primary" />
      case "ticket":
        return <Ticket className="h-6 w-6 text-primary" />
      case "sponsor":
        return <Building2 className="h-6 w-6 text-primary" />
      default:
        return null
    }
  }

  const getTitle = () => {
    switch (type) {
      case "donation":
        return "Complete Your Donation"
      case "shop":
        return "Complete Your Purchase"
      case "ticket":
        return "Complete Ticket Purchase"
      case "sponsor":
        return "Complete Sponsorship Payment"
      default:
        return "Complete Payment"
    }
  }

  const finalTotal = discountedTotal !== null ? discountedTotal : Number.parseFloat(checkoutData.totalAmount) || 0

  // Track payment element readiness
  useEffect(() => {
    if (!elements) return

    const paymentElement = elements.getElement("payment")
    if (!paymentElement) return

    const handleReady = () => {
      console.log("[v0] Payment element ready")
      setIsPaymentReady(true)
    }

    const handleChange = (event: any) => {
      console.log("[v0] Payment element change:", event.complete)
      setIsPaymentReady(event.complete)
    }

    paymentElement.on("ready", handleReady)
    paymentElement.on("change", handleChange)

    return () => {
      paymentElement.off("ready", handleReady)
      paymentElement.off("change", handleChange)
    }
  }, [elements])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          {getIcon()}
          <CardTitle>{getTitle()}</CardTitle>
        </div>
        <CardDescription>Secure checkout powered by Stripe</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <User className="h-4 w-4" />
            Customer Information
          </h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Name:</span>
              <span className="ml-2 font-medium">{user.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Email:</span>
              <span className="ml-2 font-medium">{user.email}</span>
            </div>
            {user.phone && (
              <div>
                <span className="text-muted-foreground">Phone:</span>
                <span className="ml-2 font-medium">{user.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-3">{type === "sponsor" ? "Invoice Details" : "Order Summary"}</h3>
          <div className="space-y-2">
            {type === "sponsor" && checkoutData.invoiceNumber && (
              <div className="flex justify-between text-sm mb-2 pb-2 border-b">
                <span className="text-muted-foreground">Invoice Number:</span>
                <span className="font-medium">{checkoutData.invoiceNumber}</span>
              </div>
            )}
            {checkoutData.items?.map((item: any, index: number) => (
              <div key={index} className="flex justify-between text-sm">
                <span>
                  {item.name} {item.quantity > 1 && `x ${item.quantity}`}
                </span>
                <span className="font-medium">${item.amount}</span>
              </div>
            ))}

            {appliedCoupon && (
              <>
                <div className="border-t pt-2 mt-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-muted-foreground">${checkoutData.totalAmount}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600 font-medium">
                  <span>
                    Discount ({appliedCoupon.code})
                    {appliedCoupon.discount_type === "fixed"
                      ? ` - $${appliedCoupon.discount_amount} off`
                      : ` - ${appliedCoupon.discount_percentage}% off`}
                  </span>
                  <span>-${discountDetails?.discountAmount?.toFixed(2) || "0.00"}</span>
                </div>
              </>
            )}

            <div className="border-t pt-2 mt-2 flex justify-between font-bold">
              <span>Total</span>
              <div className="text-lg text-primary">${finalTotal.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {type !== "donation" && (
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Discount Code
            </h3>
            {appliedCoupon ? (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                <div>
                  <div className="font-medium text-green-700">{appliedCoupon.code}</div>
                  <div className="text-sm text-green-600">
                    {appliedCoupon.discount_type === "fixed"
                      ? `$${appliedCoupon.discount_amount} off`
                      : `${appliedCoupon.discount_percentage}% off`}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveDiscount}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Enter discount code"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      disabled={isApplyingCode}
                      className={errorMessage && !appliedCoupon ? "border-red-500" : ""}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleApplyDiscount}
                    disabled={isApplyingCode || !discountCode.trim()}
                  >
                    {isApplyingCode ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      "Apply"
                    )}
                  </Button>
                </div>
                {errorMessage && !appliedCoupon && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
                    {errorMessage}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {finalTotal > 0 ? (
            <div>
              <h3 className="font-semibold mb-3">Payment Details</h3>
              <PaymentElement />
            </div>
          ) : (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="text-green-700 font-semibold">Your order is free!</p>
              <p className="text-sm text-green-600 mt-1">Click below to complete your order.</p>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">{errorMessage}</div>
          )}

          <Button type="submit" disabled={(!stripe && finalTotal > 0) || isProcessing || (finalTotal > 0 && !isPaymentReady)} className="w-full h-12 text-lg">
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : finalTotal === 0 ? (
              "Complete Free Order"
            ) : (
              `Pay $${finalTotal.toFixed(2)}`
            )}
          </Button>

          <div className="space-y-1">
            <p className="text-xs text-center text-muted-foreground">
              {finalTotal > 0
                ? "Your payment is secured by Stripe. We never store your card details."
                : "No payment required. Your order will be processed immediately."}
            </p>
            {checkoutData.usingDefaultStripe !== undefined && (
              <p className="text-xs text-center text-muted-foreground">
                {checkoutData.usingDefaultStripe ? "(using default Stripe)" : "(using custom Stripe)"}
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
