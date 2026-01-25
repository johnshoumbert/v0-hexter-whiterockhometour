"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Gavel, Package, Users, Loader2, Handshake } from "lucide-react"
import { useEvent } from "@/contexts/event-context"
import { requestCache } from "@/lib/request-cache"

export default function AdminDashboardPage() {
  const { event } = useEvent()
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeAuctions: 0,
    totalItems: 0,
    activeBidders: 0,
    sponsorCount: 0,
    sponsorAmount: 0,
  })
  const [recentBids, setRecentBids] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchedEventIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (event?.id && event.id !== fetchedEventIdRef.current) {
      fetchedEventIdRef.current = event.id
      fetchDashboardData()
    }
  }, [event?.id])

  const fetchDashboardData = async () => {
    if (!event?.id) return

    setIsLoading(true)

    try {
      const [auctionsData, bidsData, usersData, paymentsData, sponsorsData] = await Promise.all([
        requestCache.fetch(
          `admin-auctions-${event.id}`,
          async () => {
            const response = await fetch(`/api/events/${event.id}/auctions?status=all`)
            if (!response.ok) throw new Error("Auctions API failed")
            return response.json()
          },
          15000, // Cache for 15 seconds
        ),
        requestCache.fetch(
          `admin-bids-${event.id}`,
          async () => {
            const response = await fetch(`/api/events/${event.id}/bids`)
            if (!response.ok) throw new Error("Bids API failed")
            return response.json()
          },
          15000,
        ),
        requestCache.fetch(
          `admin-users-${event.id}`,
          async () => {
            const response = await fetch(`/api/events/${event.id}/users`)
            if (!response.ok) throw new Error("Users API failed")
            return response.json()
          },
          30000, // Cache for 30 seconds
        ),
        requestCache.fetch(
          `admin-payments-${event.id}`,
          async () => {
            const response = await fetch(`/api/events/${event.id}/payments`)
            if (!response.ok) throw new Error("Payments API failed")
            return response.json()
          },
          15000,
        ),
        requestCache.fetch(
          `admin-sponsors-${event.id}`,
          async () => {
            const response = await fetch(`/api/events/${event.id}/sponsors`)
            if (!response.ok) return { sponsors: [] }
            return response.json()
          },
          15000,
        ),
      ])

      const activeAuctions = auctionsData.auctions?.filter((a: any) => a.status === "active").length || 0
      const totalItems = auctionsData.auctions?.length || 0
      const activeBidders = new Set(bidsData.bids?.map((b: any) => b.user_id)).size || 0
      const totalRevenue = paymentsData.payments?.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0) || 0
      const sponsorCount = sponsorsData.sponsors?.length || 0
      const sponsorAmount =
        sponsorsData.sponsors?.reduce((sum: number, s: any) => sum + Number(s.sponsorship_amount || 0), 0) || 0

      setStats({
        totalRevenue,
        activeAuctions,
        totalItems,
        activeBidders,
        sponsorCount,
        sponsorAmount,
      })

      const recent = bidsData.bids
        ?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 4)
        .map((bid: any) => ({
          item: bid.auction_title || "Unknown Item",
          bidder: bid.bidder_name?.substring(0, 2).toUpperCase() || "??",
          amount: Number(bid.amount || 0),
          time: getTimeAgo(new Date(bid.created_at)),
        }))

      setRecentBids(recent || [])
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      setError("Failed to load dashboard data. Please try refreshing the page.")
    } finally {
      setIsLoading(false)
    }
  }

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    if (seconds < 60) return `${seconds} sec ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days > 1 ? "s" : ""} ago`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <button
            onClick={() => {
              setError(null)
              fetchedEventIdRef.current = null
              setIsLoading(true)
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const statsData = [
    ...(event?.enable_sponsor
      ? [
          {
            title: "Sponsors",
            value: stats.sponsorCount.toString(),
            change: `$${stats.sponsorAmount.toLocaleString()}`,
            icon: Handshake,
          },
        ]
      : []),
    {
      title: "Total Revenue",
      value: `$${stats.totalRevenue.toLocaleString()}`,
      change: "From completed auctions",
      icon: DollarSign,
    },
    {
      title: "Active Auctions",
      value: stats.activeAuctions.toString(),
      change: `${stats.totalItems} total items`,
      icon: Gavel,
    },
    {
      title: "Total Items",
      value: stats.totalItems.toString(),
      change: "All auction items",
      icon: Package,
    },
    {
      title: "Active Bidders",
      value: stats.activeBidders.toString(),
      change: "Unique participants",
      icon: Users,
    },
  ]

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your auction platform</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className={`text-xs text-muted-foreground ${stat.title === "Sponsors" ? "font-bold" : ""}`}>
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Bids</CardTitle>
        </CardHeader>
        <CardContent>
          {recentBids.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No recent bids</p>
          ) : (
            <div className="space-y-4">
              {recentBids.map((bid, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{bid.item}</p>
                    <p className="text-sm text-muted-foreground">
                      {bid.bidder} • {bid.time}
                    </p>
                  </div>
                  <div className="font-semibold text-primary">${bid.amount}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
