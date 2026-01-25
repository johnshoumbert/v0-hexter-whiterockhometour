"use client"

import { useEffect, useState, useMemo } from "react"
import { useEvent } from "@/contexts/event-context"
import { useAuth } from "@/contexts/auth-context"
import { Footer } from "@/components/footer"
import { FilterBar } from "@/components/filter-bar"
import { AuctionCard } from "@/components/auction-card"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { AuctionItemForm } from "@/components/auction-item-form"
import { Button } from "@/components/ui/button"
import { Loader2, Plus } from "lucide-react"

export const dynamic = "force-dynamic"

export default function AuctionsPage() {
  const { event, isLoading: eventLoading } = useEvent()
  const { user } = useAuth()
  const [auctions, setAuctions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddSheet, setShowAddSheet] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [sortBy, setSortBy] = useState("all")

  const isEventAdmin = (user?.is_admin || user?.isEventAdmin) && event?.id

  useEffect(() => {
    if (event?.id) {
      fetchAuctions()
    }
  }, [event?.id])

  const fetchAuctions = async () => {
    if (!event?.id) return

    try {
      const response = await fetch(`/api/events/${event.id}/auctions?status=all`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || errorData.error || "Failed to fetch auctions")
      }

      const data = await response.json()

      setAuctions(
        (data.auctions || []).map((auction: any) => {
          let imageUrl = "/placeholder.svg?height=400&width=600"
          try {
            const parsed = JSON.parse(auction.image_url)
            imageUrl = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : auction.image_url || imageUrl
          } catch {
            imageUrl = auction.image_url || imageUrl
          }

          // Determine bidder display based on silent auction setting
          let bidderDisplay = "--"
          if (auction.top_bidder_name) {
            bidderDisplay = auction.is_silent_auction ? "Someone" : auction.top_bidder_name
          }

          return {
            id: auction.id,
            slug: auction.slug || auction.id,
            title: auction.title,
            description: auction.description,
            image: imageUrl,
            currentBid: auction.current_bid || auction.min_bid,
            bidderInitials: auction.top_bidder_name?.substring(0, 2).toUpperCase() || "--",
            bidderName: bidderDisplay,
            bidderAvatar: auction.is_silent_auction ? null : auction.top_bidder_avatar,
            isSilent: auction.is_silent_auction,
            bidCount: Number.parseInt(auction.bid_count) || 0,
            endTime: new Date(auction.end_time),
            category: auction.category,
          }
        }),
      )
    } catch (error) {
    } finally {
      setIsLoading(false)
    }
  }

  const handleItemAdded = () => {
    setShowAddSheet(false)
    fetchAuctions()
  }

  const filteredAndSortedAuctions = useMemo(() => {
    let filtered = [...auctions]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (auction) => auction.title.toLowerCase().includes(query) || auction.description?.toLowerCase().includes(query),
      )
    }

    // Apply category filter
    if (category !== "all") {
      filtered = filtered.filter((auction) => auction.category === category)
    }

    // Apply sorting
    if (sortBy !== "all") {
      switch (sortBy) {
        case "ending-soon":
          filtered.sort((a, b) => {
            if (!a.endTime) return 1
            if (!b.endTime) return -1
            return new Date(a.endTime).getTime() - new Date(b.endTime).getTime()
          })
          break
        case "highest-bid":
          filtered = filtered.filter((auction) => auction.bidCount > 0)
          filtered.sort((a, b) => {
            const bidA = Number.parseFloat(a.currentBid) || 0
            const bidB = Number.parseFloat(b.currentBid) || 0
            return bidB - bidA
          })
          break
        case "lowest-bid":
          filtered.sort((a, b) => {
            const bidA = Number.parseFloat(a.currentBid) || 0
            const bidB = Number.parseFloat(b.currentBid) || 0
            return bidA - bidB
          })
          break
        case "newest":
          filtered.sort((a, b) => b.id.localeCompare(a.id))
          break
      }
    }

    return filtered
  }, [auctions, searchQuery, category, sortBy])

  if (eventLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <div className="border-b py-12 dark:bg-background">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-balance text-4xl font-bold tracking-tight">Active Auctions</h1>
                <p className="mt-2 text-pretty text-lg text-muted-foreground">
                  Browse and bid on amazing items to support our community
                </p>
              </div>
              {isEventAdmin && (
                <Button onClick={() => setShowAddSheet(true)} size="lg" className="flex-shrink-0">
                  <Plus className="mr-2 h-5 w-5" />
                  <span className="hidden sm:inline">Add New Item</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <FilterBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            category={category}
            setCategory={setCategory}
            sortBy={sortBy}
            setSortBy={setSortBy}
          />

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredAndSortedAuctions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {auctions.length === 0 ? "No active auctions at the moment" : "No auctions match your filters"}
              </p>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredAndSortedAuctions.map((auction) => (
                <AuctionCard key={auction.id} auction={auction} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      <Sheet open={showAddSheet} onOpenChange={setShowAddSheet}>
        <SheetContent side="right" className="sm:max-w-3xl md:max-w-4xl w-full p-0 overflow-hidden">
          <AuctionItemForm onSuccess={handleItemAdded} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
