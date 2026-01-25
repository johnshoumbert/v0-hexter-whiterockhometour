"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Loader2, Ticket, QrCode, Receipt } from "lucide-react"
import { PaymentReceipt } from "@/components/payment-receipt"
import { useEvent } from "@/contexts/event-context"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useCartStore } from "@/stores/cart-store"

interface PaymentData {
  id: string
  user_name: string
  user_email: string
  payment_type: string
  amount: number
  created_at: string
  stripe_payment_intent?: string
  payment_method_brand?: string
  payment_method_last4?: string
  payment_method_exp_month?: string
  payment_method_exp_year?: string
  item_name?: string
  message?: string
  items?: Array<{
    name: string
    quantity: number
    size?: string
    price: number
    image_url?: string
    description?: string
  }>
  subtotal?: number
  tax?: number
  shipping?: number
  total?: number
  tickets?: Array<{
    id: string
    ticketName: string
    ticketDescription?: string
    quantity: number
    unitPrice: number
    totalAmount: number
  }>
  discount_code?: string
  discount_amount?: number
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { event } = useEvent()
  const clearCart = useCartStore((state) => state.clearCart)
  const [isProcessing, setIsProcessing] = useState(true)
  const [status, setStatus] = useState<string | null>(null)
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [showQRDialog, setShowQRDialog] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<any>(null)

  const type = searchParams.get("type")
  const eventId = searchParams.get("eventId")
  const paymentIntent = searchParams.get("payment_intent")

