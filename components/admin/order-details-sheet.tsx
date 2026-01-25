"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Pencil, FileText, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { CreditCard, User, Mail, RotateCcw } from "lucide-react" // Added import for User, Mail, RotateCcw

interface OrderDetailsSheetProps {
  isOpen: boolean
  onClose: () => void
  order: any | null
  eventId: string
  onUpdate: () => void
}

// Helper component for sidebar buttons
function SidebarMenuButton({ children, isActive, ...props }: any) {
  return (
    <button
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
        isActive ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50",
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function OrderDetailsSheet({ isOpen, onClose, order, eventId, onUpdate }: OrderDetailsSheetProps) {
  console.log("[v0] OrderDetailsSheet order:", {
    id: order?.id,
    item_category: order?.item_category,
    status: order?.status,
    hasFormResponses: order?.item_category === "order_form",
  })

  const [activeTab, setActiveTab] = useState<"details" | "items" | "order-form" | "customer" | "messages" | "payment">("details")
  const [orderStatus, setOrderStatus] = useState(order?.status || "pending")
  const [trackingNumber, setTrackingNumber] = useState(order?.tracking_number || "")
  const [isEditingItems, setIsEditingItems] = useState(false)
  const [editedQuantity, setEditedQuantity] = useState(order?.quantity || 1)
  const [editedOptions, setEditedOptions] = useState<Record<string, string>>(order?.selected_options || {})
  const [originalTotal, setOriginalTotal] = useState(Number(order?.total_amount || 0))
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [formResponses, setFormResponses] = useState<any[]>([])
  const [isLoadingFormResponses, setIsLoadingFormResponses] = useState(false) // Changed initial state
  const [isEditingForm, setIsEditingForm] = useState(false)
  const [editedFormResponses, setEditedFormResponses] = useState<Record<string, string>>({})
  const { toast } = useToast()
  const [confirmationDialog, setConfirmationDialog] = useState({
    isOpen: false,
    action: null as string | null,
    title: "",
    description: "",
  })
  const [isRefetchingPayment, setIsRefetchingPayment] = useState(false)

  useEffect(() => {
    if (order) {
      console.log("[v0] Order category check:", order.item_category, order.item_category === "order_form")
      setOrderStatus(order.status)
      setTrackingNumber(order.tracking_number || "")
      setEditedQuantity(order.quantity)
      setEditedOptions(order.selected_options || {})
      setOriginalTotal(Number(order.total_amount || 0))
      fetchMessages()

      if (order.item_category === "order_form" && order.shop_item_id && eventId) {
        console.log("[v0] Order has order_form category, fetching form responses")
        setIsLoadingFormResponses(true)
        fetchFormResponses()
      } else {
        // If it's not an order form, ensure loading state is false and form responses are cleared
        setIsLoadingFormResponses(false)
        setFormResponses([])
      }
    }
  }, [order, eventId]) // Fixed dependencies to use order instead of order?.id, order?.item_category, etc.

  const fetchFormResponses = async () => {
    if (!order || !eventId || !order.shop_item_id) {
      // Added check for shop_item_id
      console.log("[v0] fetchFormResponses - missing required data")
      setIsLoadingFormResponses(false)
      return
    }

    console.log("[v0] Fetching form field definitions and responses for shop_item_id:", order.shop_item_id)

    try {
      // First fetch the form field definitions
      const fieldsResponse = await fetch(`/api/events/${eventId}/shop/items/${order.shop_item_id}/order-forms`)

      if (!fieldsResponse.ok) {
        console.error("[v0] Failed to fetch form field definitions:", fieldsResponse.status)
        setFormResponses([])
        setIsLoadingFormResponses(false)
        return
      }

      const fieldsData = await fieldsResponse.json()
      const fieldDefinitions = fieldsData.fields || []
      console.log("[v0] Form field definitions:", fieldDefinitions)

      // Then fetch saved responses
      const responsesResponse = await fetch(`/api/events/${eventId}/shop/orders/${order.id}/form-responses`)

      const savedResponses: Record<string, string> = {}
      if (responsesResponse.ok) {
        const responsesData = await responsesResponse.json()
        console.log("[v0] Saved form responses:", responsesData)
        responsesData.forEach((r: any) => {
          savedResponses[r.field_id] = r.field_value || ""
        })
      }

      // Merge field definitions with saved responses
      const mergedFormResponses = fieldDefinitions.map((field: any) => ({
        field_id: field.id,
        field_name: field.field_name,
        field_label: field.field_label,
        field_type: field.field_type,
        field_value: savedResponses[field.id] || "",
        is_required: field.is_required,
        options: field.options,
        placeholder: field.placeholder,
        help_text: field.help_text,
        max_length: field.max_length,
        display_order: field.display_order,
      }))

      console.log("[v0] Merged form responses:", mergedFormResponses)
      setFormResponses(mergedFormResponses)

      const initialResponses: Record<string, string> = {}
      mergedFormResponses.forEach((r: any) => {
        initialResponses[r.field_id] = r.field_value || ""
      })
      setEditedFormResponses(initialResponses)
      setIsLoadingFormResponses(false)
    } catch (error) {
      console.error("[v0] Failed to fetch form data:", error)
      setFormResponses([])
      setIsLoadingFormResponses(false)
    }
  }

  const handleSaveFormResponses = async () => {
    if (!order || !eventId) return

    try {
      const responses = Object.entries(editedFormResponses).map(([field_id, field_value]) => ({
        field_id,
        field_value,
      }))

      const response = await fetch(`/api/events/${eventId}/shop/orders/${order.id}/form-responses`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses }),
      })

      if (!response.ok) throw new Error("Failed to update form responses")

      toast({
        title: "Success",
        description: "Order form responses updated",
      })
      setIsEditingForm(false)
      fetchFormResponses()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update form responses",
        variant: "destructive",
      })
    }
  }

  const fetchMessages = async () => {
    if (!order || !eventId) return
    try {
      const response = await fetch(`/api/events/${eventId}/shop/orders/${order.id}/messages`)
      if (response.ok) {
        const messages = await response.json()
        setMessages(Array.isArray(messages) ? messages : [])
      } else {
        setMessages([])
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error)
      setMessages([])
    }
  }

  const updateOrderField = async (field: string, value: string) => {
    if (!order || !eventId) return

    try {
      const response = await fetch(`/api/events/${eventId}/shop/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })

      if (!response.ok) throw new Error("Failed to update order")

      toast({ title: "Success", description: `Order ${field} updated` })
      onUpdate()
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update ${field}`,
        variant: "destructive",
      })
    }
  }

  const sendMessage = async () => {
    if (!order || !eventId || !newMessage.trim()) return

    try {
      const response = await fetch(`/api/events/${eventId}/shop/orders/${order.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage }),
      })

      if (!response.ok) throw new Error("Failed to send message")

      toast({ title: "Success", description: "Message sent to customer" })
      setNewMessage("")
      fetchMessages()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      })
    }
  }

  const handleOrderAction = async (action: string) => {
    if (!order) return

    if (action === "complete") {
      try {
        await fetch(`/api/events/${eventId}/shop/orders/${order.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed" }),
        })
        toast({ title: "Success", description: "Order marked as completed" })
        onUpdate()
        onClose()
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to complete order",
          variant: "destructive",
        })
      }
    } else if (action === "cancel" || action === "refund" || action === "delete") {
      setConfirmationDialog({
        isOpen: true,
        action,
        title: action === "cancel" ? "Cancel Order" : action === "refund" ? "Refund Order" : "Delete Order",
        description:
          action === "cancel"
            ? "Are you sure you want to cancel this order? This action cannot be undone."
            : action === "refund"
              ? "Are you sure you want to refund this order? The payment will be returned to the customer."
              : "Are you sure you want to permanently delete this order? This will remove all order data and cannot be undone.",
      })
    }
  }

  const confirmOrderAction = async () => {
    if (!order || !confirmationDialog.action) return

    try {
      if (confirmationDialog.action === "delete") {
        const response = await fetch(`/api/events/${eventId}/shop/orders/${order.id}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          throw new Error("Failed to delete order")
        }

        toast({ title: "Success", description: "Order permanently deleted" })
      } else {
        const status = confirmationDialog.action === "cancel" ? "cancelled" : "refunded"
        await fetch(`/api/events/${eventId}/shop/orders/${order.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        })
        toast({ title: "Success", description: `Order ${status}` })
      }

      onUpdate()
      onClose()
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

  const generateOrderNumber = (createdAt: string) => {
    const date = new Date(createdAt)
    const year = date.getFullYear().toString().slice(-2)
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const time = date.getTime().toString().slice(-6)
    return `${year}${month}${day}-${time}`
  }

  const formatSelectedOptions = (selectedOptions: any, itemOptions: any) => {
    if (!itemOptions || itemOptions.length === 0) {
      return null
    }

    const optionsToFormat = isEditingItems ? editedOptions : selectedOptions

    if (optionsToFormat && Object.keys(optionsToFormat).length > 0) {
      const formatted: { optionName: string; value: string }[] = []

      Object.entries(optionsToFormat).forEach(([optionId, valueId]: [string, any]) => {
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

    return itemOptions.map((option: any) => ({
      optionName: option.name,
      value: "Not specified",
    }))
  }

  const calculateNewTotal = () => {
    if (!order) return 0
    const unitPrice = Number(order.unit_price)
    return unitPrice * editedQuantity
  }

  const getCostDifference = () => {
    const newTotal = calculateNewTotal()
    return newTotal - originalTotal
  }

  const updateOrderItems = async () => {
    if (!order || !eventId) return

    try {
      const newTotal = calculateNewTotal()

      console.log("[v0] Saving order items with:", {
        quantity: editedQuantity,
        total_amount: newTotal,
        selected_options: editedOptions,
      })

      const response = await fetch(`/api/events/${eventId}/shop/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: editedQuantity,
          total_amount: newTotal,
          selected_options: editedOptions,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[v0] API error:", errorData)
        throw new Error(errorData.error || "Failed to update order items")
      }

      const result = await response.json()
      console.log("[v0] Order update response:", result)
      console.log("[v0] Updated order data:", result.order)

      if (result.order?.selected_options) {
        console.log("[v0] Setting new selected options:", result.order.selected_options)
        setEditedOptions(result.order.selected_options)
      }

      toast({
        title: "Success",
        description: "Order items updated successfully",
      })
      setIsEditingItems(false)
      setOriginalTotal(newTotal)
      onUpdate()

      if (order.item_category === "order_form" && Object.keys(editedFormResponses).length > 0) {
        await handleSaveFormResponses()
      }
    } catch (error) {
      console.error("[v0] Error updating order items:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update order items",
        variant: "destructive",
      })
    }
  }

  const cancelItemEditing = () => {
    if (order) {
      setEditedQuantity(order.quantity)
      setEditedOptions(order.selected_options || {})
      setIsEditingItems(false)
    }
  }

  const refetchPaymentStatus = async () => {
    if (!order || !eventId) return

    setIsRefetchingPayment(true)
    try {
      const response = await fetch(`/api/events/${eventId}/shop/orders/${order.id}/refetch-payment`, {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to refetch payment status")
      }

      const data = await response.json()

      toast({
        title: "Success",
        description: `Payment status updated: ${data.paymentDisplayStatus}`,
      })

      // Refresh the order data
      onUpdate()
    } catch (error) {
      console.error("[v0] Error refetching payment status:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to refetch payment status",
        variant: "destructive",
      })
    } finally {
      setIsRefetchingPayment(false)
    }
  }

  if (!order) return null

  const formattedOptions = formatSelectedOptions(order.selected_options, order.item_options)

  console.log("[v0] Order data:", {
    selected_options: order.selected_options,
    item_options: order.item_options,
    formattedOptions,
  })

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="overflow-y-auto sm:max-w-4xl p-0 flex flex-col">
          {/* Header */}
          <SheetHeader className="border-b px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SheetTitle>Order Details</SheetTitle>
                {order?.item_category && (
                  <Badge variant="outline" className="font-normal">
                    {order.item_category.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </Badge>
                )}
              </div>
            </div>
            <SheetDescription>#{order ? generateOrderNumber(order.created_at) : ""}</SheetDescription>
          </SheetHeader>

          {/* Main Content with Sidebar */}
          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* Left Sidebar Navigation */}
            <div className="w-64 border-r bg-muted/40 p-6 flex flex-col">
              <nav className="space-y-1 flex-1">
                <SidebarMenuButton isActive={activeTab === "details"} onClick={() => setActiveTab("details")}>
                  <Pencil className="h-4 w-4" />
                  <span>Details</span>
                </SidebarMenuButton>

                <SidebarMenuButton isActive={activeTab === "items"} onClick={() => setActiveTab("items")}>
                  <Pencil className="h-4 w-4" />
                  <span>Items</span>
                </SidebarMenuButton>

                {order.item_category === "order_form" && (
                  <SidebarMenuButton
                    isActive={activeTab === "order-form"}
                    onClick={() => setActiveTab("order-form")}
                    className="w-full justify-start"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Order Form</span>
                  </SidebarMenuButton>
                )}

                <SidebarMenuButton isActive={activeTab === "customer"} onClick={() => setActiveTab("customer")}>
                  <Pencil className="h-4 w-4" />
                  <span>Customer</span>
                </SidebarMenuButton>

                <SidebarMenuButton isActive={activeTab === "payment"} onClick={() => setActiveTab("payment")}>
                  <CreditCard className="h-4 w-4" />
                  <span>Payment</span>
                </SidebarMenuButton>

                <SidebarMenuButton isActive={activeTab === "messages"} onClick={() => setActiveTab("messages")}>
                  <Pencil className="h-4 w-4" />
                  <span>Messages</span>
                </SidebarMenuButton>
              </nav>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-6">
              {/* Details Tab */}
              {activeTab === "details" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Order Details</h2>
                  </div>

                  <div className="rounded-lg border p-4 space-y-3">
                    <h3 className="font-semibold">Order Summary</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="text-muted-foreground">Order Number</div>
                      <div className="font-medium">#{generateOrderNumber(order.created_at)}</div>

                      <div className="text-muted-foreground">Status</div>
                      <div>
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
                      </div>

                      <div className="text-muted-foreground">Payment Status</div>
                      <div className="flex items-center gap-2">
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
                        {order.stripe_session_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={refetchPaymentStatus}
                            disabled={isRefetchingPayment}
                            className="h-6 px-2 text-xs"
                          >
                            {isRefetchingPayment ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                Refreshing...
                              </>
                            ) : (
                              "Refetch"
                            )}
                          </Button>
                        )}
                      </div>

                      <div className="text-muted-foreground">Category</div>
                      <div className="font-medium capitalize">{order.item_category || "N/A"}</div>

                      <div className="text-muted-foreground">Total Amount</div>
                      <div className="font-medium">${Number(order.total_amount).toFixed(2)}</div>

                      <div className="text-muted-foreground">Date Placed</div>
                      <div>{new Date(order.created_at).toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Update Status</Label>
                      <Select
                        value={orderStatus}
                        onValueChange={(value) => {
                          setOrderStatus(value)
                          updateOrderField("status", value)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="refunded">Refunded</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Tracking Number</Label>
                      <div className="flex gap-2">
                        <Input
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                          placeholder="Enter tracking #"
                        />
                        <Button onClick={() => updateOrderField("tracking_number", trackingNumber)}>Update</Button>
                      </div>
                    </div>
                  </div>

                  {Array.isArray(messages) && messages.length > 0 && (
                    <div className="rounded-lg border p-4">
                      <h3 className="font-semibold mb-2">Last Message</h3>
                      <p className="text-sm text-muted-foreground">{messages[messages.length - 1]?.message}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Items Tab */}
              {activeTab === "items" && (
                <div className="space-y-4">
                  {isEditingItems && getCostDifference() !== 0 && (
                    <div
                      className={cn(
                        "rounded-lg border p-4",
                        getCostDifference() > 0
                          ? "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800"
                          : "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
                      )}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold">
                            {getCostDifference() > 0 ? "Additional Charge Required" : "Refund Due"}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {getCostDifference() > 0
                              ? "Customer will need to pay the difference"
                              : "Customer will receive a refund"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">
                            {getCostDifference() > 0 ? "+" : ""}${Math.abs(getCostDifference()).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">Original: ${originalTotal.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg border p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="font-medium">{order.item_title}</div>
                        {isEditingItems && order.item_options && order.item_options.length > 0 ? (
                          <div className="mt-3 space-y-3">
                            {order.item_options.map((option: any) => (
                              <div key={option.id} className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">{option.name}</label>
                                <Select
                                  value={editedOptions[option.id] || ""}
                                  onValueChange={(value) => {
                                    setEditedOptions((prev) => ({
                                      ...prev,
                                      [option.id]: value,
                                    }))
                                  }}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder={`Select ${option.name.toLowerCase()}`} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {option.values?.map((val: any) => (
                                      <SelectItem key={val.id} value={val.id}>
                                        {val.label} {val.quantity ? `(${val.quantity} available)` : ""}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ))}
                          </div>
                        ) : (
                          formattedOptions &&
                          formattedOptions.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {formattedOptions.map((opt, idx) => (
                                <div key={idx} className="text-sm">
                                  <span className="font-medium text-muted-foreground">{opt.optionName}:</span>{" "}
                                  <span className={opt.value === "Not specified" ? "text-muted-foreground italic" : ""}>
                                    {opt.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )
                        )}
                      </div>
                      {!isEditingItems && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setIsEditingItems(true)
                          }}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>

                    {order.item_category === "order_form" && formResponses.length > 0 && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <h4 className="text-sm font-semibold text-muted-foreground">Order Form Details</h4>
                        {isEditingItems ? (
                          formResponses.map((response) => (
                            <div key={response.field_id} className="space-y-1.5">
                              <Label htmlFor={response.field_id} className="text-sm">
                                {response.field_label}
                                {response.is_required && <span className="text-destructive ml-1">*</span>}
                              </Label>

                              {response.field_type === "text" && (
                                <div className="space-y-1">
                                  <Input
                                    id={response.field_id}
                                    value={editedFormResponses[response.field_id] || ""}
                                    onChange={(e) =>
                                      setEditedFormResponses((prev) => ({
                                        ...prev,
                                        [response.field_id]: e.target.value,
                                      }))
                                    }
                                    placeholder={response.placeholder}
                                    maxLength={response.max_length}
                                  />
                                  {response.help_text && (
                                    <p className="text-xs text-muted-foreground">{response.help_text}</p>
                                  )}
                                  {response.max_length && (
                                    <p className="text-xs text-muted-foreground text-right">
                                      {(editedFormResponses[response.field_id] || "").length} / {response.max_length}
                                    </p>
                                  )}
                                </div>
                              )}

                              {response.field_type === "textarea" && (
                                <div className="space-y-1">
                                  <Textarea
                                    id={response.field_id}
                                    value={editedFormResponses[response.field_id] || ""}
                                    onChange={(e) =>
                                      setEditedFormResponses((prev) => ({
                                        ...prev,
                                        [response.field_id]: e.target.value,
                                      }))
                                    }
                                    placeholder={response.placeholder}
                                    maxLength={response.max_length}
                                    rows={3}
                                  />
                                  {response.help_text && (
                                    <p className="text-xs text-muted-foreground">{response.help_text}</p>
                                  )}
                                </div>
                              )}

                              {response.field_type === "select" && response.options && (
                                <div className="space-y-1">
                                  <Select
                                    value={editedFormResponses[response.field_id] || ""}
                                    onValueChange={(value) =>
                                      setEditedFormResponses((prev) => ({
                                        ...prev,
                                        [response.field_id]: value,
                                      }))
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={response.placeholder || "Select an option"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {response.options.map((option: string) => (
                                        <SelectItem key={option} value={option}>
                                          {option}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {response.help_text && (
                                    <p className="text-xs text-muted-foreground">{response.help_text}</p>
                                  )}
                                </div>
                              )}

                              {response.field_type === "number" && (
                                <div className="space-y-1">
                                  <Input
                                    id={response.field_id}
                                    type="number"
                                    value={editedFormResponses[response.field_id] || ""}
                                    onChange={(e) =>
                                      setEditedFormResponses((prev) => ({
                                        ...prev,
                                        [response.field_id]: e.target.value,
                                      }))
                                    }
                                    placeholder={response.placeholder}
                                  />
                                  {response.help_text && (
                                    <p className="text-xs text-muted-foreground">{response.help_text}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="space-y-2">
                            {formResponses.map((response) => (
                              <div key={response.field_id} className="text-sm">
                                <span className="font-medium text-muted-foreground">{response.field_label}:</span>{" "}
                                <span className={!response.field_value ? "text-muted-foreground italic" : ""}>
                                  {response.field_value || "Not provided"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span>Qty:</span>
                        {isEditingItems ? (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 bg-transparent"
                              onClick={() => setEditedQuantity(Math.max(1, editedQuantity - 1))}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              min="1"
                              value={editedQuantity}
                              onChange={(e) => setEditedQuantity(Math.max(1, Number.parseInt(e.target.value) || 1))}
                              className="w-16 h-7 text-center"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 bg-transparent"
                              onClick={() => setEditedQuantity(editedQuantity + 1)}
                            >
                              +
                            </Button>
                          </div>
                        ) : (
                          <span className="font-medium">{order.quantity}</span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">${Number(order.unit_price).toFixed(2)} each</div>
                        <div className="font-medium">${calculateNewTotal().toFixed(2)}</div>
                      </div>
                    </div>

                    {isEditingItems && (
                      <div className="flex gap-2 mt-4">
                        <Button onClick={updateOrderItems} className="flex-1" size="sm">
                          Save Changes
                        </Button>
                        <Button
                          onClick={cancelItemEditing}
                          variant="outline"
                          className="flex-1 bg-transparent"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total</span>
                      <span className="text-xl font-bold">${calculateNewTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Form Tab */}
              {activeTab === "order-form" && order?.item_category === "order_form" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Order Form Details</h2>
                    {!isEditingForm && (
                      <Button variant="ghost" size="icon" onClick={() => setIsEditingForm(true)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {isLoadingFormResponses ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
                        <p className="text-sm text-muted-foreground">Loading form fields...</p>
                      </div>
                    </div>
                  ) : formResponses.length > 0 ? (
                    <div className="space-y-4">
                      {formResponses
                        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                        .map((response) => (
                          <div key={response.field_id} className="space-y-2">
                            <Label>
                              {response.field_label}
                              {response.is_required && <span className="text-destructive ml-1">*</span>}
                            </Label>
                            {isEditingForm ? (
                              <>
                                {response.field_type === "text" && (
                                  <Input
                                    value={editedFormResponses[response.field_id] || response.field_value || ""}
                                    onChange={(e) =>
                                      setEditedFormResponses({
                                        ...editedFormResponses,
                                        [response.field_id]: e.target.value,
                                      })
                                    }
                                    placeholder={response.placeholder}
                                    maxLength={response.max_length}
                                  />
                                )}
                                {response.field_type === "textarea" && (
                                  <Textarea
                                    value={editedFormResponses[response.field_id] || response.field_value || ""}
                                    onChange={(e) =>
                                      setEditedFormResponses({
                                        ...editedFormResponses,
                                        [response.field_id]: e.target.value,
                                      })
                                    }
                                    placeholder={response.placeholder}
                                    maxLength={response.max_length}
                                    rows={3}
                                  />
                                )}
                                {response.field_type === "select" && (
                                  <Select
                                    value={editedFormResponses[response.field_id] || response.field_value || ""}
                                    onValueChange={(value) =>
                                      setEditedFormResponses({
                                        ...editedFormResponses,
                                        [response.field_id]: value,
                                      })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={response.placeholder || "Select an option"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {response.options?.map((option: string, idx: number) => (
                                        <SelectItem key={idx} value={option}>
                                          {option}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                                {response.help_text && (
                                  <p className="text-xs text-muted-foreground">{response.help_text}</p>
                                )}
                              </>
                            ) : (
                              <div className="p-3 bg-muted rounded-md">
                                <p className="text-sm">
                                  {response.field_value || (
                                    <span className="text-muted-foreground italic">No value provided</span>
                                  )}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}

                      {isEditingForm && (
                        <div className="flex gap-2 pt-4">
                          <Button onClick={handleSaveFormResponses} className="flex-1">
                            Save Changes
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsEditingForm(false)
                              setEditedFormResponses({})
                            }}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8 border rounded-lg">
                      <p className="text-muted-foreground">No form fields found for this item.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Customer Tab */}
              {activeTab === "customer" && (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="text-muted-foreground">Name</div>
                      <div className="font-medium">{order.user_name || "N/A"}</div>

                      <div className="text-muted-foreground">Email</div>
                      <div>{order.user_email || "N/A"}</div>

                      <div className="text-muted-foreground">Phone</div>
                      <div>{order.user_phone || "N/A"}</div>
                    </div>

                    <Button variant="outline" className="w-full mt-4 bg-transparent">
                      View Bidder Profile
                    </Button>
                  </div>
                </div>
              )}

              {/* Payment Tab */}
              {activeTab === "payment" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Payment Details</h2>
                  </div>

                  <div className="rounded-lg border p-6 space-y-6">
                    {/* Payment Status */}
                    <div className="flex items-center justify-between pb-4 border-b">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-semibold">Payment Status</div>
                          <div className="text-sm text-muted-foreground">Current transaction status</div>
                        </div>
                      </div>
                      <Badge
                        variant={
                          order.payment_status === "succeeded" || order.payment_status === "completed"
                            ? "default"
                            : order.payment_status === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                        className={
                          order.payment_status === "succeeded" || order.payment_status === "completed"
                            ? "bg-green-500 hover:bg-green-600"
                            : ""
                        }
                      >
                        {order.payment_status || "Unknown"}
                      </Badge>
                    </div>

                    {/* Transaction Details */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Transaction Information</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground mb-1">Amount</div>
                          <div className="font-semibold text-lg">${Number(order.total_amount || 0).toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground mb-1">Payment Method</div>
                          <div className="font-medium">{order.payment_method || "Card"}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground mb-1">Transaction ID</div>
                          <div className="font-mono text-xs break-all">
                            {order.stripe_payment_intent || order.payment_intent_id || "N/A"}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground mb-1">Payment Date</div>
                          <div>
                            {order.payment_date
                              ? new Date(order.payment_date).toLocaleDateString()
                              : order.created_at
                                ? new Date(order.created_at).toLocaleDateString()
                                : "N/A"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Customer Payment Info */}
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="font-semibold text-lg">Customer Information</h3>
                      <div className="grid grid-cols-1 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Name:</span>
                          <span className="font-medium">{order.user_name || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Email:</span>
                          <span className="font-medium">{order.user_email || "N/A"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Refetch Payment Status Button */}
                    <div className="pt-4 border-t">
                      <Button
                        variant="outline"
                        className="w-full bg-transparent"
                        onClick={refetchPaymentStatus}
                        disabled={isRefetchingPayment}
                      >
                        {isRefetchingPayment ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Refreshing...
                          </>
                        ) : (
                          <>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Refresh Payment Status
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages Tab */}
              {activeTab === "messages" && (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4 min-h-[300px] max-h-[400px] overflow-y-auto">
                    {!Array.isArray(messages) || messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No messages yet</p>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((msg) => (
                          <div key={msg.id} className="bg-muted p-3 rounded-lg">
                            <p className="text-sm">{msg.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(msg.created_at).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Send Message to Customer</Label>
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message here..."
                      rows={4}
                    />
                    <Button onClick={sendMessage} className="w-full">
                      Send Message
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Footer Actions */}
          <div className="border-t px-4 py-4 bg-background flex-shrink-0">
            <Button className="w-full" onClick={() => handleOrderAction("complete")}>
              Complete Order
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 bg-transparent" onClick={onClose}>
                Cancel
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleOrderAction("cancel")}>Cancel Order</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleOrderAction("refund")}>Refund Order</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleOrderAction("delete")}
                    className="text-destructive focus:text-destructive"
                  >
                    Delete Order
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmationDialog.isOpen}
        onOpenChange={(open) => !open && setConfirmationDialog({ ...confirmationDialog, isOpen: false })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmationDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmationDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmOrderAction}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
