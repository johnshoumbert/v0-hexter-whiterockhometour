"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, ArrowLeft, Ticket, ShoppingBag } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useEvent } from "@/contexts/event-context"
import { useAuth } from "@/contexts/auth-context"
import { LoginModal } from "@/components/login-modal"
import Image from "next/image"
import { useCartStore, type ShopItem } from "@/stores/cart-store"
import { ProductOptionsModal } from "@/components/product-options-modal"

interface TicketType {
  id: string
  name: string
  description: string | null
  price: number | string
  quantity_available: number | null
  quantity_sold: number
  is_active: boolean
  pricingTiers?: any[]
}

export default function TicketsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { event, isLoading: eventLoading } = useEvent()
  const { user } = useAuth()
  const { addTicketToCart, setCartOpen, addToCart } = useCartStore()
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [showWizard, setShowWizard] = useState(false)
  const [showQuantityDialog, setShowQuantityDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ticketsWithQuestions, setTicketsWithQuestions] = useState<any[]>([])
  const [tickets, setTickets] = useState<TicketType[]>([])
  const [featuredShopItems, setFeaturedShopItems] = useState<any[]>([])
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [optionsModalOpen, setOptionsModalOpen] = useState(false)
  const [selectedShopItem, setSelectedShopItem] = useState<ShopItem | null>(null)

  useEffect(() => {
    if (event) {
      console.log("[v0] Event tickets data:", event.tickets)
      if (event.tickets && event.tickets.length > 0) {
        console.log("[v0] First ticket structure:", event.tickets[0])
        console.log("[v0] First ticket pricing tiers:", event.tickets[0].pricingTiers || event.tickets[0].pricing_tiers)
      }
      setTickets(event.tickets || [])
      
      // Fetch shop items separately
      const fetchShopItems = async () => {
        try {
          console.log("[v0] Fetching shop items for event:", event.id)
          const response = await fetch(`/api/events/${event.id}/shop/items?active=true`)
          if (response.ok) {
            const data = await response.json()
            console.log("[v0] Shop items fetched:", data.items?.length || 0)
            // Filter for featured items only
            const featured = (data.items || []).filter((item: any) => item.featured)
            console.log("[v0] Featured shop items:", featured.length)
            setFeaturedShopItems(featured)
          }
        } catch (error) {
          console.error("[v0] Error fetching shop items:", error)
        }
      }
      
      if (event.enable_shop) {
        fetchShopItems()
      }
    }
  }, [event])

  const getActivePrice = (ticket: TicketType): number => {
    const activeTier = ticket.pricingTiers?.find((tier: any) => tier.isActive)
    return Number(activeTier ? activeTier.price : ticket.price)
  }

  const handleSelectTicket = (ticketId: string) => {
    if (!user) {
      setLoginModalOpen(true)
      setSelectedTicketId(ticketId)
      return
    }

    setSelectedTicketId(ticketId)
    setQuantity(1)
    setShowQuantityDialog(true)
  }

  const handleProceed = async () => {
    if (!selectedTicketId || !event) return

    const ticket = tickets.find((t) => t.id === selectedTicketId)
    if (!ticket) return

    const ticketPrice = getActivePrice(ticket)
    const totalAmount = ticketPrice * quantity

    if (totalAmount === 0) {
      if (!user) {
        toast({
          title: "Login Required",
          description: "Please log in to register for free tickets",
        })
        setLoginModalOpen(true)
        setShowQuantityDialog(false)
        return
      }

      setIsSubmitting(true)
      setShowQuantityDialog(false)
      await processFreeTicket()
      return
    }

    setShowQuantityDialog(false)
    addTicketToCart(
      {
        id: ticket.id,
        name: ticket.name,
        description: ticket.description,
        price: ticketPrice,
        quantity_available: ticket.quantity_available,
        quantity_sold: ticket.quantity_sold,
        is_active: ticket.is_active,
        pricingTiers: ticket.pricingTiers,
      },
      quantity,
    )

    toast({
      title: "Added to Cart",
      description: `${quantity} ${ticket.name} ticket${quantity > 1 ? "s" : ""} added to your cart`,
    })

    setCartOpen(true)
  }

  const processFreeTicket = async () => {
    if (!selectedTicketId || !event) return

    const ticket = tickets.find((t) => t.id === selectedTicketId)
    if (!ticket) return

    const ticketPrice = getActivePrice(ticket)

    try {
      const ticketData = {
        ticket_id: selectedTicketId,
        quantity,
        price: ticketPrice,
        ticket_name: ticket.name,
      }

      console.log("[v0] Processing free ticket registration")
      const response = await fetch(`/api/events/${event.id}/tickets/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tickets: [ticketData],
          responses: {},
        }),
      })

      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        let errorMessage = "Failed to register tickets"

        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        }

        throw new Error(errorMessage)
      }

      toast({
        title: "Registration Complete",
        description: "Your free tickets have been registered!",
      })

      router.push("/")
    } catch (error) {
      console.error("[v0] Error processing free tickets:", error)
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to process ticket registration. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (eventLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>No Active Event</CardTitle>
            <CardDescription>There is no active event at this time.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/">Go Home</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (!eventLoading && tickets.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>No Tickets Available</CardTitle>
            <CardDescription>There are no tickets available for this event yet.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/">Go Home</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId)
  const selectedTicketActivePrice = selectedTicket ? getActivePrice(selectedTicket) : 0

  const handleShopItemAddToCart = (item: ShopItem) => {
    if (!user) {
      setLoginModalOpen(true)
      return
    }

    // Check if item has options
    if (item.options && item.options.length > 0) {
      setSelectedShopItem(item)
      setOptionsModalOpen(true)
    } else {
      // No options, add directly to cart
      addToCart(item, 1)
      toast({
        title: "Added to cart",
        description: `${item.title} added to cart`,
      })
      setCartOpen(true)
    }
  }

  const handleAddToCartWithOptions = (selectedOptions: Record<string, string | string[]>, quantity: number) => {
    if (!selectedShopItem) return

    addToCart(selectedShopItem, quantity, selectedOptions)
    toast({
      title: "Added to cart",
      description: `${selectedShopItem.title} (x${quantity}) added to cart`,
    })
    setCartOpen(true)
  }

  return (
    <>
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-8">
            <Button variant="ghost" asChild className="mb-4">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Event
              </Link>
            </Button>
            <div className="flex items-center gap-3 mb-2">
              <Ticket className="h-8 w-8 text-primary" />
              <h1 className="text-3xl md:text-4xl font-bold">Purchase Tickets & Items</h1>
            </div>
            <p className="text-muted-foreground text-lg">Select your ticket type, quantity, and any items you'd like to purchase</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Event Tickets</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tickets.map((ticket) => {
              const isSoldOut =
                ticket.quantity_available !== null &&
                ticket.quantity_available !== undefined &&
                ticket.quantity_sold >= (ticket.quantity_available || 0)
              const remainingTickets =
                ticket.quantity_available !== null && ticket.quantity_available !== undefined
                  ? ticket.quantity_available - ticket.quantity_sold
                  : null

              const displayPrice = getActivePrice(ticket)

              return (
                <Card key={ticket.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-xl">{ticket.name}</CardTitle>
                      {isSoldOut && (
                        <Badge variant="destructive" className="shrink-0">
                          Sold Out
                        </Badge>
                      )}
                    </div>
                    {ticket.description && (
                      <CardDescription className="text-base">{ticket.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="space-y-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">
                          {Number(displayPrice) === 0 ? "Free" : `$${Number(displayPrice).toFixed(2)}`}
                        </span>
                        {Number(displayPrice) > 0 && <span className="text-muted-foreground">per ticket</span>}
                      </div>

                      {ticket.pricingTiers && ticket.pricingTiers.length > 0 && (
                        <div className="mt-3 space-y-2 border-t pt-3">
                          {ticket.pricingTiers.map((tier: any) => {
                            const startDate = tier.startDate ? new Date(tier.startDate) : null
                            const endDate = tier.endDate ? new Date(tier.endDate) : null

                            const formattedStart = startDate
                              ? startDate.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                              : ""
                            const formattedEnd = endDate
                              ? endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                              : ""

                            return (
                              <div
                                key={tier.id}
                                className={`text-sm p-2 rounded border ${
                                  tier.isActive ? "border-primary/50 bg-primary/5" : "border-muted bg-muted/50"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{tier.name}</span>
                                  <span className="font-semibold">${Number(tier.price).toFixed(2)}</span>
                                </div>
                                {(formattedStart || formattedEnd) && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {formattedStart && formattedEnd
                                      ? `${formattedStart} - ${formattedEnd}`
                                      : formattedStart || formattedEnd}
                                  </div>
                                )}
                                {tier.isActive && (
                                  <Badge variant="default" className="text-xs mt-1">
                                    Available Now
                                  </Badge>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {remainingTickets !== null && !isSoldOut && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span>{remainingTickets} tickets remaining</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => handleSelectTicket(ticket.id)}
                      disabled={isSoldOut}
                    >
                      {isSoldOut ? "Sold Out" : Number(displayPrice) === 0 ? "Register Free" : "Add to Cart"}
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        </div>

        {event?.enable_shop && featuredShopItems.length > 0 && (
          <section className="py-16 md:py-24 border-t bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="mb-12">
                <h2 className="text-3xl font-bold tracking-tight mb-2">Shop Items</h2>
                <p className="text-lg text-muted-foreground">Complete your event experience with these items</p>
              </div>
              <div className="mx-auto max-w-6xl">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {featuredShopItems.map((item: any) => (
                    <Card key={item.id} className="overflow-hidden flex flex-col">
                      {item.image_url && (
                        <div className="relative w-full h-48 bg-muted">
                          <Image
                            src={item.image_url || "/placeholder.svg"}
                            alt={item.title}
                            fill
                            className="object-contain"
                          />
                        </div>
                      )}
                      <CardHeader>
                        <CardTitle>{item.title}</CardTitle>
                        {item.description && (
                          <CardDescription className="line-clamp-2">{item.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="flex-1 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold">${Number(item.price).toFixed(2)}</span>
                          {item.quantity_type === "limited" && (
                            <span className="text-sm text-muted-foreground">
                              {(item.quantity_available || 0) - (item.quantity_sold || 0)} left
                            </span>
                          )}
                          {item.quantity_type === "preorder" && <Badge variant="secondary">Pre-order</Badge>}
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button 
                          className="w-full"
                          onClick={() => handleShopItemAddToCart(item as ShopItem)}
                        >
                          <ShoppingBag className="mr-2 h-4 w-4" />
                          Add to Cart
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      <Dialog open={showQuantityDialog} onOpenChange={setShowQuantityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Quantity</DialogTitle>
            <DialogDescription>
              {selectedTicket && `How many ${selectedTicket.name} tickets would you like?`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={
                selectedTicket?.quantity_available !== null && selectedTicket?.quantity_available !== undefined
                  ? selectedTicket.quantity_available - (selectedTicket.quantity_sold || 0)
                  : 100
              }
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number.parseInt(e.target.value) || 1))}
              className="mt-2"
            />
            {selectedTicket && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total:</span>
                  <span className="text-lg font-bold">
                    {selectedTicketActivePrice === 0 ? "Free" : `$${(selectedTicketActivePrice * quantity).toFixed(2)}`}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuantityDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleProceed} disabled={isSubmitting || quantity < 1}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedTicketActivePrice === 0 ? "Register" : "Add to Cart"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LoginModal
        open={loginModalOpen}
        onOpenChange={setLoginModalOpen}
        onSuccess={() => {
          toast({
            title: "Logged in successfully",
            description: "You can now purchase tickets",
          })
          if (selectedTicketId) {
            setQuantity(1)
            setShowQuantityDialog(true)
          }
        }}
      />

      <ProductOptionsModal
        item={selectedShopItem}
        open={optionsModalOpen}
        onClose={() => {
          setOptionsModalOpen(false)
          setSelectedShopItem(null)
        }}
        onAddToCart={handleAddToCartWithOptions}
      />
    </>
  )
}