  useEffect(() => {
    const verifyPayment = async () => {
      if (!paymentIntent || !type || !eventId) {
        setStatus("error")
        setIsProcessing(false)
        return
      }

      try {
        console.log("[v0] Verifying payment:", { paymentIntent, type, eventId })

        const response = await fetch(`/api/events/${eventId}/verify-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentIntent, type }),
        })

        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Payment verification successful:", data)
          setStatus("success")
          setPaymentData(data.payment)

          if (
            type === "shop" ||
            type === "shop_order" ||
            type === "ticket" ||
            type === "ticket_purchase" ||
            type === "tickets"
          ) {
            console.log("[v0] Purchase successful - clearing cart for type:", type)
            clearCart()
          }

          sessionStorage.removeItem("checkout_shop_items")
          sessionStorage.removeItem("checkout_tickets")
          sessionStorage.removeItem("checkout_responses")

          if (type === "ticket" || type === "ticket_purchase" || type === "tickets") {
            try {
              await fetch(`/api/events/${eventId}/tickets/cleanup-pending`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paymentIntentId: paymentIntent }),
              })
            } catch (err) {
              console.error("[v0] Failed to cleanup pending purchases:", err)
            }
          }
        } else {
          const errorText = await response.text()
          console.error("[v0] Payment verification failed:", errorText)
          setStatus("error")
        }
      } catch (error) {
        console.error("[v0] Payment verification error:", error)
        setStatus("error")
      } finally {
        setIsProcessing(false)
      }
    }

    verifyPayment()
  }, [paymentIntent, type, eventId, clearCart])

  if (isProcessing) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Confirming your payment...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Payment Error</CardTitle>
            <CardDescription>There was an issue processing your payment</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push("/")}>Return Home</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if ((type === "tickets" || type === "ticket" || type === "ticket_purchase") && paymentData) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://myschoolauction.com"

    const purchasedItems = paymentData.tickets || paymentData.items || []

    return (
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-3xl">Registration Successful!</CardTitle>
            <CardDescription>Thank you for your purchase</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Receipt Section */}
            <div className="border rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="font-semibold text-lg">Order Receipt</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(paymentData.created_at).toLocaleDateString()} at{" "}
                    {new Date(paymentData.created_at).toLocaleTimeString()}
                  </p>
                </div>
                <Receipt className="h-6 w-6 text-muted-foreground" />
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">ITEMS PURCHASED</h4>
                {purchasedItems.length > 0 ? (
                  purchasedItems.map((item: any, index: number) => {
                    const itemName = item.name || item.ticketName
                    const itemDesc = item.description || item.ticketDescription
                    const itemQty = item.quantity || 1
                    const itemPrice = item.price || item.unitPrice || 0
                    const itemTotal = item.total || item.totalAmount || itemPrice * itemQty

                    return (
                      <div key={item.id || index} className="flex gap-3 items-start border-b pb-3 last:border-0">
                        <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Ticket className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{itemName}</p>
                          {itemDesc && <p className="text-sm text-muted-foreground">{itemDesc}</p>}
                          <p className="text-sm text-muted-foreground mt-1">
                            Quantity: {itemQty} × ${itemPrice.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${itemTotal.toFixed(2)}</p>
                          {item.id && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2 bg-transparent"
                              onClick={() => {
                                setSelectedTicket(item)
                                setShowQRDialog(true)
                              }}
                            >
                              <QrCode className="h-4 w-4 mr-1" />
                              View QR
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No items to display</p>
                )}
              </div>

              {/* Total */}
              <div className="border-t pt-4 flex justify-between items-center">
                <span className="text-lg font-semibold">Total Paid</span>
                <span className="text-2xl font-bold">${paymentData.amount.toFixed(2)}</span>
              </div>

              {/* Discount Display Section */}
              {paymentData.discount_code && paymentData.discount_amount && paymentData.discount_amount > 0 && (
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${(paymentData.amount + paymentData.discount_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-600 font-medium">Discount ({paymentData.discount_code})</span>
                    <span className="text-green-600 font-medium">-${paymentData.discount_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center font-semibold border-t pt-2">
                    <span>Total Paid</span>
                    <span className="text-xl">${paymentData.amount.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Payment Method */}
              {paymentData.payment_method_brand && paymentData.payment_method_last4 && (
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium">Payment Method</p>
                  <div className="text-sm">
                    <p className="font-mono">
                      {paymentData.payment_method_brand?.toUpperCase()} ••••{paymentData.payment_method_last4}
                    </p>
                    {paymentData.payment_method_exp_month && paymentData.payment_method_exp_year && (
                      <p className="text-muted-foreground text-xs">
                        EXP {String(paymentData.payment_method_exp_month).padStart(2, "0")}/
                        {String(paymentData.payment_method_exp_year).slice(-2)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Customer Info */}
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm">
                  <span className="font-medium">Confirmation sent to:</span> {paymentData.user_email}
                </p>
                {paymentData.stripe_payment_intent && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Payment ID: {paymentData.stripe_payment_intent.substring(0, 20)}...
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center pt-4">
              <Button variant="outline" onClick={() => router.push("/")}>
                Return Home
              </Button>
              <Button onClick={() => router.push("/user/purchases")}>
                <Receipt className="h-4 w-4 mr-2" />
                View All Payments
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* QR Code Dialog */}
        <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Ticket QR Code</DialogTitle>
              <DialogDescription>Show this QR code to the admin at the event entrance</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex justify-center bg-white p-4 rounded-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${appUrl}/admin/redeem/ticket/${selectedTicket?.id}`}
                  alt="Ticket QR Code"
                  className="w-64 h-64 rounded-lg border"
                />
              </div>
              <div className="rounded-lg bg-muted p-4 text-sm">
                <p className="font-semibold">{selectedTicket?.name || selectedTicket?.ticketName}</p>
                {(selectedTicket?.description || selectedTicket?.ticketDescription) && (
                  <p className="text-muted-foreground">
                    {selectedTicket.description || selectedTicket.ticketDescription}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Quantity: {selectedTicket?.quantity} ticket{selectedTicket?.quantity > 1 ? "s" : ""}
                </p>
                <p className="text-sm font-bold mt-1">
                  ${(selectedTicket?.total || selectedTicket?.totalAmount)?.toFixed(2)}
                </p>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Scan this QR code at the event to redeem your ticket
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  const getSuccessMessage = () => {
    switch (type) {
      case "donation":
        return {
          title: "Thank You for Your Donation!",
          description: "Your generosity makes a difference",
          action: { label: "View Auctions", href: "/auctions" },
        }
      case "shop":
        return {
          title: "Purchase Successful!",
          description: "Thank you for your purchase",
          action: { label: "View My Orders", href: "/user/purchases" },
        }
      default:
        return {
          title: "Payment Successful!",
          description: "Thank you",
          action: { label: "Return Home", href: "/" },
        }
    }
  }

  const successInfo = getSuccessMessage()

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-3xl">{successInfo.title}</CardTitle>
          <CardDescription>{successInfo.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {paymentData && (
            <PaymentReceipt
              payment={paymentData}
              eventId={eventId || undefined}
              eventName={event?.event_name || "School Auction"}
              organizationName={event?.organization_name}
              items={paymentData.items}
              message={paymentData.message}
            />
          )}

          <div className="text-center space-y-4 pt-6">
            <p className="text-muted-foreground">You will receive a confirmation email shortly.</p>
          </div>
          <div className="flex gap-4 justify-center pt-4">
            <Button variant="outline" onClick={() => router.push("/")}>
              Return Home
            </Button>
            <Button onClick={() => router.push(successInfo.action.href)}>{successInfo.action.label}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  )
}
