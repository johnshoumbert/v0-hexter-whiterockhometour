"use client"

import { useEffect, useState } from "react"
import { Loader2, Search, Filter, ChevronDown, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useEvent } from "@/contexts/event-context"
import { cn } from "@/lib/utils"
import { OrderDetailsSheet } from "@/components/admin/order-details-sheet"
import { BidDetailsSheet } from "@/components/admin/bid-details-sheet"
import { UserProfileSheet } from "@/components/user-profile-sheet"

export const dynamic = "force-dynamic"

export default function AdminBiddersPage() {
  const { event } = useEvent()
  const [bidders, setBidders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedBidder, setSelectedBidder] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("details")
  const [bidderBids, setBidderBids] = useState([])
  const [bidderMessages, setBidderMessages] = useState([])
  const [bidderOrders, setBidderOrders] = useState([])
  const [isLoadingBids, setIsLoadingBids] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const [isOrderSheetOpen, setIsOrderSheetOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [isBidSheetOpen, setIsBidSheetOpen] = useState(false)
  const [selectedBid, setSelectedBid] = useState<any>(null)

  useEffect(() => {
    if (event?.id) {
      fetchBidders()
    }
  }, [event?.id])

  const fetchBidders = async () => {
    if (!event?.id) return

    try {
      const response = await fetch(`/api/events/${event.id}/users`)
      if (response.ok) {
        const data = await response.json()
        const users = data.users || []
        setBidders(
          users.map((user: any) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone || "N/A",
            role: user.event_role || "participant",
            bidsPlaced: user.bid_count || 0,
            totalSpent: user.total_spent || 0,
            joinedDate: new Date(user.created_at).toLocaleDateString(),
          })),
        )
      } else {
        setBidders([])
      }
    } catch (error) {
      console.error("[v0] Failed to fetch bidders:", error)
      setBidders([])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchBidderBids = async (bidderId: string) => {
    if (!event?.id) return

    setIsLoadingBids(true)
    try {
      const response = await fetch(`/api/events/${event.id}/bids?user=${bidderId}`)
      if (response.ok) {
        const data = await response.json()
        setBidderBids(data.bids || [])
      }
    } catch (error) {
      console.error("[v0] Failed to fetch bidder bids:", error)
      setBidderBids([])
    } finally {
      setIsLoadingBids(false)
    }
  }

  const fetchBidderMessages = async (bidderId: string) => {
    if (!event?.id) return

    setIsLoadingMessages(true)
    try {
      const response = await fetch(`/api/events/${event.id}/messages?userId=${bidderId}`)
      if (response.ok) {
        const data = await response.json()
        setBidderMessages(data.messages || [])
      }
    } catch (error) {
      console.error("[v0] Failed to fetch messages:", error)
      setBidderMessages([])
    } finally {
      setIsLoadingMessages(false)
    }
  }

  const fetchBidderOrders = async (bidderId: string) => {
    if (!event?.id) return

    setIsLoadingOrders(true)
    try {
      const response = await fetch(`/api/events/${event.id}/shop/orders?userId=${bidderId}`)
      if (response.ok) {
        const data = await response.json()
        setBidderOrders(data.orders || [])
      }
    } catch (error) {
      console.error("[v0] Failed to fetch orders:", error)
      setBidderOrders([])
    } finally {
      setIsLoadingOrders(false)
    }
  }

  const handleRowClick = (bidder: any) => {
    setSelectedBidder(bidder)
    setActiveTab("details")
  }

  const handleTabChange = (tabName: string) => {
    setActiveTab(tabName)
    if (tabName === "bids" && selectedBidder && bidderBids.length === 0) {
      fetchBidderBids(selectedBidder.id)
    } else if (tabName === "messages" && selectedBidder && bidderMessages.length === 0) {
      fetchBidderMessages(selectedBidder.id)
    } else if (tabName === "orders" && selectedBidder && bidderOrders.length === 0) {
      fetchBidderOrders(selectedBidder.id)
    }
  }

  const handleOpenOrderSheet = async (order: any) => {
    if (!event?.id) return

    try {
      const response = await fetch(`/api/events/${event.id}/shop/orders/${order.id}`)
      if (response.ok) {
        const orderData = await response.json()
        setSelectedOrder(orderData)
        setIsOrderSheetOpen(true)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch order details:", error)
    }
  }

  const handleOpenBidSheet = (bid: any) => {
    setSelectedBid(bid)
    setIsBidSheetOpen(true)
  }

  const filteredAndSortedBidders = bidders
    .filter((bidder) => {
      const matchesSearch =
        bidder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bidder.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bidder.phone.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesRole = roleFilter === "all" || bidder.role === roleFilter
      return matchesSearch && matchesRole
    })
    .sort((a, b) => {
      let aVal = a[sortBy]
      let bVal = b[sortBy]

      if (sortBy === "totalSpent" || sortBy === "bidsPlaced") {
        aVal = Number(aVal)
        bVal = Number(bVal)
      } else {
        aVal = String(aVal).toLowerCase()
        bVal = String(bVal).toLowerCase()
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("asc")
    }
  }

  const totalPages = Math.ceil(filteredAndSortedBidders.length / itemsPerPage)
  const paginatedBidders = filteredAndSortedBidders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-8 p-8 py-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bidders</h1>
            <p className="text-muted-foreground">Track bidder activity and manage permissions</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => fetchBidders()} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter(value)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="participant">Participant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("name")} className="font-semibold">
                      Name
                      {sortBy === "name" && (
                        <ChevronDown className={cn("ml-2 h-4 w-4", sortOrder === "desc" && "rotate-180")} />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("email")} className="font-semibold">
                      Email
                      {sortBy === "email" && (
                        <ChevronDown className={cn("ml-2 h-4 w-4", sortOrder === "desc" && "rotate-180")} />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("phone")} className="font-semibold">
                      Phone
                      {sortBy === "phone" && (
                        <ChevronDown className={cn("ml-2 h-4 w-4", sortOrder === "desc" && "rotate-180")} />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("role")} className="font-semibold">
                      Role
                      {sortBy === "role" && (
                        <ChevronDown className={cn("ml-2 h-4 w-4", sortOrder === "desc" && "rotate-180")} />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("bidsPlaced")} className="font-semibold">
                      Bids
                      {sortBy === "bidsPlaced" && (
                        <ChevronDown className={cn("ml-2 h-4 w-4", sortOrder === "desc" && "rotate-180")} />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("totalSpent")} className="font-semibold">
                      Total Spent
                      {sortBy === "totalSpent" && (
                        <ChevronDown className={cn("ml-2 h-4 w-4", sortOrder === "desc" && "rotate-180")} />
                      )}
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBidders.map((bidder) => (
                  <TableRow
                    key={bidder.id}
                    onClick={() => handleRowClick(bidder)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">{bidder.name}</TableCell>
                    <TableCell>{bidder.email}</TableCell>
                    <TableCell>{bidder.phone}</TableCell>
                    <TableCell>
                      <Badge variant={bidder.role === "admin" ? "default" : "secondary"}>{bidder.role}</Badge>
                    </TableCell>
                    <TableCell>{bidder.bidsPlaced}</TableCell>
                    <TableCell>${Number(bidder.totalSpent).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, filteredAndSortedBidders.length)} of{" "}
                {filteredAndSortedBidders.length} bidders
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <UserProfileSheet
        user={selectedBidder}
        open={!!selectedBidder}
        onOpenChange={(open) => !open && setSelectedBidder(null)}
        onOpenBidSheet={handleOpenBidSheet}
        onOpenOrderSheet={handleOpenOrderSheet}
      />

      {event && (
        <OrderDetailsSheet
          isOpen={isOrderSheetOpen}
          onClose={() => setIsOrderSheetOpen(false)}
          order={selectedOrder}
          eventId={event.id}
          onUpdate={() => {
            if (selectedBidder) {
              fetchBidderOrders(selectedBidder.id)
            }
          }}
        />
      )}

      {event && selectedBid && (
        <BidDetailsSheet
          isOpen={isBidSheetOpen}
          onClose={() => setIsBidSheetOpen(false)}
          bid={selectedBid}
          eventId={event.id}
        />
      )}
    </>
  )
}
