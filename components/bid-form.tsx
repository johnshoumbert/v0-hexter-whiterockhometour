"use client"

import { useState } from "react"

import type React from "react"
import { useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Gavel, Plus, Minus, TrendingUp } from "lucide-react"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BidConsentDialog } from "@/components/bid-consent-dialog"

interface BidFormProps {
  currentBid: number
  auctionId: string
  bidIncrement?: number
  auction?: any
  onBidPlaced?: () => void
  hasEnded?: boolean // Added hasEnded prop to accept from parent
  event?: any // Added event prop to check invoice_enabled setting
}

export function BidForm({
  currentBid,
  auctionId,
  bidIncrement = 25,
  auction,
  onBidPlaced,
  hasEnded: hasEndedProp,
  event, // Accept event prop
}: BidFormProps) {
  const { user } = useAuth()
  const router = useRouter()
  const currentBidNum = Number(currentBid) || 0
  const bidIncrementNum = Number(bidIncrement) || 25

  const minBid =
    currentBidNum > Number(auction?.min_bid || 0) ? currentBidNum + bidIncrementNum : Number(auction?.min_bid || 0)

  const [bidAmount, setBidAmount] = useState(minBid.toString())
  const [maxBidAmount, setMaxBidAmount] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConsentDialog, setShowConsentDialog] = useState(false)
  const [pendingBidAmount, setPendingBidAmount] = useState(0)
  const [hasExistingAuth, setHasExistingAuth] = useState<boolean | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(false)

  const hasEnded = hasEndedProp ?? (auction?.end_time ? new Date(auction.end_time) < new Date() : false)

  useEffect(() => {
    if (user && auctionId) {
      checkExistingAuthorization()
    }
  }, [user, auctionId])

  const checkExistingAuthorization = async () => {
    if (!user) return

    try {
      setIsCheckingAuth(true)
      const response = await fetch(`/api/bids/check-authorization?auction_id=${auctionId}`)

      if (response.ok) {
        const data = await response.json()
        setHasExistingAuth(data.hasAuthorization)
        console.log("[v0] User has existing authorization:", data.hasAuthorization)
      } else {
        setHasExistingAuth(false)
      }
    } catch (error) {
      console.error("[v0] Failed to check authorization:", error)
      setHasExistingAuth(false)
    } finally {
      setIsCheckingAuth(false)
    }
  }

  const incrementBid = () => {
    const current = Number(bidAmount) || minBid
    setBidAmount((current + bidIncrementNum).toString())
  }

  const decrementBid = () => {
    const current = Number(bidAmount) || minBid
    const newAmount = current - bidIncrementNum
    if (newAmount >= minBid) {
      setBidAmount(newAmount.toString())
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!user) {
      toast.error("Please log in to place a bid")
      router.push("/login")
      return
    }

    if (hasEnded) {
      setError("This auction has ended")
      toast.error("This auction has ended")
      return
    }

    const amount = Number.parseFloat(bidAmount)

    if (isNaN(amount)) {
      setError("Please enter a valid amount")
      return
    }

    if (amount < minBid) {
      setError(`Bid must be at least $${minBid.toFixed(2)}`)
      return
    }

    setPendingBidAmount(amount)

    if (event?.invoice_enabled) {
      // Place bid without authorization when manual invoicing is enabled
      await placeBidWithoutAuth(amount)
    } else if (hasExistingAuth) {
      await placeBidWithExistingAuth(amount)
    } else {
      setShowConsentDialog(true)
    }
  }

  const handleMaxBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!user) {
      toast.error("Please log in to set a max bid")
      router.push("/login")
      return
    }

    if (hasEnded) {
      setError("This auction has ended")
      toast.error("This auction has ended")
      return
    }

    const amount = Number.parseFloat(maxBidAmount)

    if (isNaN(amount)) {
      setError("Please enter a valid amount")
      return
    }

    if (amount <= currentBidNum) {
      setError(`Max bid must be higher than current bid ($${currentBidNum.toFixed(2)})`)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/max-bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auction_id: auctionId, max_amount: amount }),
      })

      if (response.ok) {
        toast.success("Max bid set successfully!", {
          description: `Your maximum bid of $${amount.toFixed(2)} has been set. We'll automatically bid for you up to this amount.`,
          duration: 5000,
        })
        setMaxBidAmount("")
        if (onBidPlaced) {
          onBidPlaced()
        }
      } else {
        const data = await response.json()
        setError(data.error || "Failed to set max bid")
        toast.error(data.error || "Failed to set max bid")
      }
    } catch (error) {
      console.error("[v0] Failed to set max bid:", error)
      setError("Failed to set max bid")
      toast.error("Failed to set max bid")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBidAuthorized = () => {
    toast.success("Yay, you're winning!", {
      description: `You placed a bid of $${pendingBidAmount.toFixed(2)} on "${auction?.title || "this item"}". You are currently the highest bidder!`,
      duration: 5000,
    })
    setBidAmount("")
    setPendingBidAmount(0)
    if (onBidPlaced) {
      onBidPlaced()
    }
  }

  const placeBidWithExistingAuth = async (amount: number) => {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auction_id: auctionId,
          amount: amount,
          authorized: true,
          // Payment method is already on file, just flag as authorized
        }),
      })

      if (response.ok) {
        handleBidAuthorized()
      } else {
        const data = await response.json()
        setError(data.error || "Failed to place bid")
        toast.error(data.error || "Failed to place bid")
      }
    } catch (error) {
      console.error("[v0] Failed to place bid:", error)
      setError("Failed to place bid")
      toast.error("Failed to place bid")
    } finally {
      setIsSubmitting(false)
    }
  }

  const placeBidWithoutAuth = async (amount: number) => {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auction_id: auctionId,
          amount: amount,
          authorized: false, // No payment authorization needed for manual invoices
        }),
      })

      if (response.ok) {
        toast.success("Yay, you're winning!", {
          description: `You placed a bid of $${amount.toFixed(2)} on "${auction?.title || "this item"}". You are currently the highest bidder!`,
          duration: 5000,
        })
        setBidAmount("")
        setPendingBidAmount(0)
        if (onBidPlaced) {
          onBidPlaced()
        }
      } else {
        const data = await response.json()
        setError(data.error || "Failed to place bid")
        toast.error(data.error || "Failed to place bid")
      }
    } catch (error) {
      console.error("[v0] Failed to place bid:", error)
      setError("Failed to place bid")
      toast.error("Failed to place bid")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (hasEnded) {
    return (
      <div className="space-y-4">
        <Button disabled className="w-full" variant="secondary">
          <Gavel className="mr-2 h-4 w-4" />
          Auction Has Ended
        </Button>
        <p className="text-sm text-center text-muted-foreground">
          This auction has closed. Winners will be contacted shortly.
        </p>
      </div>
    )
  }

  if (!user) {
    return (
      <Button onClick={() => router.push("/login")} className="w-full">
        <Gavel className="mr-2 h-4 w-4" />
        Log In to Bid
      </Button>
    )
  }

  return (
    <>
      <Tabs defaultValue="bid" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bid">Bid Now</TabsTrigger>
          <TabsTrigger value="max">Max Bid</TabsTrigger>
        </TabsList>

        <TabsContent value="bid">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bid-amount">Your Bid Amount</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={decrementBid}
                  disabled={!bidAmount || Number(bidAmount) <= minBid}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="bid-amount"
                    type="number"
                    placeholder={minBid.toFixed(2)}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="pl-7"
                    min={minBid}
                    step={bidIncrementNum.toString()}
                  />
                </div>
                <Button type="button" variant="outline" size="icon" onClick={incrementBid}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum bid: ${minBid.toFixed(2)} (${bidIncrementNum.toFixed(2)} increment)
              </p>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <Gavel className="mr-2 h-4 w-4" />
              {isSubmitting ? "Placing Bid..." : "Place Your Bid"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="max">
          <form onSubmit={handleMaxBidSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="max-bid-amount">Maximum Bid Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="max-bid-amount"
                  type="number"
                  placeholder={(currentBidNum + bidIncrementNum).toFixed(2)}
                  value={maxBidAmount}
                  onChange={(e) => setMaxBidAmount(e.target.value)}
                  className="pl-7"
                  min={currentBidNum + bidIncrementNum}
                  step={bidIncrementNum.toString()}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Set your maximum bid and we'll automatically bid for you up to this amount
              </p>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <TrendingUp className="mr-2 h-4 w-4" />
              {isSubmitting ? "Setting Max Bid..." : "Set Max Bid"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <BidConsentDialog
        open={showConsentDialog}
        onOpenChange={setShowConsentDialog}
        auctionId={auctionId}
        auctionTitle={auction?.title || "Auction Item"}
        bidAmount={pendingBidAmount}
        onSuccess={handleBidAuthorized}
        eventId={auction?.event_id || ""}
      />
    </>
  )
}
