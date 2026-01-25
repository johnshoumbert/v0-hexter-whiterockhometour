"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Footer } from "@/components/footer"
import { CountdownTimer } from "@/components/countdown-timer"
import { BidForm } from "@/components/bid-form"
import { BidHistory } from "@/components/bid-history"
import { AuctionCard } from "@/components/auction-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { AuctionItemForm } from "@/components/auction-item-form"
import { FloatingHelpButton } from "@/components/floating-help-button"
import { Loader2, User, Tag, Heart, Trophy, X, Pencil, ShoppingCart, QrCode } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useEvent } from "@/contexts/event-context"
import { toast } from "sonner"
import { AuctionShareButton } from "@/components/auction-share-button"
import { AuctionContactModal } from "@/components/auction-contact-modal"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function AuctionDetailPage() {
  const params = useParams()
  const { user } = useAuth()
  const { event } = useEvent()
  const [auction, setAuction] = useState<any>(null)
  const [bidHistory, setBidHistory] = useState<any[]>([])
  const [similarItems, setSimilarItems] = useState<any[]>([])
  const [relatedAuctions, setRelatedAuctions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [likeCount, setLikeCount] = useState(0)
  const [userHasLiked, setUserHasLiked] = useState(false)
  const [isCurrentWinner, setIsCurrentWinner] = useState(false)
  const [canCancelBid, setCanCancelBid] = useState(false)
  const [highestBidId, setHighestBidId] = useState<string | null>(null)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [showEndAuctionDialog, setShowEndAuctionDialog] = useState(false)
  const [isEndingAuction, setIsEndingAuction] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchAuction()
    }
  }, [params.id])

  useEffect(() => {
    if (auction?.id) {
      fetchBidHistory()
      fetchSimilarItems()
      fetchLikes()
      fetchRelatedAuctions()
    }
  }, [auction?.id])

  useEffect(() => {
    if (!auction?.id) return

    const hasBiddingStarted = auction?.start_time ? new Date() >= new Date(auction.start_time) : true
    const hasAuctionEnded = auction?.end_time ? new Date() >= new Date(auction.end_time) : false
    const isAuctionLive = hasBiddingStarted && !hasAuctionEnded

    if (!isAuctionLive) return

    // Poll every 30 seconds
    const intervalId = setInterval(() => {
      fetchAuction()
      fetchBidHistory()
    }, 30000)

    return () => clearInterval(intervalId)
  }, [auction?.id, auction?.start_time, auction?.end_time])

  const fetchAuction = async () => {
    try {
      console.log("[v0] Fetching auction:", params.id)
      const response = await fetch(`/api/auctions/${params.id}`)

      console.log("[v0] Auction API response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] Failed to fetch auction, response:", errorText)
        throw new Error(`Failed to fetch auction: ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] Auction data received:", data.auction?.title)

      let images = []
      try {
        const parsed = JSON.parse(data.auction.image_url)
        images = Array.isArray(parsed) ? parsed : [data.auction.image_url]
      } catch {
        images = data.auction.image_url ? [data.auction.image_url] : []
      }

      const auctionWithEffectiveTimes = {
        ...data.auction,
        images,
        start_time: data.auction.effective_start_time || data.auction.start_time,
        end_time: data.auction.effective_end_time || data.auction.end_time,
      }

      console.log("[v0] Auction end time:", auctionWithEffectiveTimes.end_time)
      setAuction(auctionWithEffectiveTimes)
    } catch (error) {
      console.error("[v0] Failed to fetch auction:", error)
      toast.error("Failed to load auction details")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchBidHistory = async () => {
    try {
      console.log("[v0] Fetching bid history for auction:", auction.id)
      const response = await fetch(`/api/bids?auction_id=${auction.id}`)
      console.log("[v0] Bid history response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Bid history data received:", data.bids?.length || 0, "bids")

        const bids = data.bids.map((bid: any) => ({
          id: bid.id,
          bidder: bid.user_name || "Anonymous",
          bidderImage: bid.profile_image,
          amount: bid.amount,
          time: new Date(bid.created_at).toLocaleString(),
          userId: bid.user_id,
        }))
        setBidHistory(bids)
        console.log("[v0] Bid history state updated with", bids.length, "bids")

        if (user && bids.length >= 2) {
          const topTwoBids = bids.slice(0, 2)
          const userHasTopTwo = topTwoBids.every((bid: any) => bid.userId === user.id)
          setCanCancelBid(userHasTopTwo)
          setIsCurrentWinner(bids[0].userId === user.id)
          setHighestBidId(bids[0].id)
        } else if (user && bids.length > 0) {
          setIsCurrentWinner(bids[0].userId === user.id)
          setHighestBidId(bids[0].id)
          setCanCancelBid(false)
        }
      } else {
        const errorText = await response.text()
        console.error("[v0] Failed to fetch bid history, status:", response.status, "response:", errorText)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch bid history:", error)
    }
  }

  const handleBidPlaced = () => {
    fetchAuction()
    fetchBidHistory()
  }

  const fetchSimilarItems = async () => {
    try {
      const response = await fetch("/api/auctions?status=active")
      if (response.ok) {
        const data = await response.json()
        setSimilarItems(
          data.auctions
            .filter((a: any) => a.id !== auction.id)
            .slice(0, 3)
            .map((a: any) => {
              let imageUrl = "/placeholder.svg?height=400&width=600"
              try {
                const parsed = JSON.parse(a.image_url)
                imageUrl = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : a.image_url || imageUrl
              } catch {
                imageUrl = a.image_url || imageUrl
              }

              return {
                id: a.id,
                title: a.title,
                image: imageUrl,
                currentBid: a.current_bid || a.min_bid,
                endTime: new Date(a.end_time),
                category: a.category,
                slug: a.slug,
              }
            }),
        )
      }
    } catch (error) {
      console.error("[v0] Failed to fetch similar items:", error)
    }
  }

  const fetchLikes = async () => {
    try {
      const response = await fetch(`/api/likes?auction_id=${auction.id}`)
      if (response.ok) {
        const data = await response.json()
        setUserHasLiked(data.userHasLiked)
        setLikeCount(data.likeCount)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch likes:", error)
    }
  }

  const fetchRelatedAuctions = async () => {
    try {
      const response = await fetch(`/api/auctions?category=${auction.category}&status=active`)
      if (response.ok) {
        const data = await response.json()
        setRelatedAuctions(
          data.auctions
            .filter((a: any) => a.id !== auction.id)
            .slice(0, 3)
            .map((a: any) => {
              let imageUrl = "/placeholder.svg?height=400&width=600"
              try {
                const parsed = JSON.parse(a.image_url)
                imageUrl = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : a.image_url || imageUrl
              } catch {
                imageUrl = a.image_url || imageUrl
              }

              return {
                id: a.id,
                title: a.title,
                image: imageUrl,
                currentBid: a.current_bid || a.min_bid,
                endTime: new Date(a.end_time),
                category: a.category,
                slug: a.slug,
              }
            }),
        )
      }
    } catch (error) {
      console.error("[v0] Failed to fetch related auctions:", error)
    }
  }

  const handleLike = async () => {
    if (!user) {
      toast.error("Please log in to like items")
      return
    }

    try {
      const response = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auction_id: auction.id }),
      })

      if (response.ok) {
        const data = await response.json()
        setUserHasLiked(data.liked)
        setLikeCount((prev) => (data.liked ? prev + 1 : prev - 1))
        toast.success(data.liked ? "Added to favorites" : "Removed from favorites")
      }
    } catch (error) {
      console.error("[v0] Failed to toggle like:", error)
      toast.error("Failed to update favorite")
    }
  }

  const handleCancelBid = async () => {
    if (!highestBidId) return

    try {
      const response = await fetch(`/api/bids/${highestBidId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || "Bid cancelled successfully")
        handleBidPlaced()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to cancel bid")
      }
    } catch (error) {
      console.error("[v0] Failed to cancel bid:", error)
      toast.error("Failed to cancel bid")
    }
  }

  const handleBuyNow = async () => {
    if (!user) {
      toast.error("Please log in to buy this item")
      return
    }

    if (!auction.buy_now_price) {
      toast.error("Buy now not available for this item")
      return
    }

    toast.success("Redirecting to checkout...")
    // TODO: Implement buy now checkout flow
  }

  const handleEditSuccess = () => {
    setIsEditSheetOpen(false)
    fetchAuction()
    toast.success("Auction updated successfully")
  }

  const handleEditDelete = () => {
    setIsEditSheetOpen(false)
    toast.success("Auction deleted successfully")
    window.location.href = "/auctions"
  }

  const handleContactClick = () => {
    if (!user) {
      toast.error("Please log in to send a message to the auction admin")
      return
    }
    setIsContactModalOpen(true)
  }

  const handleEndAuction = async () => {
    if (!auction?.id || !event?.id) return

    setIsEndingAuction(true)
    try {
      const response = await fetch(`/api/events/${event.id}/auctions/${auction.id}/end`, {
        method: "POST",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to end auction")
      }

      const data = await response.json()

      setShowEndAuctionDialog(false)

      // Fetch updated auction data to reflect the ended status
      await fetchAuction()
      await fetchBidHistory()

      // Show success message after data is refreshed
      toast.success(data.message || "Auction ended successfully! Winner has been notified and charged.")
    } catch (error) {
      console.error("[v0] Failed to end auction:", error)
      toast.error(error instanceof Error ? error.message : "Failed to end auction")
    } finally {
      setIsEndingAuction(false)
    }
  }

  const isEventAdmin = (user?.is_admin || user?.isEventAdmin) && event?.id === auction?.event_id

  const hasBiddingStarted = auction?.start_time ? new Date() >= new Date(auction.start_time) : true
  const hasAuctionEnded = auction?.end_time ? new Date() >= new Date(auction.end_time) : false

  console.log("[v0] Auction ended check:", {
    hasEnded: hasAuctionEnded,
    endTime: auction?.end_time,
    now: new Date().toISOString(),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!auction) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-muted-foreground">Auction not found</p>
      </div>
    )
  }

  const showBuyNow = auction.buy_now_price && (auction.buy_type === "buy_now" || auction.buy_type === "hybrid")
  const showBidding = auction.buy_type !== "buy_now"

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <div className="mb-6 text-sm text-muted-foreground">
            <a href="/auctions" className="hover:text-foreground">
              Auctions
            </a>
            <span className="mx-2">/</span>
            <span>{auction.title}</span>
          </div>

          {/* Main Content */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Left Column - Images */}
            <div className="space-y-4">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-muted">
                <img
                  src={auction.images?.[selectedImage] || "/placeholder.svg?height=600&width=800"}
                  alt={auction.title}
                  className="h-full w-full object-fit"
                />
              </div>
              {auction.images && auction.images.length > 1 && (
                <div className="grid grid-cols-4 gap-4">
                  {auction.images.map((image: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`aspect-square overflow-hidden rounded-lg border bg-muted transition-all hover:border-primary ${
                        selectedImage === index ? "border-primary ring-2 ring-primary" : ""
                      }`}
                    >
                      <img
                        src={image || "/placeholder.svg?height=200&width=200"}
                        alt={`${auction.title} ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column - Details */}
            <div className="space-y-6">
              {isEventAdmin && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditSheetOpen(true)}
                    className="flex-1 sm:flex-none"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Auction Item
                  </Button>
                  {!hasAuctionEnded && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowEndAuctionDialog(true)}
                      className="flex-1 sm:flex-none"
                    >
                      End Auction Now
                    </Button>
                  )}
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Badge>{auction.category || "Uncategorized"}</Badge>
                  {isCurrentWinner && (
                    <Badge variant="default" className="bg-green-600">
                      <Trophy className="h-3 w-3 mr-1" />
                      You're Winning!
                    </Badge>
                  )}
                  {auction.buy_type === "buy_now" && <Badge variant="secondary">Buy Now Only</Badge>}
                  {auction.buy_type === "hybrid" && <Badge variant="secondary">Auction + Buy Now</Badge>}
                  {auction.buy_type === "in_person" && (
                    <Badge variant="outline" className="border-purple-500 text-purple-700 dark:text-purple-300">
                      <QrCode className="h-3 w-3 mr-1" />
                      In-Person Only
                    </Badge>
                  )}
                </div>
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-balance text-3xl font-bold tracking-tight">{auction.title}</h1>
                  <div className="flex gap-2">
                    <AuctionShareButton
                      auctionId={auction.id}
                      auctionTitle={auction.title}
                      auctionImage={auction.images?.[0]}
                      auctionDescription={auction.description}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleLike}
                      className={userHasLiked ? "text-red-500 border-red-500" : ""}
                    >
                      <Heart className={`h-5 w-5 ${userHasLiked ? "fill-current" : ""}`} />
                    </Button>
                  </div>
                </div>
                {likeCount > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {likeCount} {likeCount === 1 ? "person likes" : "people like"} this
                  </p>
                )}
              </div>

              {showBidding && auction.buy_type !== "in_person" && (
                <div className="rounded-lg border bg-card p-6">
                  {!hasBiddingStarted && auction.start_time ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Bidding opens in:</p>
                      <CountdownTimer endTime={new Date(auction.start_time)} />
                    </div>
                  ) : !hasAuctionEnded && auction.end_time ? (
                    <CountdownTimer endTime={new Date(auction.end_time)} />
                  ) : hasAuctionEnded ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Ended
                      </span>
                    </div>
                  ) : null}
                </div>
              )}

              {auction.buy_type === "in_person" && (
                <div className="rounded-lg border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                        <QrCode className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="font-semibold text-purple-900 dark:text-purple-100">In-Person Bidding Only</h3>
                        <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                          This item is only available for bidding at the physical event. Scan the QR code below at the
                          event to place your bid.
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-900 p-4 rounded-lg inline-block">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
                          alt="QR Code for in-person bidding"
                          className="w-48 h-48"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`
                          const link = document.createElement("a")
                          link.href = qrUrl
                          link.download = `qr-code-${auction.slug || auction.id}.png`
                          link.click()
                          toast.success("QR code downloaded")
                        }}
                        className="border-purple-300 dark:border-purple-700"
                      >
                        Download QR Code
                      </Button>
                      {!hasAuctionEnded && auction.end_time && (
                        <div className="pt-2 border-t border-purple-200 dark:border-purple-800">
                          <p className="text-sm text-purple-700 dark:text-purple-300 mb-2">Bidding ends in:</p>
                          <CountdownTimer endTime={new Date(auction.end_time)} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4 rounded-lg border bg-card p-6">
                {showBidding && auction.buy_type !== "in_person" && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {!hasBiddingStarted ? "Starting Bid" : "Current Bid"}
                      </p>
                      <p className="text-3xl font-bold text-primary">
                        ${(auction.current_bid || auction.min_bid || 0).toLocaleString()}
                      </p>
                      {hasBiddingStarted && (
                        <p className="text-sm text-muted-foreground">{auction.bid_count || 0} bids</p>
                      )}
                    </div>
                    {auction.priceless && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3">
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                          ✨ Valued At: Priceless
                        </p>
                      </div>
                    )}
                    {hasBiddingStarted && canCancelBid && (
                      <div className="rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-4">
                        <p className="text-sm text-amber-900 dark:text-amber-100 mb-2">
                          You have the top two bids. You can cancel your highest bid if needed.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelBid}
                          className="border-amber-300 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-100 dark:hover:bg-amber-900 bg-transparent"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel Highest Bid
                        </Button>
                      </div>
                    )}
                    {!hasBiddingStarted ? (
                      <div className="rounded-lg bg-muted border p-4 text-center">
                        <p className="text-sm text-muted-foreground">Bidding will open when the auction starts</p>
                      </div>
                    ) : (
                      <BidForm
                        currentBid={auction.current_bid || auction.min_bid || 0}
                        auctionId={auction.id}
                        bidIncrement={auction.bid_increment || 25}
                        auction={auction}
                        onBidPlaced={handleBidPlaced}
                        hasEnded={hasAuctionEnded}
                        event={event}
                      />
                    )}
                  </>
                )}

                {auction.buy_type === "in_person" && (
                  <div>
                    <p className="text-sm text-muted-foreground">Current Bid (In-Person Only)</p>
                    <p className="text-3xl font-bold text-primary">
                      ${(auction.current_bid || auction.min_bid || 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">{auction.bid_count || 0} bids</p>
                    {auction.priceless && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3 mt-3">
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                          ✨ Valued At: Priceless
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {showBuyNow && (
                  <div className={showBidding ? "pt-4 mt-4 border-t" : ""}>
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground">Buy It Now</p>
                      <p className="text-3xl font-bold text-green-600">${auction.buy_now_price.toLocaleString()}</p>
                    </div>
                    <Button onClick={handleBuyNow} className="w-full" size="lg">
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      Buy Now
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Description</h2>
                <p className="text-pretty leading-relaxed text-muted-foreground">
                  {auction.description || "No description available"}
                </p>
              </div>

              <div className="rounded-lg border border-pink-200 dark:border-pink-900 dark:bg-pink-950/30 p-4">
                <p className="text-sm">
                  Have a question about this item or auction?{" "}
                  <Button
                    variant="link"
                    onClick={handleContactClick}
                    className="text-pink-600 dark:text-pink-400 font-semibold hover:underline p-0 h-auto"
                  >
                    {user ? "Contact Us" : "Log in to send a message to Auction Admin"}
                  </Button>
                </p>
              </div>

              {(auction.pickup_instructions ||
                (auction.use_event_pickup_instructions && event?.pickup_instructions)) && (
                <div className="space-y-3">
                  <h2 className="text-xl font-semibold">Pickup/Shipping Instructions</h2>
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {auction.use_event_pickup_instructions ? event?.pickup_instructions : auction.pickup_instructions}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {auction.donor && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Donated by:</span>
                    <span className="font-medium">{auction.donor}</span>
                  </div>
                )}
                {auction.tags && (
                  <div className="flex items-start gap-2 text-sm">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-wrap gap-2">
                      {auction.tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {hasBiddingStarted && showBidding && (
            <div className="mt-12">
              {bidHistory.length > 0 ? (
                <BidHistory bids={bidHistory} isSilentAuction={event?.is_silent_auction || false} />
              ) : (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Bid History</h2>
                  <div className="rounded-lg border bg-card p-6">
                    <p className="text-center text-muted-foreground">No bids yet. Be the first to bid!</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {similarItems.length > 0 && (
            <div className="mt-16">
              <h2 className="mb-6 text-2xl font-bold">Similar Items</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {similarItems.map((item) => (
                  <AuctionCard key={item.id} auction={item} />
                ))}
              </div>
            </div>
          )}

          {relatedAuctions.length > 0 && (
            <div className="mt-16">
              <h2 className="mb-6 text-2xl font-bold">Related Auctions</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {relatedAuctions.map((item) => (
                  <AuctionCard key={item.id} auction={item} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />

      <div data-floating-help>
        <FloatingHelpButton />
      </div>

      <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-3xl md:max-w-4xl p-0 flex flex-col overflow-hidden">
          <AuctionItemForm initialData={auction} onSuccess={handleEditSuccess} onDelete={handleEditDelete} />
        </SheetContent>
      </Sheet>

      {auction && (
        <AuctionContactModal
          open={isContactModalOpen}
          onOpenChange={setIsContactModalOpen}
          auctionId={auction.id}
          auctionTitle={auction.title}
        />
      )}

      <AlertDialog open={showEndAuctionDialog} onOpenChange={setShowEndAuctionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Auction Now?</AlertDialogTitle>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>This will immediately end the auction and perform the following actions:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Set the auction end time to now</li>
                <li>Email the winner notification</li>
                <li>Charge the winner's saved payment method (if authorized)</li>
              </ul>
              <p className="font-semibold text-destructive mt-4">This action cannot be undone.</p>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isEndingAuction}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEndAuction}
              disabled={isEndingAuction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isEndingAuction ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ending...
                </>
              ) : (
                "End Auction"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
