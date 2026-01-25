"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCartStore } from "@/stores/cart-store"
import { useEvent } from "@/contexts/event-context"

export default function ShopSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const sessionId = searchParams?.get("session_id")
  const clearCart = useCartStore((state) => state.clearCart)
  const { event } = useEvent()

  const [orderData, setOrderData] = useState<any>(null)
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log("[v0] Shop purchase successful - clearing cart")
    clearCart()

    if (sessionId && event?.id) {
      fetch(`/api/events/${event.id}/shop/session?session_id=${sessionId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch order details")
          return res.json()
        })
        .then((data) => {
          console.log("[v0] Order data retrieved:", data)
          setOrderData(data)
          setPaymentStatus(data.paymentStatus || data.orderStatus)
          setIsLoading(false)
        })
        .catch((err) => {
          console.error("[v0] Error fetching order details:", err)
          setError("Failed to load order details")
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }
  }, [clearCart, sessionId, event?.id])

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
            <CardTitle className="text-2xl text-destructive">Error Loading Order</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 justify-center pt-4">
              <Button onClick={() => router.push("/shop")}>Back to Shop</Button>
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
        Order Received
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
          <CardTitle className="text-3xl">Purchase Successful!</CardTitle>
          <CardDescription>Thank you for your purchase. You will receive a confirmation email shortly.</CardDescription>
          <div className="mt-4 flex justify-center">{getStatusBadge()}</div>
        </CardHeader>
        <CardContent className="space-y-6">
          {orderData && (
            <>
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Order Summary</h3>
                <div className="space-y-3">
                  {orderData.orders.map((order: any) => (
                    <div key={order.id} className="flex gap-3 items-start">
                      {order.itemImage && (
                        <img
                          src={order.itemImage || "/placeholder.svg"}
                          alt={order.itemTitle}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{order.itemTitle}</p>
                        <p className="text-sm text-muted-foreground">
                          Quantity: {order.quantity} × ${order.unitPrice}
                        </p>
                        {order.selectedOptions && Object.keys(order.selectedOptions).length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {Object.entries(order.selectedOptions).map(([key, value]: [string, any]) => (
                              <span key={key} className="mr-2">
                                {key}: {Array.isArray(value) ? value.join(", ") : value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="font-semibold">${order.totalAmount}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 flex justify-between items-center">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold">${orderData.subtotal}</span>
              </div>

              {orderData.customerEmail && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm">
                    <span className="font-medium">Confirmation sent to:</span> {orderData.customerEmail}
                  </p>
                  {orderData.stripePaymentIntent && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Payment ID: {orderData.stripePaymentIntent.substring(0, 20)}...
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Your order has been confirmed and is being processed.</p>
          </div>
          <div className="flex gap-4 justify-center pt-4">
            <Button variant="outline" onClick={() => router.push("/shop")}>
              Continue Shopping
            </Button>
            <Button onClick={() => router.push("/user/purchases")}>View My Orders</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
