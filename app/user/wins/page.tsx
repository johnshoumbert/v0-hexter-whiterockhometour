"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Loader2, CheckCircle2, Clock, Package, QrCode, Search, Trophy, ChevronDown } from "lucide-react"
import Link from "next/link"
import QRCode from "qrcode"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEvent } from "@/contexts/event-context"

interface Win {
  id: string
  final_bid: number | string
  payment_status: string
  delivered: boolean
  pickup_status?: string
  released_at?: string
  invoice_id?: string
  invoice_number?: string
  event_id?: string
  auction_id: string
  auction_title: string
  auction_description?: string
  auction_image_url?: string
}

export default function WinsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { event } = useEvent()
  const router = useRouter()
  const [wins, setWins] = useState<Win[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedWin, setSelectedWin] = useState<Win | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [paymentFilter, setPaymentFilter] = useState<string>("all")
  const [deliveryFilter, setDeliveryFilter] = useState<string>("all")
  const [isCreatingInvoice, setIsCreatingInvoice] = useState<string | null>(null)
  const [filteredWins, setFilteredWins] = useState<Win[]>([])

  // Separate wins by event
  const currentEventWins = wins.filter((win) => win.event_id === event?.id)
  const otherEventWins = wins.filter((win) => win.event_id !== event?.id)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchWins()
    }
  }, [user])

  const fetchWins = async () => {
    try {
      const response = await fetch("/api/winners?user=me")
      if (response.ok) {
        const data = await response.json()
        const winsWithNumbers = data.wins.map((win: any) => ({
          id: win.id,
          final_bid: Number.parseFloat(win.final_bid.toString()),
          payment_status: win.payment_status,
          delivered: win.delivered,
          pickup_status: win.pickup_status,
          released_at: win.released_at,
          invoice_id: win.invoice_id,
          invoice_number: win.invoice_number,
          event_id: win.event_id,
          auction_id: win.auction_id,
          auction_title: win.auction_title,
          auction_description: win.auction_description,
          auction_image_url: win.auction_image_url,
        }))
        setWins(winsWithNumbers)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch wins:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePayment = async (win: Win) => {
    // If invoice already exists, navigate to it
    if (win.invoice_number) {
      router.push(`/pay/${win.invoice_number}`)
      return
    }

    // Create invoice for this win
    if (!win.event_id) {
      console.error("[v0] No event_id for win")
      return
    }

    setIsCreatingInvoice(win.id)
    try {
      const response = await fetch(`/api/events/${win.event_id}/winners/${win.id}/request-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ createOnly: true }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.invoiceNumber) {
          router.push(`/pay/${data.invoiceNumber}`)
        }
      } else {
        console.error("[v0] Failed to create invoice")
      }
    } catch (error) {
      console.error("[v0] Failed to create payment:", error)
    } finally {
      setIsCreatingInvoice(null)
    }
  }

  const handlePickupClick = async (win: Win) => {
    setSelectedWin(win)

    // Generate QR code URL for admin pickup confirmation
    const pickupUrl = `${window.location.origin}/admin/pickup/${win.id}`
    try {
      const qrDataUrl = await QRCode.toDataURL(pickupUrl, {
        width: 300,
        margin: 2,
      })
      setQrCodeUrl(qrDataUrl)
    } catch (error) {
      console.error("[v0] Failed to generate QR code:", error)
    }
  }

  // Apply filters to wins
  const applyFilters = (winsToFilter: Win[]) => {
    let filtered = [...winsToFilter]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (win) =>
          win.auction_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          win.auction_description?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Payment status filter
    if (paymentFilter !== "all") {
      if (paymentFilter === "paid") {
        filtered = filtered.filter((win) => win.payment_status === "completed" || win.payment_status === "succeeded")
      } else if (paymentFilter === "pending") {
        filtered = filtered.filter((win) => win.payment_status === "pending")
      }
    }

    // Delivery status filter
    if (deliveryFilter !== "all") {
      if (deliveryFilter === "delivered") {
        filtered = filtered.filter((win) => win.delivered === true)
      } else if (deliveryFilter === "pending") {
        filtered = filtered.filter((win) => win.delivered === false)
      }
    }

    return filtered
  }

  const filteredCurrentEventWins = applyFilters(currentEventWins)
  const filteredOtherEventWins = applyFilters(otherEventWins)

  const renderWinCard = (win: Win) => (
    <Card key={win.id}>
      <div className="aspect-video relative overflow-hidden bg-muted">
        <img
          src={win.auction_image_url || "/placeholder.svg?height=200&width=400&query=auction item"}
          alt={win.auction_title}
          className="object-cover w-full h-full"
          onError={(e) => {
            e.currentTarget.src = "/placeholder.svg?height=200&width=400"
          }}
        />
      </div>
      <CardHeader>
        <CardTitle>{win.auction_title}</CardTitle>
        <CardDescription className="line-clamp-2">{win.auction_description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Winning Bid:</span>
          <span className="text-2xl font-bold">
            ${typeof win.final_bid === "string" ? win.final_bid : win.final_bid.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {win.payment_status === "completed" || win.payment_status === "succeeded" ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <Badge variant="outline" className="border-green-500 text-green-500">
                Paid
              </Badge>
            </>
          ) : (
            <>
              <Clock className="h-4 w-4 text-yellow-500" />
              <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                Payment Pending
              </Badge>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {win.delivered ? (
            <>
              <Package className="h-4 w-4 text-green-500" />
              <div className="flex flex-col gap-0.5">
                <Badge variant="outline" className="border-green-500 text-green-500">
                  Picked Up
                </Badge>
                {win.released_at && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(win.released_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <Package className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline">Awaiting Pickup</Badge>
            </>
          )}
        </div>

        {win.payment_status !== "completed" && win.payment_status !== "succeeded" ? (
          <Button onClick={() => handlePayment(win)} className="w-full" disabled={isCreatingInvoice === win.id}>
            {isCreatingInvoice === win.id ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Invoice...
              </>
            ) : (
              "Pay Now"
            )}
          </Button>
        ) : win.pickup_status === "completed" || win.delivered ? (
          <Button variant="outline" className="w-full bg-transparent" disabled>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Item Picked Up
          </Button>
        ) : (
          <Button onClick={() => handlePickupClick(win)} className="w-full">
            <QrCode className="mr-2 h-4 w-4" />
            Pick-up Item
          </Button>
        )}
      </CardContent>
    </Card>
  )

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Wins</h1>
        <p className="text-muted-foreground">Items you've won at auction</p>
      </div>

      {wins.length > 0 && (
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search wins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Payment Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="completed">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Select value={deliveryFilter} onValueChange={setDeliveryFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Delivery Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Delivery</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Current Event Wins */}
      {filteredCurrentEventWins.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              <CardTitle>Wins - This Event</CardTitle>
            </div>
            <CardDescription>
              {filteredCurrentEventWins.length} {filteredCurrentEventWins.length === 1 ? "win" : "wins"} from {event?.event_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCurrentEventWins.map((win) => renderWinCard(win))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other Events Wins */}
      {filteredOtherEventWins.length > 0 && (
        <Collapsible>
          <Card>
            <CardHeader>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    <div>
                      <CardTitle>Wins - Other Events</CardTitle>
                      <CardDescription>
                        {filteredOtherEventWins.length} {filteredOtherEventWins.length === 1 ? "win" : "wins"} from other events
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronDown className="h-5 w-5 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredOtherEventWins.map((win) => renderWinCard(win))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* No Wins Message */}
      {filteredCurrentEventWins.length === 0 && filteredOtherEventWins.length === 0 && wins.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">You haven't won any auctions yet</p>
            <Button asChild>
              <Link href="/auctions">Browse Auctions</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No Filtered Results Message */}
      {filteredCurrentEventWins.length === 0 && filteredOtherEventWins.length === 0 && wins.length > 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No wins match your search criteria</p>
          </CardContent>
        </Card>
      )}
      <Dialog open={!!selectedWin} onOpenChange={() => setSelectedWin(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Item Pickup</DialogTitle>
            <DialogDescription>Show this QR code to an admin to collect your item</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedWin && (
              <>
                <div className="text-center space-y-2">
                  <h3 className="font-semibold">{selectedWin.auction_title}</h3>
                  <p className="text-sm text-muted-foreground">
                    Winning Bid: $
                    {typeof selectedWin.final_bid === "string"
                      ? selectedWin.final_bid
                      : selectedWin.final_bid.toFixed(2)}
                  </p>
                </div>

                {qrCodeUrl && (
                  <div className="flex justify-center p-4 bg-white rounded-lg">
                    <img src={qrCodeUrl || "/placeholder.svg"} alt="Pickup QR Code" className="w-64 h-64" />
                  </div>
                )}

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium">Pickup Instructions:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Present this QR code to an event admin</li>
                    <li>Admin will scan the code to confirm your identity</li>
                    <li>Once verified, your item will be released</li>
                    <li>Please bring a valid ID for verification</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
