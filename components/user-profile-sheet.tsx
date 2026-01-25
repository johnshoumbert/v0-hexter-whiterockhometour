"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { User, Gavel, ShoppingBag, MessageSquare, Loader2 } from "lucide-react"

interface UserProfileSheetProps {
  user: any | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenBidSheet?: (bid: any) => void
  onOpenOrderSheet?: (order: any) => void
}

export function UserProfileSheet({
  user,
  open,
  onOpenChange,
  onOpenBidSheet,
  onOpenOrderSheet,
}: UserProfileSheetProps) {
  const [activeTab, setActiveTab] = useState("details")
  const [isLoadingBids, setIsLoadingBids] = useState(false)
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [userBids, setUserBids] = useState<any[]>([])
  const [userOrders, setUserOrders] = useState<any[]>([])
  const [userMessages, setUserMessages] = useState<any[]>([])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    if (tab === "bids" && userBids.length === 0 && user) {
      fetchBids()
    } else if (tab === "orders" && userOrders.length === 0 && user) {
      fetchOrders()
    } else if (tab === "messages" && userMessages.length === 0 && user) {
      fetchMessages()
    }
  }

  const fetchBids = async () => {
    if (!user?.id) return
    setIsLoadingBids(true)
    try {
      const res = await fetch(`/api/users/${user.id}/bids`)
      if (res.ok) {
        const data = await res.json()
        setUserBids(data.bids || [])
      }
    } catch (error) {
      console.error("Error fetching bids:", error)
    } finally {
      setIsLoadingBids(false)
    }
  }

  const fetchOrders = async () => {
    if (!user?.id) return
    setIsLoadingOrders(true)
    try {
      const res = await fetch(`/api/users/${user.id}/orders`)
      if (res.ok) {
        const data = await res.json()
        setUserOrders(data.orders || [])
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
    } finally {
      setIsLoadingOrders(false)
    }
  }

  const fetchMessages = async () => {
    if (!user?.id) return
    setIsLoadingMessages(true)
    try {
      const res = await fetch(`/api/users/${user.id}/messages`)
      if (res.ok) {
        const data = await res.json()
        setUserMessages(data.messages || [])
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
    } finally {
      setIsLoadingMessages(false)
    }
  }

  useEffect(() => {
    if (!open) {
      setActiveTab("details")
      setUserBids([])
      setUserOrders([])
      setUserMessages([])
    }
  }, [open])

  if (!user) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl p-0 overflow-hidden">
        <div className="flex h-full">
          {/* Left sidebar navigation */}
          <div className="w-64 border-r bg-muted/30 p-6 space-y-2">
            <SheetHeader className="mb-6">
              <SheetTitle>User Profile</SheetTitle>
            </SheetHeader>

            <Button
              variant={activeTab === "details" ? "default" : "ghost"}
              className="w-full justify-start gap-3"
              onClick={() => handleTabChange("details")}
            >
              <User className="h-4 w-4" />
              Details
            </Button>

            <Button
              variant={activeTab === "bids" ? "default" : "ghost"}
              className="w-full justify-start gap-3"
              onClick={() => handleTabChange("bids")}
            >
              <Gavel className="h-4 w-4" />
              Bids
              {userBids.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {userBids.length}
                </Badge>
              )}
            </Button>

            <Button
              variant={activeTab === "orders" ? "default" : "ghost"}
              className="w-full justify-start gap-3"
              onClick={() => handleTabChange("orders")}
            >
              <ShoppingBag className="h-4 w-4" />
              Shop Orders
              {userOrders.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {userOrders.length}
                </Badge>
              )}
            </Button>

            <Button
              variant={activeTab === "messages" ? "default" : "ghost"}
              className="w-full justify-start gap-3"
              onClick={() => handleTabChange("messages")}
            >
              <MessageSquare className="h-4 w-4" />
              Messages
              {userMessages.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {userMessages.length}
                </Badge>
              )}
            </Button>
          </div>

          {/* Main content area */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "details" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-1">{user.name}</h3>
                  <p className="text-sm text-muted-foreground">Member since {user.joinedDate || "N/A"}</p>
                </div>

                <Card>
                  <CardContent className="pt-6 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Email</p>
                        <p className="text-base">{user.email}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Phone</p>
                        <p className="text-base">{user.phone || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Role</p>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role || "user"}</Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-6 border-t">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Total Bids Placed</p>
                        <p className="text-3xl font-bold">{user.bidsPlaced || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Total Amount Spent</p>
                        <p className="text-3xl font-bold">${Number(user.totalSpent || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "bids" && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Bid History</h3>
                {isLoadingBids ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : userBids.length > 0 ? (
                  <div className="rounded-lg border bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Auction Item</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Placed</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userBids.map((bid: any) => (
                          <TableRow
                            key={bid.id}
                            onClick={() => onOpenBidSheet?.(bid)}
                            className="cursor-pointer hover:bg-muted/50"
                          >
                            <TableCell className="font-medium">{bid.auction_title}</TableCell>
                            <TableCell className="font-semibold text-primary">
                              ${Number(bid.amount).toFixed(2)}
                            </TableCell>
                            <TableCell>{new Date(bid.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              {bid.is_winning ? (
                                <Badge className="bg-green-600">Winning</Badge>
                              ) : (
                                <Badge variant="secondary">Outbid</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Gavel className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No bids placed yet</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "orders" && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Shop Orders</h3>
                {isLoadingOrders ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : userOrders.length > 0 ? (
                  userOrders.map((order: any) => (
                    <Card
                      key={order.id}
                      onClick={() => onOpenOrderSheet?.(order)}
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-semibold">Order #{order.id.slice(0, 8)}</h4>
                            <p className="text-sm text-muted-foreground">{order.item_title}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold">${Number(order.total_amount).toFixed(2)}</p>
                            <Badge className="mt-1">{order.status}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No orders yet</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "messages" && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Message History</h3>
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : userMessages.length > 0 ? (
                  userMessages.map((message: any) => (
                    <Card key={message.id}>
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold">{message.subject || "No Subject"}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(message.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">{message.message}</p>
                          {message.status && (
                            <Badge variant="secondary" className="mt-2">
                              {message.status}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No messages yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
