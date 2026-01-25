"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useEvent } from "@/contexts/event-context"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Loader2,
  CheckCircle2,
  Clock,
  Package,
  Search,
  MoreVertical,
  User,
  LinkIcon,
  CreditCard,
  DollarSign,
  Download,
  RefreshCw,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { UserProfileSheet } from "@/components/user-profile-sheet"
import { EndAuctionButton } from "@/components/end-auction-button"
import { PaymentRequestModal } from "@/components/payment-request-modal"
import { InvoiceSheet } from "@/components/invoice-sheet"
import { WinnerDetailsSheet } from "@/components/admin/winner-details-sheet"

interface Win {
  id: string
  final_bid: number | string
  payment_status: string
  delivered: boolean
  pickup_status?: string
  release_code?: string
  released_at?: string
  user_id: string
  user_name: string
  user_email: string
  auction_id: string
  auction_title: string
  auction_description?: string
  auction_image_url?: string
  bid_authorized?: boolean
  stripe_payment_method_id?: string
  invoice_id?: string
  invoice_number?: string
  invoice_status?: string
}

interface BidderDetails {
  id: string
  name: string
  email: string
  phone?: string
  created_at: string
}

export default function AdminWinnersPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { event } = useEvent()
  const router = useRouter()
  const { toast } = useToast()
  const [wins, setWins] = useState<Win[]>([])
  const [filteredWins, setFilteredWins] = useState<Win[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [paymentFilter, setPaymentFilter] = useState<string>("all")
  const [deliveryFilter, setDeliveryFilter] = useState<string>("all")
  const [pickupFilter, setPickupFilter] = useState<string>("all")
  const [groupBy, setGroupBy] = useState<string>("none")
  const [selectedBidder, setSelectedBidder] = useState<any>(null)
  const [isGeneratingLink, setIsGeneratingLink] = useState<string | null>(null)
  const [paymentRequestWin, setPaymentRequestWin] = useState<Win | null>(null)
  const [isChargingWinner, setIsChargingWinner] = useState<string | null>(null)
  const [isChargingGroup, setIsChargingGroup] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [invoiceSheetOpen, setInvoiceSheetOpen] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [winnerDetailsOpen, setWinnerDetailsOpen] = useState(false)
  const [selectedWinner, setSelectedWinner] = useState<Win | null>(null)

  useEffect(() => {
    if (user && event?.id) {
      fetchWins()
    }
  }, [user, event?.id])

  const fetchWins = async () => {
    if (!event?.id) return

    console.log("[v0] Fetching wins for event:", event.id)

    try {
      const response = await fetch(`/api/winners?event_id=${event.id}`)
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Wins fetched:", data.wins.length)
        const winsWithNumbers = data.wins.map((win: Win) => ({
          ...win,
          final_bid: Number.parseFloat(win.final_bid.toString()),
        }))
        setWins(winsWithNumbers)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch wins:", error)
      toast({
        title: "Error",
        description: "Failed to fetch winners",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGeneratePaymentLink = async (win: Win) => {
    setIsGeneratingLink(win.id)
    try {
      const response = await fetch("/api/stripe/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winId: win.id,
          amount: typeof win.final_bid === "string" ? Number.parseFloat(win.final_bid) : win.final_bid,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // Copy payment link to clipboard
        await navigator.clipboard.writeText(data.url)
        toast({
          title: "Payment Link Generated",
          description: "Payment link copied to clipboard",
        })
      } else {
        throw new Error("Failed to generate payment link")
      }
    } catch (error) {
      console.error("[v0] Failed to generate payment link:", error)
      toast({
        title: "Error",
        description: "Failed to generate payment link",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingLink(null)
    }
  }

  const handleViewBidder = async (win: Win) => {
    try {
      const response = await fetch(`/api/users/${win.user_id}`)
      if (response.ok) {
        const data = await response.json()
        const bidderData = {
          id: data.user.id,
          name: data.user.name || win.user_name,
          email: data.user.email || win.user_email,
          phone: data.user.phone,
          role: data.user.role || "user",
          bidsPlaced: 0,
          totalSpent: 0,
          joinedDate: new Date(data.user.created_at).toLocaleDateString(),
        }
        setSelectedBidder(bidderData)
      } else {
        throw new Error("Failed to fetch bidder details")
      }
    } catch (error) {
      console.error("[v0] Failed to fetch bidder:", error)
      toast({
        title: "Error",
        description: "Failed to load bidder profile",
        variant: "destructive",
      })
    }
  }

  const handleChargeNow = async (win: Win) => {
    setIsChargingWinner(win.id)
    try {
      const response = await fetch(`/api/events/${event?.id}/winners/${win.id}/charge`, {
        method: "POST",
      })

      if (response.ok) {
        toast({
          title: "Payment Processed",
          description: "Winner has been charged successfully",
        })
        fetchWins() // Refresh the list
      } else {
        const data = await response.json()
        throw new Error(data.error || "Failed to charge winner")
      }
    } catch (error: any) {
      console.error("[v0] Failed to charge winner:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      })
    } finally {
      setIsChargingWinner(null)
    }
  }

  const handleBulkCharge = async (groupWins: Win[]) => {
    if (groupWins.length === 0) return

    const userId = groupWins[0].user_id
    const groupKey = groupWins[0].user_name || groupWins[0].user_email

    setIsChargingGroup(groupKey)
    try {
      const response = await fetch(`/api/events/${event?.id}/winners/bulk-charge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Payment Processed",
          description: `Successfully charged ${data.itemCount} items for $${data.totalAmount.toFixed(2)}`,
        })
        fetchWins() // Refresh the list
      } else {
        const data = await response.json()
        throw new Error(data.error || "Failed to charge winners")
      }
    } catch (error: any) {
      console.error("[v0] Failed to bulk charge:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      })
    } finally {
      setIsChargingGroup(null)
    }
  }

  const handleBulkPaymentRequest = async (groupWins: Win[]) => {
    if (groupWins.length === 0) return

    const totalAmount = groupWins.reduce((sum, win) => {
      const amount = typeof win.final_bid === "string" ? Number.parseFloat(win.final_bid) : win.final_bid
      return sum + amount
    }, 0)

    // Open payment request modal with combined data
    setPaymentRequestWin({
      ...groupWins[0],
      final_bid: totalAmount,
      auction_title: `${groupWins.length} items`,
    })
  }

  const handleExportCSV = async () => {
    if (!event?.id) return

    setIsExporting(true)
    try {
      const response = await fetch(`/api/events/${event.id}/winners/export-csv`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `winners-export-${new Date().toISOString().split("T")[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast({
          title: "Export Successful",
          description: "Winners data has been exported to CSV",
        })
      } else {
        throw new Error("Failed to export CSV")
      }
    } catch (error) {
      console.error("[v0] Export CSV error:", error)
      toast({
        title: "Export Failed",
        description: "Could not export winners data",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleViewInvoice = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId)
    setPaymentRequestWin(null)
    setInvoiceSheetOpen(true)
  }

  useEffect(() => {
    let filtered = [...wins]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (win) =>
          win.auction_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          win.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          win.user_email.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Payment status filter
    if (paymentFilter !== "all") {
      filtered = filtered.filter((win) => win.payment_status === paymentFilter)
    }

    // Delivery status filter
    if (deliveryFilter !== "all") {
      const deliveryStatus = deliveryFilter === "delivered"
      filtered = filtered.filter((win) => win.delivered === deliveryStatus)
    }

    // Pickup status filter
    if (pickupFilter !== "all") {
      filtered = filtered.filter((win) => win.pickup_status === pickupFilter)
    }

    setFilteredWins(filtered)
  }, [wins, searchQuery, paymentFilter, deliveryFilter, pickupFilter])

  // Helper function to group wins by different criteria
  const getGroupedWins = () => {
    if (groupBy === "none") {
      return { All: filteredWins }
    }

    if (groupBy === "winner") {
      const grouped: Record<string, Win[]> = {}
      filteredWins.forEach((win) => {
        const key = win.user_name || win.user_email
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(win)
      })
      return grouped
    }

    if (groupBy === "pickup") {
      const grouped: Record<string, Win[]> = {
        "Not Set": [],
        Pending: [],
        Ready: [],
        "Picked Up": [],
      }
      filteredWins.forEach((win) => {
        const status = win.pickup_status || "Not Set"
        if (!grouped[status]) grouped[status] = []
        grouped[status].push(win)
      })
      return grouped
    }

    if (groupBy === "delivery") {
      const grouped: Record<string, Win[]> = {
        Pending: [],
        Delivered: [],
      }
      filteredWins.forEach((win) => {
        const key = win.delivered ? "Delivered" : "Pending"
        grouped[key].push(win)
      })
      return grouped
    }

    return { All: filteredWins }
  }

  const groupedWins = getGroupedWins()

  // Helper to render win cards
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
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="truncate">{win.auction_title}</CardTitle>
            <CardDescription className="line-clamp-1">{win.user_name}</CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleGeneratePaymentLink(win)}
                disabled={isGeneratingLink === win.id || win.payment_status === "completed"}
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                {isGeneratingLink === win.id ? "Generating..." : "Generate Payment Link"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleViewBidder(win)}>
                <User className="mr-2 h-4 w-4" />
                View Bidder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Winning Bid:</span>
          <span className="text-2xl font-bold">
            ${typeof win.final_bid === "string" ? win.final_bid : win.final_bid.toFixed(2)}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {win.payment_status === "completed" ? (
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
                {win.bid_authorized ? (
                  <Badge variant="outline" className="border-green-500 text-green-500 text-xs">
                    Authorized
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-red-500 text-red-500 text-xs">
                    Not Authorized
                  </Badge>
                )}
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
                      {new Date(win.released_at).toLocaleDateString()} at {new Date(win.released_at).toLocaleTimeString()}
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
        </div>

        <div className="pt-2 text-sm text-muted-foreground">
          <p className="truncate">{win.user_email}</p>
          {win.invoice_id && win.invoice_number && (
            <div className="mt-1 space-y-0.5">
              <p className="text-xs font-medium">Invoice: {win.invoice_number}</p>
              {win.invoice_status && (
                <p className="text-xs capitalize">Status: {win.invoice_status}</p>
              )}
            </div>
          )}
        </div>

        {win.payment_status === "completed" ? (
          <Button
            className="w-full"
            onClick={() => {
              setSelectedWinner(win)
              setWinnerDetailsOpen(true)
            }}
          >
            <Package className="mr-2 h-4 w-4" />
            View Details
          </Button>
        ) : (
          <div className="space-y-2">
            {win.bid_authorized && win.stripe_payment_method_id && (
              <Button className="w-full" onClick={() => handleChargeNow(win)} disabled={isChargingWinner === win.id}>
                {isChargingWinner === win.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Charging...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Charge Now
                  </>
                )}
              </Button>
            )}
            <Button 
              className="w-full bg-transparent" 
              variant="outline" 
              onClick={() => {
                if (win.invoice_id) {
                  handleViewInvoice(win.invoice_id)
                } else {
                  setPaymentRequestWin(win)
                }
              }}
            >
              <DollarSign className="mr-2 h-4 w-4" />
              {win.invoice_id ? "View Payment" : "Request Payment"}
            </Button>
          </div>
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

  return (
    <div className="space-y-6 pt-6 px-4 md:px-0 md:pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Winners</h1>
          <p className="text-muted-foreground">Manage auction winners and payments for current event</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchWins()} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {wins.length > 0 && (
            <Button variant="outline" onClick={handleExportCSV} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </>
              )}
            </Button>
          )}
          {event?.id && (
            <EndAuctionButton
              eventId={event.id}
              onSuccess={() => {
                toast({
                  title: "Success",
                  description: "All auctions have been ended and winners notified",
                })
                fetchWins()
              }}
            />
          )}
        </div>
      </div>

      {wins.length > 0 && (
        <>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by item, bidder name, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Group By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Grouping</SelectItem>
                <SelectItem value="winner">By Winner</SelectItem>
                <SelectItem value="pickup">By Pickup Status</SelectItem>
                <SelectItem value="delivery">By Delivery Status</SelectItem>
              </SelectContent>
            </Select>
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
            <Select value={pickupFilter} onValueChange={setPickupFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Pickup Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pickup</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="picked_up">Picked Up</SelectItem>
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
        </>
      )}

      {wins.length === 0 && !isLoading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Ended Auctions Yet</h3>
            <p className="text-muted-foreground mb-4">
              Auctions must be ended before winners appear here. Click "End All Auctions" to close bidding and determine
              winners.
            </p>
          </CardContent>
        </Card>
      ) : filteredWins.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No winners match your search criteria</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedWins).map(([groupName, groupWins]) => {
            if (groupWins.length === 0) return null

            const unpaidWins = groupWins.filter((w) => w.payment_status !== "completed")
            const hasAnyAuthorized = groupWins.some((w) => w.bid_authorized && w.stripe_payment_method_id)
            const allUnpaidAuthorized = unpaidWins.every((w) => w.bid_authorized && w.stripe_payment_method_id)
            const totalAmount = unpaidWins.reduce((sum, win) => {
              const amount = typeof win.final_bid === "string" ? Number.parseFloat(win.final_bid) : win.final_bid
              return sum + amount
            }, 0)

            return (
              <div key={groupName} className="space-y-4">
                {groupBy !== "none" && (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-semibold">{groupName}</h2>
                      <Badge variant="secondary">{groupWins.length} items</Badge>
                      {unpaidWins.length > 0 && (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                          ${totalAmount.toFixed(2)} unpaid
                        </Badge>
                      )}
                    </div>
                    {groupBy === "winner" && unpaidWins.length > 1 && (
                      <div className="flex gap-2">
                        {hasAnyAuthorized ? (
                          <Button
                            size="sm"
                            onClick={() => handleBulkCharge(unpaidWins)}
                            disabled={isChargingGroup === groupName}
                          >
                            {isChargingGroup === groupName ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Charging...
                              </>
                            ) : (
                              <>
                                <CreditCard className="mr-2 h-4 w-4" />
                                Charge All (${totalAmount.toFixed(2)})
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleBulkPaymentRequest(unpaidWins)}>
                            <DollarSign className="mr-2 h-4 w-4" />
                            Request Payment (${totalAmount.toFixed(2)})
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {groupWins.map((win) => renderWinCard(win))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {paymentRequestWin && (
        <PaymentRequestModal
          open={!!paymentRequestWin}
          onOpenChange={(open) => !open && setPaymentRequestWin(null)}
          winnerId={paymentRequestWin.id}
          eventId={event?.id || ""}
          winnerEmail={paymentRequestWin.user_email}
          amount={
            typeof paymentRequestWin.final_bid === "string"
              ? Number.parseFloat(paymentRequestWin.final_bid)
              : paymentRequestWin.final_bid
          }
          onViewInvoice={handleViewInvoice}
        />
      )}

      {selectedInvoiceId && (
        <InvoiceSheet
          open={invoiceSheetOpen}
          onOpenChange={setInvoiceSheetOpen}
          invoiceId={selectedInvoiceId}
          eventId={event?.id || ""}
          winnerId={paymentRequestWin?.id}
          onDelete={() => {
            setInvoiceSheetOpen(false)
            setSelectedInvoiceId(null)
            fetchWins()
          }}
        />
      )}

      <UserProfileSheet
        open={!!selectedBidder}
        onOpenChange={(open) => !open && setSelectedBidder(null)}
        bidder={selectedBidder}
      />

      <WinnerDetailsSheet
        open={winnerDetailsOpen}
        onOpenChange={setWinnerDetailsOpen}
        winner={selectedWinner}
        onUpdate={() => {
          fetchWins()
        }}
      />
    </div>
  )
}
