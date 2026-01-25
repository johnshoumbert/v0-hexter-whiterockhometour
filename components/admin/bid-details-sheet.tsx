"use client"

import { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

interface BidDetailsSheetProps {
  isOpen: boolean
  onClose: () => void
  bid: any
  eventId: string
}

export function BidDetailsSheet({ isOpen, onClose, bid, eventId }: BidDetailsSheetProps) {
  const [auctionDetails, setAuctionDetails] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isOpen && bid?.auction_id && eventId) {
      fetchAuctionDetails()
    }
  }, [isOpen, bid?.auction_id, eventId])

  const fetchAuctionDetails = async () => {
    if (!bid?.auction_id || !eventId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/events/${eventId}/auctions/${bid.auction_id}`)
      if (response.ok) {
        const data = await response.json()
        setAuctionDetails(data)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch auction details:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Bid Details</SheetTitle>
          <SheetDescription>View auction item and bid information</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : auctionDetails ? (
          <div className="space-y-6 mt-6">
            {/* Auction Details */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Auction Item</p>
                  <h3 className="text-xl font-semibold">{auctionDetails.title}</h3>
                </div>

                {auctionDetails.description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{auctionDetails.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Starting Bid</p>
                    <p className="text-lg font-semibold">${Number(auctionDetails.min_bid).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Bid Increment</p>
                    <p className="text-lg font-semibold">${Number(auctionDetails.bid_increment).toFixed(2)}</p>
                  </div>
                </div>

                {auctionDetails.category && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Category</p>
                    <Badge variant="secondary">{auctionDetails.category}</Badge>
                  </div>
                )}

                {auctionDetails.donor && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Donor</p>
                    <p className="text-sm">{auctionDetails.donor}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bid Information */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="border-b pb-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Your Bid</p>
                  <p className="text-3xl font-bold text-primary">${Number(bid.amount).toFixed(2)}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Bid Status</p>
                    {bid.is_winning ? (
                      <Badge className="bg-green-600">Winning Bid</Badge>
                    ) : (
                      <Badge variant="destructive">Outbid</Badge>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Placed On</p>
                    <p className="text-sm">{new Date(bid.created_at).toLocaleString()}</p>
                  </div>
                </div>

                {auctionDetails.has_winner && (
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Auction Status</p>
                    <Badge variant="secondary">
                      Sold - Final Bid: ${Number(auctionDetails.winner_final_bid).toFixed(2)}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>Unable to load auction details</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
