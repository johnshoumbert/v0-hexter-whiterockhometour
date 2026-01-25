"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { Plus, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEvent } from "@/contexts/event-context"

export default function AdminAuctionsPage() {
  const { event } = useEvent()
  const [auctions, setAuctions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (event?.id) {
      fetchAuctions()
    }
  }, [event?.id])

  const fetchAuctions = async () => {
    if (!event?.id) return

    try {
      const response = await fetch(`/api/events/${event.id}/auctions?status=all`)
      if (response.ok) {
        const data = await response.json()
        setAuctions(
          data.auctions.map((auction: any) => ({
            id: auction.id,
            name: auction.title,
            items: auction.bid_count || 0,
            startDate: new Date(auction.start_time).toLocaleDateString(),
            endDate: new Date(auction.end_time).toLocaleDateString(),
            status: auction.status,
          })),
        )
      }
    } catch (error) {
      console.error("[v0] Failed to fetch auctions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const columns = [
    { key: "name", label: "Auction Name" },
    { key: "items", label: "Bids" },
    { key: "startDate", label: "Start Date" },
    { key: "endDate", label: "End Date" },
    { key: "status", label: "Status" },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8 p-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Auctions</h1>
          <p className="text-muted-foreground">Manage your auction events</p>
        </div>
        <Button onClick={() => router.push("/admin/auctions/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Auction
        </Button>
      </div>

      <DataTable columns={columns} data={auctions} />
    </div>
  )
}
