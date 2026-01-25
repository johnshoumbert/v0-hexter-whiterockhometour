"use client"

import { useCartStore } from "@/stores/cart-store"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Minus, Plus, Trash2, ShoppingCart, Loader2, Ticket } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { useEvent } from "@/contexts/event-context"
import { useRouter } from "next/navigation"

export function CartPanel() {
  const { cart, isCartOpen, setCartOpen, updateQuantity, removeFromCart, getCartTotal, clearCart } = useCartStore()
  const { event } = useEvent()
  const { toast } = useToast()
  const router = useRouter()
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  const handleCheckout = async () => {
    console.log("[v0] CartPanel - handleCheckout called")
    console.log("[v0] CartPanel - cart length:", cart.length)
    console.log("[v0] CartPanel - event:", event?.id)

    if (cart.length === 0) {
      console.log("[v0] CartPanel - cart is empty, aborting")
      return
    }

    const shopItems = cart.filter((item) => item.type === "shop")
    const ticketItems = cart.filter((item) => item.type === "ticket")

    if (shopItems.length > 0) {
      sessionStorage.setItem(
        "checkout_shop_items",
        JSON.stringify({
          items: shopItems.map((cartItem) => ({
            itemId: cartItem.item.id,
            quantity: cartItem.quantity,
            selectedOptions: cartItem.selectedOptions,
          })),
        }),
      )
    }

    if (ticketItems.length > 0) {
      sessionStorage.setItem(
        "checkout_tickets",
        JSON.stringify(
          ticketItems.map((cartItem) => ({
            ticket_id: cartItem.item.id,
            ticket_name: cartItem.item.name,
            quantity: cartItem.quantity,
            price: Number(cartItem.item.price),
          })),
        ),
      )
    }

    let checkoutType = "shop"
    if (shopItems.length > 0 && ticketItems.length > 0) {
      checkoutType = "mixed"
    } else if (ticketItems.length > 0) {
      checkoutType = "ticket"
    }

    router.push(`/checkout?type=${checkoutType}&eventId=${event?.id}`)
  }

  const generateOptionsKey = (selectedOptions?: Record<string, string | string[]>): string => {
    if (!selectedOptions) return ""
    return JSON.stringify(selectedOptions)
  }

  const formatSelectedOptions = (selectedOptions?: Record<string, string | string[]>, item?: any) => {
    if (!selectedOptions || !item?.options) return null

    const formatted: string[] = []
    Object.entries(selectedOptions).forEach(([optionId, value]) => {
      const option = item.options?.find((o: any) => o.id === optionId)
      if (option) {
        const values = Array.isArray(value) ? value : [value]
        values.forEach((v) => {
          const optionValue = option.values.find((ov: any) => ov.id === v)
          if (optionValue) {
            formatted.push(`${option.name}: ${optionValue.label}`)
          }
        })
      }
    })

    return formatted.length > 0 ? formatted.join(", ") : null
  }

  return (
    <Sheet open={isCartOpen} onOpenChange={setCartOpen}>
      <SheetContent side="left" className="w-full sm:max-w-md flex flex-col p-0 h-full">
        <SheetHeader className="flex-shrink-0 p-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Cart ({cart.length})
          </SheetTitle>
        </SheetHeader>

        {cart.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">Your cart is empty</p>
              <p className="text-sm text-muted-foreground mt-2">Add items or tickets to get started!</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {cart.map((cartItem, index) => {
                  const optionsKey = generateOptionsKey(cartItem.selectedOptions)
                  const optionsText =
                    cartItem.type === "shop" ? formatSelectedOptions(cartItem.selectedOptions, cartItem.item) : null

                  return (
                    <div
                      key={`${cartItem.item.id}-${optionsKey}-${index}`}
                      className="flex gap-4 pb-4 border-b last:border-b-0"
                    >
                      {cartItem.type === "ticket" ? (
                        <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center">
                          <Ticket className="h-10 w-10 text-primary" />
                        </div>
                      ) : (
                        "image_url" in cartItem.item &&
                        cartItem.item.image_url && (
                          <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                            <img
                              src={cartItem.item.image_url || "/placeholder.svg"}
                              alt={"title" in cartItem.item ? cartItem.item.title : cartItem.item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">
                          {"title" in cartItem.item ? cartItem.item.title : cartItem.item.name}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {cartItem.type === "ticket" ? "Event Ticket" : "Shop Item"}
                        </p>
                        {optionsText && <p className="text-xs text-muted-foreground mt-1">{optionsText}</p>}
                        <p className="text-lg font-bold text-primary mt-2">${Number(cartItem.item.price).toFixed(2)}</p>
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 bg-transparent"
                            onClick={() => updateQuantity(cartItem.item.id, cartItem.quantity - 1, optionsKey)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-12 text-center font-medium">{cartItem.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 bg-transparent"
                            onClick={() => updateQuantity(cartItem.item.id, cartItem.quantity + 1, optionsKey)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 ml-auto text-destructive"
                            onClick={() => removeFromCart(cartItem.item.id, optionsKey)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex-shrink-0 border-t p-6 space-y-4 bg-background">
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-2xl text-primary">${getCartTotal().toFixed(2)}</span>
              </div>
              <Button className="w-full h-12 text-lg" onClick={handleCheckout} disabled={isCheckingOut}>
                {isCheckingOut ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Proceed to Checkout"
                )}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
