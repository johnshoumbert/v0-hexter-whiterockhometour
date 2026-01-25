"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useEvent } from "@/contexts/event-context"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Loader2, Search, Gavel, ChevronDown } from "lucide-react"
import Link from "next/link"
import { CountdownTimer } from "@/components/countdown-timer"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Bid {
  id: number
  amount: number
  created_at: string
  event_id: string
  auction: {
    id: number
    title: string
    image_url: string
    end_time: string
    status: string
  }
  event: {
    domain: string
    name: string
  }
  is_winning: boolean
  current_highest_bid: number
}

export default function BidsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { event, isMainDomain } = useEvent()
  const router = useRouter()
  const [currentEventBids, setCurrentEventBids] = useState<Bid[]>([])
  const [allBids, setAllBids] = useState<Bid[]>([])
  const [filteredCurrentBids, setFilteredCurrentBids] = useState<Bid[]>([])
  const [filteredAllBids, setFilteredAllBids] = useState<Bid[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchBids()
    }
  }, [user, event])

  const fetchBids = async () => {
    try {
      const allBidsResponse = await fetch("/api/bids?user=me")
      if (allBidsResponse.ok) {
        const allBidsData = await allBidsResponse.json()
        setAllBids(allBidsData.bids)

        if (event && !isMainDomain) {
          const currentEventBidsResponse = await fetch(`/api/bids?user=me&event_id=${event.id}`)
          if (currentEventBidsResponse.ok) {
            const currentEventBidsData = await currentEventBidsResponse.json()
            setCurrentEventBids(currentEventBidsData.bids)
          }
        }
      }
    } catch (error) {
      console.error("[v0] Failed to fetch bids:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let filtered = [...currentEventBids]

    if (searchQuery) {
      filtered = filtered.filter((bid) => bid.auction.title.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    if (statusFilter === "winning") {
      filtered = filtered.filter((bid) => bid.is_winning)
    } else if (statusFilter === "outbid") {
      filtered = filtered.filter((bid) => !bid.is_winning)
    }

    setFilteredCurrentBids(filtered)
  }, [currentEventBids, searchQuery, statusFilter])

  useEffect(() => {
    let filtered = [...allBids]

    if (searchQuery) {
      filtered = filtered.filter(
        (bid) =>
          bid.auction.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bid.event.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (statusFilter === "winning") {
      filtered = filtered.filter((bid) => bid.is_winning)
    } else if (statusFilter === "outbid") {
      filtered = filtered.filter((bid) => !bid.is_winning)
    }

    setFilteredAllBids(filtered)
  }, [allBids, searchQuery, statusFilter])

  const getAuctionUrl = (bid: Bid) => {
    const eventDomain = bid.event.domain

    if (eventDomain === "localhost" || !eventDomain) {
      const currentHost = typeof window !== "undefined" ? window.location.hostname : ""

      if (currentHost.includes("vusercontent.net")) {
        return `https://${currentHost}/auctions/${bid.auction.id}`
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ""
      return baseUrl ? `${baseUrl}/auctions/${bid.auction.id}` : `/auctions/${bid.auction.id}`
    }

    return `https://${eventDomain}/auctions/${bid.auction.id}`
  }

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

  const BidCard = ({ bid }: { bid: Bid }) => (
    <Card key={bid.id} className="overflow-hidden">
      <div className="aspect-video relative overflow-hidden bg-muted">
        <img
          src={bid.auction.image_url || "/placeholder.svg?height=200&width=400&query=auction item"}
          alt={bid.auction.title}
          className="object-cover w-full h-full"
          onError={(e) => {
            e.currentTarget.src = "/placeholder.svg?height=200&width=400"
          }}
        />
        {bid.is_winning ? (
          <Badge className="absolute top-2 right-2 bg-green-500">Winning</Badge>
        ) : (
          <Badge className="absolute top-2 right-2 bg-red-500">Outbid</Badge>
        )}
      </div>
      <CardHeader>
        <CardTitle className="line-clamp-1">{bid.auction.title}</CardTitle>
        <CardDescription>
          <CountdownTimer endTime={bid.auction.end_time} />
          {bid.event?.name && <div className="text-xs text-muted-foreground mt-1">{bid.event.name}</div>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Your Bid:</span>
          <span className="font-semibold">${Number(bid.amount).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Current Highest:</span>
          <span className="font-semibold">${Number(bid.current_highest_bid).toFixed(2)}</span>
        </div>
        <Button asChild className="w-full mt-4">
          <a href={getAuctionUrl(bid)} target="_blank" rel="noopener noreferrer">
            View Auction
          </a>
        </Button>
      </CardContent>
    </Card>
  )

  // Separate bids by event for accordion structure
  const otherEventBids = filteredAllBids.filter((bid) => bid.event_id !== event?.id)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">My Bids</h1>
        <p className="text-muted-foreground">Track your active bids and auction status</p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search bids..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Bid Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Bids</SelectItem>
            <SelectItem value="winning">Winning</SelectItem>
            <SelectItem value="outbid">Outbid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Current Event Bids */}
      {filteredCurrentBids.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              <CardTitle>Bids - This Event</CardTitle>
            </div>
            <CardDescription>
              {filteredCurrentBids.length} {filteredCurrentBids.length === 1 ? "bid" : "bids"} in {event?.event_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredCurrentBids.map((bid) => (
                <BidCard key={bid.id} bid={bid} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other Events Bids */}
      {otherEventBids.length > 0 && (
        <Collapsible>
          <Card>
            <CardHeader>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Gavel className="h-5 w-5" />
                    <div>
                      <CardTitle>Bids - Other Events</CardTitle>
                      <CardDescription>
                        {otherEventBids.length} {otherEventBids.length === 1 ? "bid" : "bids"} from other events
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronDown className="h-5 w-5 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {otherEventBids.map((bid) => (
                    <BidCard key={bid.id} bid={bid} />
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* No Bids Message */}
      {allBids.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">You haven't placed any bids yet</p>
            <Button asChild>
              <Link href="/auctions">Browse Auctions</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No Filtered Results Message */}
      {filteredCurrentBids.length === 0 && otherEventBids.length === 0 && allBids.length > 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No bids match your search criteria</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
