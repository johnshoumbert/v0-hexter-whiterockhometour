"use client"

import { useEffect, useState } from "react"
import { Loader2, Gavel, TrendingUp, Filter, Grid3x3, List, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Image from "next/image"
import { useEvent } from "@/contexts/event-context"
import { toast } from "@/components/ui/use-toast"
import { EndAuctionButton } from "@/components/end-auction-button"

export default function AdminBidsPage() {
  const { event } = useEvent()
  const [auctions, setAuctions] = useState([])
  const [filteredAuctions, setFilteredAuctions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAuction, setSelectedAuction] = useState<any>(null)
  const [auctionBids, setAuctionBids] = useState([])
  const [isLoadingBids, setIsLoadingBids] = useState(false)

  const [showWinnersOnly, setShowWinnersOnly] = useState(false)
  const [showEndedOnly, setShowEndedOnly] = useState(false)
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")

  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")

  useEffect(() => {
    if (event?.id) {
      fetchAuctions()
    }
  }, [event?.id])

  useEffect(() => {
    applyFilters()
  }, [auctions, showWinnersOnly, showEndedOnly, paymentStatusFilter, searchTerm])

  const fetchAuctions = async () => {
    if (!event?.id) return

    try {
      console.log("[v0] Fetching auctions...")
      const response = await fetch(`/api/events/${event.id}/auctions?status=all&include_winners=true`)
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Auctions fetched:", data.auctions?.length)
        setAuctions(data.auctions || [])
      }
    } catch (error) {
      console.error("[v0] Failed to fetch auctions:", error)
      setAuctions([])
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...auctions]

    if (showWinnersOnly) {
      filtered = filtered.filter((auction: any) => auction.has_winner)
    }

    if (showEndedOnly) {
      filtered = filtered.filter((auction: any) => {
        if (!auction.effective_end_time) return false
        return new Date(auction.effective_end_time) < new Date()
      })
    }

    if (paymentStatusFilter !== "all") {
      filtered = filtered.filter((auction: any) => auction.payment_status === paymentStatusFilter)
    }

    if (searchTerm) {
      filtered = filtered.filter((auction: any) => auction.title.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    setFilteredAuctions(filtered)
  }

  const fetchAuctionBids = async (auctionId: string) => {
    if (!event?.id) return

    setIsLoadingBids(true)
    try {
      console.log("[v0] Fetching bids for auction:", auctionId)
      const response = await fetch(`/api/events/${event.id}/bids?auction_id=${auctionId}`)
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Auction bids fetched:", data.bids?.length)
        setAuctionBids(data.bids || [])
      }
    } catch (error) {
      console.error("[v0] Failed to fetch auction bids:", error)
      setAuctionBids([])
    } finally {
      setIsLoadingBids(false)
    }
  }

  const handleAuctionClick = (auction: any) => {
    console.log("[v0] Opening auction panel:", auction.id)
    setSelectedAuction(auction)
    fetchAuctionBids(auction.id)
  }

  const getImageUrl = (imageUrl: any) => {
    try {
      if (!imageUrl) return "/placeholder.svg?height=200&width=400"
      if (typeof imageUrl === "string") {
        // Handle JSON string arrays
        if (imageUrl.startsWith("[")) {
          const parsed = JSON.parse(imageUrl)
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed[0]
          }
        }
        // Handle regular string URLs
        if (imageUrl.startsWith("http")) {
          return imageUrl
        }
      }
      // Handle array objects
      if (Array.isArray(imageUrl) && imageUrl.length > 0) {
        return imageUrl[0]
      }
      return "/placeholder.svg?height=200&width=400"
    } catch (error) {
      console.error("[v0] Error parsing image URL:", error)
      return "/placeholder.svg?height=200&width=400"
    }
  }

  const getPaymentBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default"
      case "pending":
        return "secondary"
      case "failed":
        return "destructive"
      default:
        return "outline"
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-8 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Auction Bids</h1>
            <p className="text-muted-foreground">View all bids across auction items</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => fetchAuctions()} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
            {event?.id && (
              <EndAuctionButton
                eventId={event.id}
                onSuccess={() => {
                  toast({
                    title: "Success",
                    description: "All auctions have been ended",
                  })
                  fetchAuctions()
                }}
              />
            )}
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="gap-2"
            >
              <Grid3x3 className="h-4 w-4" />
              Grid
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              Table
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Search by Title</Label>
                <Input
                  placeholder="Search auctions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Show Winners Only</Label>
                <Select value={showWinnersOnly ? "yes" : "no"} onValueChange={(v) => setShowWinnersOnly(v === "yes")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">All Auctions</SelectItem>
                    <SelectItem value="yes">Winners Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Auction Status</Label>
                <Select value={showEndedOnly ? "ended" : "all"} onValueChange={(v) => setShowEndedOnly(v === "ended")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Auctions</SelectItem>
                    <SelectItem value="ended">Ended Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {viewMode === "grid" ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredAuctions.map((auction: any) => (
              <Card
                key={auction.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleAuctionClick(auction)}
              >
                <CardHeader className="p-0">
                  <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
                    <Image
                      src={getImageUrl(auction.image_url) || "/placeholder.svg"}
                      alt={auction.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <Badge>{auction.status}</Badge>
                      {auction.has_winner && auction.payment_status && (
                        <Badge variant={getPaymentBadgeVariant(auction.payment_status)}>{auction.payment_status}</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <CardTitle className="text-lg mb-2">{auction.title}</CardTitle>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Gavel className="h-4 w-4" />
                      <span>{auction.bid_count || 0} bids</span>
                    </div>
                    <div className="flex items-center gap-1 font-semibold">
                      <TrendingUp className="h-4 w-4" />
                      <span>${auction.current_bid || auction.min_bid}</span>
                    </div>
                  </div>
                  {auction.has_winner && (
                    <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                      Winner: {auction.winner_name || "Unknown"}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Min Bid</TableHead>
                      <TableHead>Current Bid</TableHead>
                      <TableHead className="text-right">Bids</TableHead>
                      <TableHead>Winner</TableHead>
                      <TableHead>Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAuctions.map((auction: any) => (
                      <TableRow
                        key={auction.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleAuctionClick(auction)}
                      >
                        <TableCell className="font-medium max-w-xs truncate">{auction.title}</TableCell>
                        <TableCell>
                          <Badge>{auction.status}</Badge>
                        </TableCell>
                        <TableCell>${auction.min_bid}</TableCell>
                        <TableCell className="font-semibold">${auction.current_bid || auction.min_bid}</TableCell>
                        <TableCell className="text-right">{auction.bid_count || 0}</TableCell>
                        <TableCell className="text-sm">{auction.winner_name || "-"}</TableCell>
                        <TableCell>
                          {auction.payment_status ? (
                            <Badge variant={getPaymentBadgeVariant(auction.payment_status)}>
                              {auction.payment_status}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {filteredAuctions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Gavel className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No auction items match the selected filters</p>
          </div>
        )}
      </div>

      <Sheet open={!!selectedAuction} onOpenChange={(open) => !open && setSelectedAuction(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedAuction && (
            <>
              <SheetHeader>
                <SheetTitle>Auction Bids</SheetTitle>
              </SheetHeader>

              <Tabs defaultValue="details" className="mt-6">
                <TabsList className="w-full">
                  <TabsTrigger value="details" className="flex-1">
                    Item Details
                  </TabsTrigger>
                  <TabsTrigger value="bids" className="flex-1">
                    Bid History
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6 mt-6">
                  <div className="relative h-64 w-full overflow-hidden rounded-lg">
                    <Image
                      src={getImageUrl(selectedAuction.image_url) || "/placeholder.svg"}
                      alt={selectedAuction.title}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <div>
                        <h3 className="text-2xl font-bold">{selectedAuction.title}</h3>
                        <p className="text-muted-foreground mt-2">{selectedAuction.description}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                          <p className="text-sm text-muted-foreground">Category</p>
                          <p className="font-semibold">{selectedAuction.category || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Donor</p>
                          <p className="font-semibold">{selectedAuction.donor || "Anonymous"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Minimum Bid</p>
                          <p className="font-semibold">${selectedAuction.min_bid}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Current Bid</p>
                          <p className="font-semibold text-primary">
                            ${selectedAuction.current_bid || selectedAuction.min_bid}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Bids</p>
                          <p className="font-semibold">{selectedAuction.bid_count || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <Badge>{selectedAuction.status}</Badge>
                        </div>
                        {selectedAuction.has_winner && (
                          <div>
                            <p className="text-sm text-muted-foreground">Winner</p>
                            <p className="font-semibold">{selectedAuction.winner_name || "Unknown"}</p>
                          </div>
                        )}
                        {selectedAuction.payment_status && (
                          <div>
                            <p className="text-sm text-muted-foreground">Payment Status</p>
                            <Badge variant={getPaymentBadgeVariant(selectedAuction.payment_status)}>
                              {selectedAuction.payment_status}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="bids" className="space-y-4 mt-6">
                  {isLoadingBids ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : auctionBids && auctionBids.length > 0 ? (
                    auctionBids.map((bid: any) => (
                      <Card key={bid.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h4 className="font-semibold">{bid.user_name || "Anonymous"}</h4>
                              <p className="text-sm text-muted-foreground">{bid.user_email}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(bid.created_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold">${Number(bid.amount).toFixed(2)}</p>
                              {bid.is_highest && (
                                <Badge className="mt-1" variant="default">
                                  Highest Bid
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Gavel className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No bids placed yet</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
