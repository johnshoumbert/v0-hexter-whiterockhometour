"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/data-table"
import { Plus, Loader2, Grid3x3, List, Search, Clock, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { AuctionItemForm } from "@/components/auction-item-form"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useEvent } from "@/contexts/event-context"
import { useToast } from "@/hooks/use-toast"
import { EndAuctionButton } from "@/components/end-auction-button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AdminItemsPage() {
  const { event } = useEvent()
  const { toast } = useToast()
  const [items, setItems] = useState([])
  const [filteredItems, setFilteredItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isResettingTimes, setIsResettingTimes] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "table">("table")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const router = useRouter()

  const handleFormSuccess = () => {
    setIsSheetOpen(false)
    fetchItems()
  }

  const handleFormDelete = () => {
    setIsSheetOpen(false)
    fetchItems()
  }

  console.log("[v0] Admin Items Page - Event from context:", event)
  console.log("[v0] Admin Items Page - Event ID:", event?.id)
  console.log("[v0] Admin Items Page - Current host:", typeof window !== "undefined" ? window.location.host : "SSR")

  useEffect(() => {
    console.log("[v0] useEffect triggered - event?.id:", event?.id)
    if (event?.id) {
      console.log("[v0] Calling fetchItems for event:", event.id)
      fetchItems()
    } else {
      console.log("[v0] No event ID, skipping fetchItems")
      setIsLoading(false)
    }
  }, [event?.id, currentPage, pageSize, statusFilter])

  useEffect(() => {
    let filtered = items

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase()
      filtered = items.filter(
        (item: any) =>
          item.name.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query) ||
          item.donor.toLowerCase().includes(query),
      )
    }

    if (sortColumn) {
      filtered = [...filtered].sort((a: any, b: any) => {
        const aValue = a[sortColumn]
        const bValue = b[sortColumn]

        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortDirection === "asc" ? aValue - bValue : bValue - aValue
        }

        const aStr = String(aValue).toLowerCase()
        const bStr = String(bValue).toLowerCase()

        if (sortDirection === "asc") {
          return aStr.localeCompare(bStr)
        } else {
          return bStr.localeCompare(aStr)
        }
      })
    }

    setFilteredItems(filtered)
  }, [searchQuery, items, sortColumn, sortDirection])

  const fetchItems = async () => {
    if (!event?.id) {
      console.log("[v0] fetchItems called but no event ID available")
      return
    }

    console.log("[v0] Fetching items for event:", event.id)
    setIsLoading(true)
    try {
      const url = `/api/events/${event.id}/auctions?status=${statusFilter}&page=${currentPage}&pageSize=${pageSize}`
      console.log("[v0] Fetching from URL:", url)

      const response = await fetch(url, {
        credentials: "include",
      })

      console.log("[v0] Fetch response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Fetched data:", data)
        console.log("[v0] Number of auctions:", data.auctions?.length || 0)

        if (data.pagination) {
          setTotalCount(data.pagination.total)
          setTotalPages(data.pagination.totalPages)
        }

        setItems(
          data.auctions.map((auction: any) => ({
            id: auction.id,
            name: auction.title,
            category: auction.category || "Uncategorized",
            startingBid: auction.min_bid || 0,
            currentBid: auction.current_bid || auction.min_bid || 0,
            donor: auction.donor || "Anonymous",
            status: auction.status,
            image_url: auction.image_url,
            _fullData: auction,
          })),
        )
      } else {
        console.error("[v0] Failed to fetch items - status:", response.status)
        const errorText = await response.text()
        console.error("[v0] Error response:", errorText)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch items:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (row: any) => {
    setEditingItem(row._fullData)
    setIsSheetOpen(true)
  }

  const handleRowClick = (row: any) => {
    handleEdit(row)
  }

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(columnKey)
      setSortDirection("asc")
    }
  }

  const handleResetTimes = async () => {
    if (!event?.id) return

    const confirmed = confirm(
      "Are you sure you want to reset all auction item start and end times to match the event times? This action cannot be undone.",
    )

    if (!confirmed) return

    setIsResettingTimes(true)
    try {
      const response = await fetch(`/api/events/${event.id}/auctions/reset-times`, {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Times Reset Successfully",
          description: `Updated ${data.updatedCount} auction items to match event times.`,
        })
        fetchItems()
      } else {
        const errorData = await response.json()
        toast({
          title: "Failed to Reset Times",
          description: errorData.error || "An error occurred while resetting times.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Failed to reset times:", error)
      toast({
        title: "Error",
        description: "Failed to reset auction item times.",
        variant: "destructive",
      })
    } finally {
      setIsResettingTimes(false)
    }
  }

  const getFirstImage = (imageUrl: string | null) => {
    if (!imageUrl) return "/placeholder.svg?height=200&width=200"
    try {
      const parsed = JSON.parse(imageUrl)
      return Array.isArray(parsed) ? parsed[0] : imageUrl
    } catch {
      return imageUrl
    }
  }

  const columns = [
    { key: "name", label: "Item Name", sortable: true },
    { key: "category", label: "Category", sortable: true },
    { key: "startingBid", label: "Starting Bid", sortable: true },
    { key: "currentBid", label: "Current Bid", sortable: true },
    { key: "donor", label: "Donor", sortable: true },
    { key: "status", label: "Status", sortable: true },
  ]

  const showingFrom = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const showingTo = Math.min(currentPage * pageSize, totalCount)

  if (isLoading && items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading items... (Event ID: {event?.id || "waiting for event"})</p>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-lg font-semibold">No event found for this domain</p>
        <p className="text-sm text-muted-foreground">
          Current host: {typeof window !== "undefined" ? window.location.host : "unknown"}
        </p>
        <p className="text-xs text-muted-foreground">
          Please ensure the event domain is configured correctly in the database.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-8 p-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Items {totalCount > 0 && <span className="text-muted-foreground">({totalCount})</span>}
            </h1>
            <p className="text-muted-foreground">Manage auction items</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => fetchItems()} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleResetTimes} disabled={isResettingTimes || !event?.id}>
              {isResettingTimes ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Clock className="mr-2 h-4 w-4" />
              )}
              Reset End Times
            </Button>
            {event?.id && (
              <EndAuctionButton
                eventId={event.id}
                onSuccess={() => {
                  toast({
                    title: "Success",
                    description: "All auctions have been ended",
                  })
                  fetchItems()
                }}
              />
            )}
            <Button
              onClick={() => {
                setEditingItem(null)
                setIsSheetOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="ended">Ended</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("table")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Showing {showingFrom}-{showingTo} of {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Items per page:</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number.parseInt(value))
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || isLoading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {viewMode === "table" ? (
          <DataTable
            columns={columns}
            data={filteredItems}
            onEdit={handleEdit}
            onRowClick={handleRowClick}
            onSort={handleSort}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item: any) => (
              <Card key={item.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
                <div className="relative aspect-square" onClick={() => handleEdit(item)}>
                  <Image
                    src={getFirstImage(item.image_url) || "/placeholder.svg?height=200&width=200"}
                    alt={item.name}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg?height=200&width=200"
                    }}
                  />
                  <Badge className="absolute top-2 right-2">{item.status}</Badge>
                </div>
                <CardContent className="p-4" onClick={() => handleEdit(item)}>
                  <h3 className="font-semibold truncate mb-1">{item.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{item.category}</p>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Starting Bid</p>
                      <p className="font-semibold">${item.startingBid}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Current Bid</p>
                      <p className="font-semibold text-primary">${item.currentBid}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredItems.length === 0 && !isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No items found matching your search.</p>
          </div>
        )}
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col h-full overflow-hidden">
          <AuctionItemForm initialData={editingItem} onSuccess={handleFormSuccess} onDelete={handleFormDelete} />
        </SheetContent>
      </Sheet>
    </>
  )
}
