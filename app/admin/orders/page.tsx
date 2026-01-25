"use client"

import { useEffect, useState } from "react"
import { useEvent } from "@/contexts/event-context"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { ShopOrdersTable } from "@/components/admin/shop-orders-table"
import { OrderDetailsSheet } from "@/components/admin/order-details-sheet"
import { Search, ShoppingCart, Download, RefreshCw } from "lucide-react"
import { convertToCSV, downloadCSV } from "@/lib/csv-export"

export default function AdminOrdersPage() {
  const { event } = useEvent()
  const { toast } = useToast()
  const [orders, setOrders] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("all")

  const [isOrderSheetOpen, setIsOrderSheetOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [orderStatus, setOrderStatus] = useState("")
  const [trackingNumber, setTrackingNumber] = useState("")
  const [orderMessages, setOrderMessages] = useState<any[]>([])

  useEffect(() => {
    if (event?.id) {
      fetchOrders()
      fetchItems()
    }
  }, [event?.id])

  const fetchOrders = async () => {
    if (!event?.id) return
    try {
      const response = await fetch(`/api/events/${event.id}/shop/orders`)
      if (response.ok) {
        const data = await response.json()
        const ordersWithItemOptions = data.orders.map((order: any) => {
          const item = items.find((i: any) => i.id === order.shop_item_id)
          return {
            ...order,
            item_options: order.item_options || item?.options || null,
          }
        })
        setOrders(ordersWithItemOptions || [])
      }
    } catch (error) {
      console.error("Error fetching shop orders:", error)
      toast({
        title: "Error",
        description: "Failed to load shop orders",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchItems = async () => {
    if (!event?.id) return
    try {
      const response = await fetch(`/api/events/${event.id}/shop/items`)
      if (response.ok) {
        const data = await response.json()
        setItems(data.items || [])
      }
    } catch (error) {
      console.error("Error fetching shop items:", error)
    }
  }

  const fetchOrderDetails = async (orderId: string) => {
    if (!event?.id) return

    try {
      const response = await fetch(`/api/events/${event.id}/shop/orders/${orderId}`)

      if (!response.ok) {
        throw new Error("Failed to fetch order")
      }

      const order = await response.json()
      const item = items.find((i: any) => i.id === order.shop_item_id)

      setSelectedOrder({
        ...order,
        event_id: event.id,
        shop_item_id: order.shop_item_id,
        item_options: item?.options || null,
        item_category: order.item_category || item?.category || null,
      })
      setOrderStatus(order.status)
      setTrackingNumber(order.tracking_number || "")

      try {
        const messagesRes = await fetch(`/api/events/${event.id}/shop/orders/${orderId}/messages`)
        if (messagesRes.ok) {
          const contentType = messagesRes.headers.get("content-type")
          if (contentType && contentType.includes("application/json")) {
            const messages = await messagesRes.json()
            setOrderMessages(messages.messages || [])
          } else {
            console.warn("[v0] Messages API returned non-JSON response")
            setOrderMessages([])
          }
        } else {
          const text = await messagesRes.text()
          console.warn("[v0] Messages API error:", messagesRes.status, text)
          setOrderMessages([])
        }
      } catch (messagesError) {
        console.error("[v0] Error fetching order messages:", messagesError)
        setOrderMessages([])
      }

      setIsOrderSheetOpen(true)
    } catch (error) {
      console.error("Failed to fetch order details:", error)
      toast({
        title: "Error",
        description: "Failed to load order details",
        variant: "destructive",
      })
    }
  }

  const handleBulkAction = async (action: "complete" | "cancel" | "refund") => {
    toast({
      title: "Action completed",
      description: `Orders have been ${action}d`,
    })
    await fetchOrders()
  }

  const searchFilteredOrders = orders.filter((order) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      order.user_name?.toLowerCase().includes(query) ||
      order.user_email?.toLowerCase().includes(query) ||
      order.user_phone?.toLowerCase().includes(query)
    )
  })

  const ordersByCategory = searchFilteredOrders.reduce((acc: any, order: any) => {
    const item = items.find((i) => i.id === order.shop_item_id)
    const category = item?.category || "uncategorized"
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(order)
    return acc
  }, {})

  const categoriesWithOrders = Object.keys(ordersByCategory).sort()
  const hasMultipleCategories = categoriesWithOrders.length > 1

  const exportToCSV = (ordersToExport: any[], categoryName = "all") => {
    const headers = [
      { key: "order_number", label: "Order Number" },
      { key: "customer_name", label: "Customer Name" },
      { key: "customer_email", label: "Customer Email" },
      { key: "customer_phone", label: "Customer Phone" },
      { key: "item_title", label: "Item" },
      { key: "item_category", label: "Category" },
      { key: "selected_options_formatted", label: "Options" },
      { key: "quantity", label: "Quantity" },
      { key: "total_amount", label: "Total Amount" },
      { key: "status", label: "Status" },
      { key: "tracking_number", label: "Tracking Number" },
      { key: "created_at_formatted", label: "Order Date" },
    ]

    const exportData = ordersToExport.map((order) => {
      const item = items.find((i) => i.id === order.shop_item_id)
      const formattedOptions =
        order.selected_options && order.item_options
          ? Object.entries(order.selected_options)
              .map(([optionId, valueId]: [string, any]) => {
                const option = order.item_options?.find((o: any) => o.id === optionId)
                if (option) {
                  const valueIds = Array.isArray(valueId) ? valueId : [valueId]
                  return valueIds
                    .map((vid) => {
                      const optionValue = option.values?.find((v: any) => v.id === vid)
                      return optionValue ? `${option.name}: ${optionValue.label}` : ""
                    })
                    .filter(Boolean)
                    .join("; ")
                }
                return ""
              })
              .filter(Boolean)
              .join("; ")
          : ""

      return {
        order_number: generateOrderNumber(order.created_at),
        customer_name: order.user_name || "",
        customer_email: order.user_email || "",
        customer_phone: order.user_phone || "",
        item_title: order.item_title || "",
        item_category: item?.category || "",
        selected_options_formatted: formattedOptions,
        quantity: order.quantity || 0,
        total_amount: `$${Number(order.total_amount || 0).toFixed(2)}`,
        status: order.status || "",
        tracking_number: order.tracking_number || "",
        created_at_formatted: new Date(order.created_at).toLocaleString(),
      }
    })

    const csv = convertToCSV(exportData, headers)
    const fileName = `orders-${categoryName}-${new Date().toISOString().split("T")[0]}.csv`
    downloadCSV(csv, fileName)

    toast({
      title: "Export successful",
      description: `Exported ${ordersToExport.length} orders to CSV`,
    })
  }

  const generateOrderNumber = (createdAt: string) => {
    const date = new Date(createdAt)
    const year = date.getFullYear().toString().slice(-2)
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const time = date.getTime().toString().slice(-6)
    return `${year}${month}${day}-${time}`
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">Manage all shop orders</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => fetchOrders()} title="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by customer name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {hasMultipleCategories ? (
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="all" className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                All Orders ({searchFilteredOrders.length})
              </TabsTrigger>
              {categoriesWithOrders.map((category) => (
                <TabsTrigger key={category} value={category} className="flex items-center gap-2">
                  {category.charAt(0).toUpperCase() + category.slice(1)} ({ordersByCategory[category].length})
                </TabsTrigger>
              ))}
            </TabsList>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const ordersToExport =
                  activeCategory === "all" ? searchFilteredOrders : ordersByCategory[activeCategory]
                exportToCSV(ordersToExport, activeCategory)
              }}
              disabled={searchFilteredOrders.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export to CSV
            </Button>
          </div>

          <TabsContent value="all" className="space-y-4">
            <ShopOrdersTable
              orders={searchFilteredOrders}
              items={items}
              onViewOrder={fetchOrderDetails}
              onBulkAction={handleBulkAction}
            />
          </TabsContent>

          {categoriesWithOrders.map((category) => (
            <TabsContent key={category} value={category} className="space-y-4">
              <ShopOrdersTable
                orders={ordersByCategory[category]}
                items={items}
                onViewOrder={fetchOrderDetails}
                onBulkAction={handleBulkAction}
              />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(searchFilteredOrders, "all")}
              disabled={searchFilteredOrders.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export to CSV
            </Button>
          </div>
          <ShopOrdersTable
            orders={searchFilteredOrders}
            items={items}
            onViewOrder={fetchOrderDetails}
            onBulkAction={handleBulkAction}
          />
        </>
      )}

      <OrderDetailsSheet
        isOpen={isOrderSheetOpen}
        onClose={() => setIsOrderSheetOpen(false)}
        order={selectedOrder}
        eventId={event?.id || ""}
        onUpdate={fetchOrders}
      />
    </div>
  )
}
