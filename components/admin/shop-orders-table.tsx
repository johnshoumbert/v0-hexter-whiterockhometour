"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CalendarIcon, DollarSign, Package, ShoppingCart, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface ShopOrdersTableProps {
  orders: any[]
  items: any[]
  onViewOrder: (orderId: string) => void
  onBulkAction: (action: "complete" | "cancel" | "refund") => Promise<void>
}

export function ShopOrdersTable({ orders, items, onViewOrder, onBulkAction }: ShopOrdersTableProps) {
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set())
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all")
  const [orderProductFilter, setOrderProductFilter] = useState<string>("all")
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false)
  const [isApplyingBulkAction, setIsApplyingBulkAction] = useState(false)

  const generateOrderNumber = (createdAt: string) => {
    const date = new Date(createdAt)
    const year = date.getFullYear().toString().slice(-2)
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const time = date.getTime().toString().slice(-6)
    return `${year}${month}${day}-${time}`
  }

  const formatSelectedOptions = (selectedOptions: any, itemOptions: any) => {
    if (!selectedOptions || !itemOptions || Object.keys(selectedOptions).length === 0) {
      return null
    }

    const formatted: { optionName: string; value: string }[] = []

    Object.entries(selectedOptions).forEach(([optionId, valueId]: [string, any]) => {
      const option = itemOptions.find((o: any) => o.id === optionId)
      if (option) {
        const valueIds = Array.isArray(valueId) ? valueId : [valueId]
        valueIds.forEach((vid) => {
          const optionValue = option.values?.find((v: any) => v.id === vid)
          if (optionValue) {
            formatted.push({
              optionName: option.name,
              value: optionValue.label,
            })
          }
        })
      }
    })

    return formatted.length > 0 ? formatted : null
  }

  const filteredOrders = (orders || []).filter((order: any) => {
    if (orderStatusFilter !== "all" && order.status !== orderStatusFilter) return false
    if (orderProductFilter !== "all" && order.shop_item_id !== orderProductFilter) return false

    if (dateRange.from || dateRange.to) {
      const orderDate = new Date(order.created_at)
      if (dateRange.from && orderDate < dateRange.from) return false
      if (dateRange.to) {
        const endOfDay = new Date(dateRange.to)
        endOfDay.setHours(23, 59, 59, 999)
        if (orderDate > endOfDay) return false
      }
    }

    return true
  })

  const analytics = {
    totalOrders: orders?.length || 0,
    pendingOrders: orders?.filter((o: any) => o.status === "pending").length || 0,
    completedOrders: orders?.filter((o: any) => o.status === "completed").length || 0,
    totalRevenue:
      orders?.reduce((sum: number, o: any) => sum + (o.status === "completed" ? Number(o.total_amount) : 0), 0) || 0,
  }

  const uniqueProducts = Array.from(new Set(items?.map((o) => ({ id: o.id, name: o.title })) || []))

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(new Set(filteredOrders.map((o) => o.id)))
    } else {
      setSelectedOrderIds(new Set())
    }
  }

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }

  const handleBulkActionClick = async (action: "complete" | "cancel" | "refund") => {
    setIsApplyingBulkAction(true)
    try {
      await onBulkAction(action)
      setSelectedOrderIds(new Set())
    } finally {
      setIsApplyingBulkAction(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.pendingOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.completedOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Completed orders only</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Product</label>
              <Select value={orderProductFilter} onValueChange={setOrderProductFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {uniqueProducts.map((product: any) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Date Range</label>
              <Popover open={isDateRangeOpen} onOpenChange={setIsDateRangeOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
                        </>
                      ) : (
                        dateRange.from.toLocaleDateString()
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range: any) =>
                      setDateRange({
                        from: range?.from,
                        to: range?.to,
                      })
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedOrderIds.size > 0 && (
        <Card className="bg-muted">
          <CardContent className="flex items-center justify-between py-4">
            <span className="text-sm font-medium">{selectedOrderIds.size} order(s) selected</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkActionClick("complete")}
                disabled={isApplyingBulkAction}
              >
                Complete
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkActionClick("cancel")}
                disabled={isApplyingBulkAction}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleBulkActionClick("refund")}
                disabled={isApplyingBulkAction}
              >
                Refund
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order) => {
              const formattedOptions = formatSelectedOptions(order.selected_options, order.item_options)
              return (
                <TableRow key={order.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedOrderIds.has(order.id)}
                      onCheckedChange={() => toggleOrderSelection(order.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{order.user_name}</div>
                    <div className="text-sm text-muted-foreground">{order.user_email}</div>
                  </TableCell>
                  <TableCell>
                    <div>{order.item_title}</div>
                    {formattedOptions && (
                      <div className="text-sm text-muted-foreground">
                        {formattedOptions.map((opt, idx) => (
                          <span key={idx}>
                            {opt.optionName}: {opt.value}
                            {idx < formattedOptions.length - 1 && ", "}
                          </span>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{order.quantity}</TableCell>
                  <TableCell>${Number(order.total_amount).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        order.status === "completed"
                          ? "default"
                          : order.status === "pending"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        order.payment_display_status === "paid"
                          ? "default"
                          : order.payment_display_status === "pending"
                            ? "secondary"
                            : order.payment_display_status === "failed"
                              ? "destructive"
                              : "outline"
                      }
                    >
                      {order.payment_display_status || "unpaid"}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => onViewOrder(order.id)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
