"use client"

import { AlertDialogContent } from "@/components/ui/alert-dialog"

import {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"

import type React from "react"

import { useEffect } from "react"

import { useRef } from "react"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useEvent } from "@/contexts/event-context"
import { Trash2, Package, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ShopItemForm } from "@/components/shop-item-form"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface ShopItem {
  id: string
  title: string
  description: string | null
  price: number
  image_url: string | null
  category: string | null
  quantity_type: "unlimited" | "limited" | "preorder"
  quantity_available: number | null
  quantity_sold: number
  is_active: boolean
  featured: boolean
  slug: string
  options?: Array<{
    id: string
    name: string
    values?: Array<{
      id: string
      label: string
      quantity: number
    }>
  }>
}

interface ShopOrder {
  id: string
  user_name: string
  user_email: string
  item_title: string
  quantity: number
  unit_price: number
  total_amount: number
  status: string
  created_at: string
  user_id: string
  user_phone?: string
  tracking_number?: string
  user?: {
    name?: string
    email?: string
    phone?: string
  }
  items?: Array<{
    name: string
    quantity: number
    price: number
  }>
  selected_options?: Record<string, any> // Added for selected options
  item_options?: any // To store item's options for formatting selected options
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

export default function AdminShopPage() {
  const { event } = useEvent()
  const { toast } = useToast()
  const [items, setItems] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isItemSheetOpen, setIsItemSheetOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set())
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all")
  const [orderProductFilter, setOrderProductFilter] = useState<string>("all")
  const [isApplyingBulkAction, setIsApplyingBulkAction] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    quantity_type: "unlimited" as "unlimited" | "limited" | "preorder",
    quantity_available: "",
    image_url: "",
    is_active: true,
    featured: false,
  })

  const fetchedEventIdRef = useRef<string | null>(null)

  const [isOrderSheetOpen, setIsOrderSheetOpen] = useState(false)
  const [orderMessages, setOrderMessages] = useState<any[]>([])
  const [messageText, setMessageText] = useState("")
  const [trackingNumber, setTrackingNumber] = useState("")
  const [orderStatus, setOrderStatus] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)

  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean
    action: "cancel" | "refund" | null
    title: string
    description: string
  }>({
    isOpen: false,
    action: null,
    title: "",
    description: "",
  })
  const [activeOrderTab, setActiveOrderTab] = useState("details")

  const [dateRange, setDateRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({
    from: undefined,
    to: undefined,
  })
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false)

  const [isCloseShopDialogOpen, setIsCloseShopDialogOpen] = useState(false)
  const [shopClosed, setShopClosed] = useState(false)
  const [closureMessage, setClosureMessage] = useState("")
  const [isSavingClosure, setIsSavingClosure] = useState(false)

  const [shopSettings, setShopSettings] = useState({
    shop_title: "",
    shop_description: "",
  })
  const [isSavingShopSettings, setIsSavingShopSettings] = useState(false)

  const generateOrderNumber = (createdAt: string) => {
    const date = new Date(createdAt)
    const year = date.getFullYear().toString().slice(-2)
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const time = date.getTime().toString().slice(-6)
    return `${year}${month}${day}-${time}`
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
      toast({
        title: "Error",
        description: "Failed to load shop items",
        variant: "destructive",
      })
    }
  }

  const fetchOrders = async () => {
    if (!event?.id) return
    try {
      const response = await fetch(`/api/events/${event.id}/shop/orders`)
      if (response.ok) {
        const data = await response.json()

        const ordersWithItemOptions = data.orders.map((order: any) => {
          const itemOptionsFromAPI = order.item_options
          const item = items.find((i: any) => i.id === order.shop_item_id)

          return {
            ...order,
            item_options: itemOptionsFromAPI || item?.options || null,
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
    }
  }

  useEffect(() => {
    const loadData = async () => {
      if (event?.id && fetchedEventIdRef.current !== event.id) {
        setIsLoading(true)
        fetchedEventIdRef.current = event.id
        await Promise.all([fetchItems(), fetchOrders()])
        await fetchShopStatus()
        setShopSettings({
          shop_title: event.shop_title || "Shop Our Items",
          shop_description: event.shop_description || "Purchase items directly and support our cause",
        })
        setIsLoading(false)
      }
    }
    loadData()
  }, [event?.id])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageUpload = async (): Promise<string | null> => {
    if (!imageFile) return "" // Return empty string if no new image is uploaded, to avoid overwriting existing URL with null

    try {
      const uploadFormData = new FormData()
      uploadFormData.append("file", imageFile)

      const response = await fetch("/api/blob/upload", {
        method: "POST",
        body: uploadFormData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const data = await response.json()
      return data.url
    } catch (error) {
      console.error("Image upload error:", error)
      toast({
        title: "Upload Failed",
        description: "Failed to upload image",
        variant: "destructive",
      })
      return null // Indicate upload failure
    }
  }

  const openDialog = (item?: any) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        title: item.title,
        description: item.description || "",
        price: item.price.toString(),
        category: item.category || "",
        quantity_type: item.quantity_type,
        quantity_available: item.quantity_type === "limited" ? item.quantity_available?.toString() || "" : "",
        image_url: item.image_url,
        is_active: item.is_active,
        featured: item.featured,
      })
      setImagePreview(item.image_url)
    } else {
      setEditingItem(null)
      setFormData({
        title: "",
        description: "",
        price: "",
        category: "",
        quantity_type: "unlimited",
        quantity_available: "",
        image_url: "",
        is_active: true,
        featured: false,
      })
      setImagePreview(null)
    }
    setImageFile(null)
    setIsItemSheetOpen(true)
  }

  const handleSubmit = async (payload: any) => {
    if (!event?.id) return

    setIsSubmitting(true)
    try {
      let imageUrl = formData.image_url || "" // Default to existing URL if no new image

      if (imageFile) {
        const uploadedUrl = await handleImageUpload()
        if (uploadedUrl === null) {
          // Image upload failed, do not proceed with item save
          return
        }
        imageUrl = uploadedUrl
      }

      const finalPayload = {
        ...payload,
        price: Number.parseFloat(payload.price),
        quantity_available: payload.quantity_type === "limited" ? Number.parseInt(payload.quantity_available) : null,
        image_url: imageUrl,
      }

      const url = editingItem
        ? `/api/events/${event.id}/shop/items/${editingItem.id}`
        : `/api/events/${event.id}/shop/items`

      const response = await fetch(url, {
        method: editingItem ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      })

      if (!response.ok) throw new Error("Failed to save item")

      toast({
        title: "Success",
        description: `Item ${editingItem ? "updated" : "created"} successfully`,
      })

      setIsItemSheetOpen(false) // Close the sheet on success
      fetchItems()
      fetchOrders() // Refresh orders as well in case item change affects something
    } catch (error) {
      console.error("Item submit error:", error)
      toast({
        title: "Error",
        description: `Failed to ${editingItem ? "update" : "create"} item`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!event?.id || !confirm("Are you sure you want to delete this item?")) return

    try {
      console.log("[v0] Deleting shop item:", id, "from event:", event.id) // Added debug logging
      const response = await fetch(`/api/events/${event.id}/shop/items/${id}`, {
        method: "DELETE",
      })

      console.log("[v0] Delete response status:", response.status) // Added debug logging

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete" }))
        console.error("[v0] Delete error:", errorData) // Added debug logging
        throw new Error(errorData.error || "Failed to delete")
      }

      toast({ title: "Success", description: "Item deleted successfully" })
      fetchItems() // Use fetchItems instead of fetchData
    } catch (error) {
      console.error("[v0] Delete error:", error) // Added debug logging
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete item",
        variant: "destructive",
      })
    }
  }

  const fetchOrderDetails = async (orderId: string) => {
    if (!event?.id) return

    try {
      const response = await fetch(`/api/events/${event.id}/shop/orders/${orderId}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] Order details error:", errorText)
        throw new Error("Failed to fetch order")
      }

      const order = await response.json()

      const item = items.find((i: any) => i.id === order.shop_item_id)
      setSelectedOrder({
        ...order,
        item_options: item?.options || null,
      })
      setOrderStatus(order.status)
      setTrackingNumber(order.tracking_number || "")

      const messagesRes = await fetch(`/api/events/${event.id}/shop/orders/${orderId}/messages`)
      if (messagesRes.ok) {
        const messages = await messagesRes.json()
        setOrderMessages(messages)
      }

      setIsOrderSheetOpen(true)
    } catch (error) {
      console.error("[v0] Failed to fetch order details:", error)
      toast({
        title: "Error",
        description: "Failed to load order details",
        variant: "destructive",
      })
    }
  }

  const updateOrderField = async (field: string, value: string | number | null) => {
    if (!event?.id || !selectedOrder) return

    try {
      const response = await fetch(`/api/events/${event.id}/shop/orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })

      if (!response.ok) throw new Error("Failed to update order")

      toast({ title: "Success", description: `Order ${field} updated` })
      fetchOrderDetails(selectedOrder.id) // Re-fetch to update the UI with new values
      fetchOrders() // Refresh the main orders list
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update ${field}`,
        variant: "destructive",
      })
    }
  }

  const sendOrderMessage = async () => {
    if (!event?.id || !selectedOrder || !messageText.trim()) return

    try {
      const response = await fetch(`/api/events/${event.id}/shop/orders/${selectedOrder.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
      })

      if (!response.ok) throw new Error("Failed to send message")

      toast({ title: "Success", description: "Message sent to customer" })
      setMessageText("")
      fetchOrderDetails(selectedOrder.id) // Refresh messages
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      })
    }
  }

  const handleOrderAction = async (action: string) => {
    if (!selectedOrder) return

    if (action === "complete") {
      try {
        await fetch(`/api/events/${event?.id}/shop/orders/${selectedOrder.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed" }),
        })
        toast({ title: "Success", description: "Order marked as completed" })
        fetchOrders()
        setIsOrderSheetOpen(false)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to complete order",
          variant: "destructive",
        })
      }
    } else if (action === "cancel" || action === "refund") {
      setConfirmationDialog({
        isOpen: true,
        action,
        title: action === "cancel" ? "Cancel Order" : "Refund Order",
        description:
          action === "cancel"
            ? "Are you sure you want to cancel this order? This action cannot be undone."
            : "Are you sure you want to refund this order? The payment will be returned to the customer.",
      })
    }
  }

  const confirmOrderAction = async () => {
    if (!selectedOrder || !confirmationDialog.action) return

    try {
      const status = confirmationDialog.action === "cancel" ? "cancelled" : "refunded"
      await fetch(`/api/events/${event?.id}/shop/orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      toast({ title: "Success", description: `Order ${status}` })
      fetchOrders()
      setIsOrderSheetOpen(false)
      setConfirmationDialog({
        isOpen: false,
        action: null,
        title: "",
        description: "",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${confirmationDialog.action} order`,
        variant: "destructive",
      })
    }
  }

  const filteredOrders = (orders || []).filter((order: any) => {
    // Status filter
    if (orderStatusFilter !== "all" && order.status !== orderStatusFilter) return false

    // Product filter
    if (orderProductFilter !== "all" && order.shop_item_id !== orderProductFilter) return false // Changed from item_id to shop_item_id

    // Date range filter
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

  const handleBulkAction = async (action: "complete" | "cancel" | "refund") => {
    if (selectedOrderIds.size === 0) {
      toast({
        title: "No orders selected",
        description: "Please select orders to perform bulk actions",
        variant: "destructive",
      })
      return
    }

    if (!confirm(`Are you sure you want to ${action} ${selectedOrderIds.size} order(s)?`)) {
      return
    }

    setIsApplyingBulkAction(true)

    try {
      const promises = Array.from(selectedOrderIds).map((orderId) =>
        fetch(`/api/events/${event?.id}/shop/orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: action === "complete" ? "completed" : action === "cancel" ? "cancelled" : "refunded",
          }),
        }),
      )

      await Promise.all(promises)

      toast({
        title: "Success",
        description: `${selectedOrderIds.size} order(s) ${action}d successfully`,
      })

      setSelectedOrderIds(new Set())
      fetchOrders() // Refresh orders list
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} orders`,
        variant: "destructive",
      })
    } finally {
      setIsApplyingBulkAction(false)
    }
  }

  const applyDatePreset = (preset: string) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (preset) {
      case "today":
        setDateRange({ from: today, to: today })
        break
      case "last7":
        const last7 = new Date(today)
        last7.setDate(last7.getDate() - 7)
        setDateRange({ from: last7, to: today })
        break
      case "last30":
        const last30 = new Date(today)
        last30.setDate(last30.getDate() - 30)
        setDateRange({ from: last30, to: today })
        break
      case "thisWeek":
        const firstDayOfWeek = new Date(today)
        firstDayOfWeek.setDate(today.getDay() === 0 ? today.getDate() - 6 : today.getDate() - today.getDay()) // Handle Sunday as start of week
        setDateRange({ from: firstDayOfWeek, to: today })
        break
      case "thisMonth":
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        setDateRange({ from: firstDayOfMonth, to: today })
        break
      case "lastMonth":
        const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
        setDateRange({ from: firstDayOfLastMonth, to: lastDayOfLastMonth })
        break
      default:
        setDateRange({ from: undefined, to: undefined })
    }
    setIsDateRangeOpen(false)
  }

  const getItemQuantityInfo = (item: any) => {
    // If item has options, calculate total available and sold from options
    if (item.options && Array.isArray(item.options) && item.options.length > 0) {
      let totalAvailable = 0
      let totalSold = 0

      item.options.forEach((option: any) => {
        if (option.values && Array.isArray(option.values)) {
          option.values.forEach((value: any) => {
            totalAvailable += value.quantity || 0
          })
        }
      })

      // Calculate sold from orders - need to query orders with selected_options
      // For now, use quantity_sold field
      totalSold = item.quantity_sold || 0

      return {
        type: "options",
        available: totalAvailable - totalSold,
        total: totalAvailable,
        text: `${totalAvailable - totalSold} of ${totalAvailable} available`,
      }
    }

    // Legacy handling for items without options
    if (item.quantity_type === "unlimited") {
      return { type: "unlimited", text: "Unlimited quantity" }
    }
    if (item.quantity_type === "preorder") {
      return { type: "preorder", text: "Pre-order" }
    }
    if (item.quantity_type === "limited") {
      const available = (item.quantity_available || 0) - (item.quantity_sold || 0)
      return {
        type: "limited",
        available,
        total: item.quantity_available,
        text: `${available} of ${item.quantity_available} available`,
      }
    }

    return { type: "unknown", text: "Quantity information unavailable" }
  }

  const handleViewOrder = async (orderId: string) => {
    if (!event?.id) return

    try {
      const response = await fetch(`/api/events/${event.id}/shop/orders/${orderId}`)
      if (!response.ok) throw new Error("Failed to fetch order")

      const order = await response.json()
      const item = items.find((i: any) => i.id === order.shop_item_id)

      setSelectedOrder({
        ...order,
        item_options: item?.options || null,
      })
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

  const fetchShopStatus = async () => {
    if (!event?.id) return

    try {
      const response = await fetch(`/api/events/${event.id}/shop/status`)
      if (response.ok) {
        const data = await response.json()
        setShopClosed(data.closed || false)
        setClosureMessage(data.message || "")
      }
    } catch (error) {
      console.error("Error fetching shop status:", error)
    }
  }

  const handleSaveShopClosure = async () => {
    if (!event?.id) return

    setIsSavingClosure(true)
    try {
      const response = await fetch(`/api/events/${event.id}/shop/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closed: !shopClosed, // Toggle the current state
          message: closureMessage,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setShopClosed(data.closed)
        setClosureMessage(data.message || "")
        setIsCloseShopDialogOpen(false)
        toast({
          title: shopClosed ? "Shop opened" : "Shop closed",
          description: shopClosed
            ? "Shop is now open for purchases"
            : "Shop has been closed. Customers cannot make purchases.",
        })
      } else {
        throw new Error("Failed to update shop status")
      }
    } catch (error) {
      console.error("Error updating shop status:", error)
      toast({
        title: "Error",
        description: "Failed to update shop status",
        variant: "destructive",
      })
    } finally {
      setIsSavingClosure(false)
    }
  }

  const saveShopSettings = async () => {
    if (!event?.id) return

    setIsSavingShopSettings(true)
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_title: shopSettings.shop_title,
          shop_description: shopSettings.shop_description,
        }),
      })

      if (!response.ok) throw new Error("Failed to save shop settings")

      toast({
        title: "Success",
        description: "Shop settings saved successfully",
      })
    } catch (error) {
      console.error("Error saving shop settings:", error)
      toast({
        title: "Error",
        description: "Failed to save shop settings",
        variant: "destructive",
      })
    } finally {
      setIsSavingShopSettings(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium">Loading shop data...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Shop Management</h1>
        <p className="text-muted-foreground">Manage your shop items and orders</p>
      </div>

      {/* Shop Settings Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Shop Settings</CardTitle>
          <CardDescription>
            Customize your shop title and description shown on the homepage and shop page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="shop_title">Shop Title</Label>
            <Input
              id="shop_title"
              value={shopSettings.shop_title}
              onChange={(e) => setShopSettings({ ...shopSettings, shop_title: e.target.value })}
              placeholder="Shop Our Items"
            />
            <p className="text-xs text-muted-foreground mt-1">This will appear as the heading on your shop section</p>
          </div>
          <div>
            <Label htmlFor="shop_description">Shop Description</Label>
            <Textarea
              id="shop_description"
              value={shopSettings.shop_description}
              onChange={(e) => setShopSettings({ ...shopSettings, shop_description: e.target.value })}
              placeholder="Purchase items directly and support our cause"
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">This text will appear below the shop heading</p>
          </div>
          <Button onClick={saveShopSettings} disabled={isSavingShopSettings}>
            {isSavingShopSettings ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Shop Settings"
            )}
          </Button>
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Items</h2>
          </div>
          <Button variant={shopClosed ? "default" : "destructive"} onClick={() => setIsCloseShopDialogOpen(true)}>
            {shopClosed ? "Open Shop" : "Close Shop"}
          </Button>
        </div>
      </div>

      {shopClosed && (
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
          <p className="font-semibold text-destructive">Shop is currently closed</p>
          {closureMessage && <p className="text-sm text-muted-foreground mt-1">{closureMessage}</p>}
        </div>
      )}

      <Tabs value="items">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="items" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Items ({items.length})
            </TabsTrigger>
          </TabsList>

          <Button
            onClick={() => {
              setEditingItem(null)
              setIsItemSheetOpen(true)
            }}
          >
            Add Item
          </Button>
        </div>

        <TabsContent value="items" className="space-y-4">
          <Card className="p-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <Card
                  key={item.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => openDialog(item)}
                >
                  <CardHeader>
                    {item.image_url && (
                      <img
                        src={item.image_url || "/placeholder.svg"}
                        alt={item.title}
                        className="w-full h-48 object-cover rounded-md mb-4"
                      />
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => openDialog(item)}>
                          <Package className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      {item.category && <span className="text-xs">{item.category}</span>}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">${Number(item.price).toFixed(2)}</span>
                      <div className="flex gap-2">
                        {item.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {item.featured && <Badge variant="outline">Featured</Badge>}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">{getItemQuantityInfo(item).text}</div>
                    <div className="text-sm">Sold: {item.quantity_sold}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {items.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No items yet. Create your first shop item!</p>
                </CardContent>
              </Card>
            )}
          </Card>
        </TabsContent>
      </Tabs>
      {/* Item Edit Sheet */}
      {isItemSheetOpen && (
        <ShopItemForm
          isOpen={isItemSheetOpen}
          onClose={() => setIsItemSheetOpen(false)}
          item={editingItem}
          eventId={event?.id || ""}
          initialFormData={formData}
          setImageFile={setImageFile}
          setImagePreview={setImagePreview}
          fileInputRef={fileInputRef}
          handleImageChange={handleImageChange}
          isSubmitting={isSubmitting}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onDelete={() => {
            setIsItemSheetOpen(false)
            fetchItems()
          }}
        />
      )}
      {/* Order Details Sheet */}
      {/* Placeholder for OrderDetailsSheet component */}
      {/* OrderDetailsSheet component should be implemented here */}

      <AlertDialog
        open={confirmationDialog.isOpen}
        onOpenChange={(open) => setConfirmationDialog({ ...confirmationDialog, isOpen: open })}
      >
        <AlertDialogPortal>
          <AlertDialogOverlay />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmationDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirmationDialog.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmOrderAction}
                className={
                  confirmationDialog.action === "refund"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : ""
                }
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>

      <Dialog open={isCloseShopDialogOpen} onOpenChange={setIsCloseShopDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{shopClosed ? "Open Shop" : "Close Shop"}</DialogTitle>
            <DialogDescription>
              {shopClosed
                ? "Open the shop to allow customers to make purchases again."
                : "Close the shop to prevent new purchases. Current carts will be cleared."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="closure-message">{shopClosed ? "Opening Message (Optional)" : "Closure Message"}</Label>
              <Textarea
                id="closure-message"
                placeholder={
                  shopClosed
                    ? "Shop is now open!"
                    : "Shop is closed and all items/orders can now be made at the booth next to the Library"
                }
                value={closureMessage}
                onChange={(e) => setClosureMessage(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This message will be displayed to customers at the top of the shop page.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloseShopDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={shopClosed ? "default" : "destructive"}
              onClick={handleSaveShopClosure}
              disabled={isSavingClosure}
            >
              {isSavingClosure && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {shopClosed ? "Open Shop" : "Close Shop"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
