"use client"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DollarSign,
  Calendar,
  User,
  Mail,
  CreditCard,
  Package,
  Ticket,
  Gavel,
  Printer,
  Heart,
  Edit,
  RotateCcw,
  Loader2,
  Trash2,
} from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

interface PaymentDetailsSheetProps {
  isOpen: boolean
  onClose: () => void
  payment: any
  isAdmin?: boolean
  onUpdate?: () => void
}

export function PaymentDetailsSheet({ isOpen, onClose, payment, isAdmin = false, onUpdate }: PaymentDetailsSheetProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isReverseDialogOpen, setIsReverseDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  // Edit form state
  const [editAmount, setEditAmount] = useState("")
  const [editStatus, setEditStatus] = useState("")
  const [editType, setEditType] = useState("")

  if (!payment) return null

  console.log("[v0] Payment details sheet data:", JSON.stringify(payment, null, 2))

  const safePayment = {
    ...payment,
    status: payment.status || "completed",
    payment_type: payment.payment_type || payment.order_type || "other",
    amount: payment.amount || payment.payment_amount || "0.00",
    event_id: payment.event_id || "",
  }

  const handleOpenEditDialog = () => {
    setEditAmount(Number(safePayment.amount).toFixed(2))
    setEditStatus(safePayment.status)
    setEditType(safePayment.payment_type)
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/events/${safePayment.event_id}/payments/${safePayment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number.parseFloat(editAmount),
          status: editStatus,
          payment_type: editType,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to update payment")
      }

      toast({
        title: "Payment Updated",
        description: "Payment details have been successfully updated.",
      })

      setIsEditDialogOpen(false)
      onUpdate?.()
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update payment",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReverseCharge = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/events/${safePayment.event_id}/payments/${safePayment.id}/refund`, {
        method: "POST",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to reverse charge")
      }

      const data = await response.json()

      toast({
        title: "Charge Reversed",
        description: `Refund of $${Number(safePayment.amount).toFixed(2)} has been processed successfully.`,
      })

      setIsReverseDialogOpen(false)
      onUpdate?.()
    } catch (error: any) {
      toast({
        title: "Refund Failed",
        description: error.message || "Failed to reverse charge",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeletePayment = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/events/${safePayment.event_id}/payments/${safePayment.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to delete payment")
      }

      toast({
        title: "Payment Deleted",
        description: "Payment record has been successfully deleted.",
      })

      setIsDeleteDialogOpen(false)
      onClose()
      onUpdate?.()
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete payment",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const getPaymentTypeIcon = (type: string) => {
    switch (type) {
      case "auction":
        return <Gavel className="h-4 w-4" />
      case "ticket":
        return <Ticket className="h-4 w-4" />
      case "shop":
        return <Package className="h-4 w-4" />
      case "donation":
        return <Heart className="h-4 w-4" />
      default:
        return <DollarSign className="h-4 w-4" />
    }
  }

  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case "auction":
        return "bg-blue-100 text-blue-800"
      case "ticket":
        return "bg-green-100 text-green-800"
      case "shop":
        return "bg-purple-100 text-purple-800"
      case "donation":
        return "bg-pink-100 text-pink-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusColor = (status: string) => {
    const normalizedStatus = status?.toLowerCase()
    switch (normalizedStatus) {
      case "completed":
      case "succeeded":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const displayStatus =
    safePayment.status === "succeeded"
      ? "Succeeded"
      : safePayment.status === "completed"
        ? "Completed"
        : safePayment.status?.charAt(0).toUpperCase() + safePayment.status?.slice(1)

  const handlePrintReceipt = () => {
    const receiptWindow = window.open("", "_blank")
    if (!receiptWindow) return

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
            h1 { text-align: center; color: #333; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; }
            .label { color: #666; }
            .value { font-weight: bold; }
            .total { font-size: 24px; color: #10b981; }
            hr { border: none; border-top: 1px solid #e0e0e0; margin: 20px 0; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Payment Receipt</h1>
            <p>Thank you for your payment!</p>
          </div>
          <hr>
          <div class="section">
            <div class="row">
              <span class="label">Customer:</span>
              <span class="value">${safePayment.user_name || "N/A"}</span>
            </div>
            <div class="row">
              <span class="label">Email:</span>
              <span class="value">${safePayment.user_email || "N/A"}</span>
            </div>
            <div class="row">
              <span class="label">Date:</span>
              <span class="value">${new Date(safePayment.created_at).toLocaleString()}</span>
            </div>
          </div>
          <hr>
          <div class="section">
            <div class="row">
              <span class="label">Type:</span>
              <span class="value" style="text-transform: capitalize;">${safePayment.payment_type}</span>
            </div>
            <div class="row">
              <span class="label">Item:</span>
              <span class="value">${safePayment.auction_title || "N/A"}</span>
            </div>
            <div class="row">
              <span class="label">Status:</span>
              <span class="value" style="text-transform: capitalize;">${safePayment.status}</span>
            </div>
          </div>
          <hr>
          <div class="space-y-6">
            {/* Payment Overview */}
            <div class="space-y-4">
              <h3 class="text-lg font-semibold">Overview</h3>
              <div class="grid gap-4">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-muted-foreground">Type</span>
                  <Badge variant="secondary" class={getPaymentTypeColor(safePayment.payment_type)}>
                    {safePayment.payment_type.charAt(0).toUpperCase() + safePayment.payment_type.slice(1)}
                  </Badge>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-muted-foreground">Status</span>
                  <Badge variant="secondary" class={getStatusColor(safePayment.status)}>
                    {displayStatus}
                  </Badge>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-muted-foreground">Amount</span>
                  <span class="text-2xl font-bold">${Number(safePayment.amount).toFixed(2)}</span>
                </div>
                {payment.discount_applied && (
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-muted-foreground">Discount Applied</span>
                    <span class="text-sm font-semibold text-green-600">-${Number(payment.discount_applied).toFixed(2)}</span>
                  </div>
                )}
                {payment.coupon_code && (
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-muted-foreground">Coupon Code</span>
                    <Badge variant="secondary" class="bg-green-100 text-green-800">{payment.coupon_code}</Badge>
                  </div>
                )}
                <div class="flex items-center justify-between">
                  <span class="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar class="h-4 w-4" />
                    Date
                  </span>
                  <span class="text-sm font-medium">{new Date(safePayment.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Customer Information */}
            <div class="space-y-4">
              <h3 class="text-lg font-semibold">Customer Information</h3>
              <div class="grid gap-4">
                <div class="flex items-start gap-3">
                  <User class="h-4 w-4 mt-1 text-muted-foreground" />
                  <div class="flex-1">
                    <p class="text-sm text-muted-foreground">Name</p>
                    <p class="text-sm font-medium">{safePayment.user_name || "N/A"}</p>
                  </div>
                </div>
                <div class="flex items-start gap-3">
                  <Mail class="h-4 w-4 mt-1 text-muted-foreground" />
                  <div class="flex-1">
                    <p class="text-sm text-muted-foreground">Email</p>
                    <p class="text-sm font-medium">{safePayment.user_email || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Item/Auction Information */}
            <div class="space-y-4">
              <h3 class="text-lg font-semibold">Item Details</h3>
              <div class="grid gap-4">
                <div class="flex items-start gap-3">
                  {getPaymentTypeIcon(safePayment.payment_type)}
                  <div class="flex-1">
                    <p class="text-sm text-muted-foreground">{getItemLabel()}</p>
                    <p class="text-sm font-medium">{getItemValue()}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Payment Information */}
            <div class="space-y-4">
              <h3 class="text-lg font-semibold">Payment Information</h3>
              <div class="grid gap-4">
                {safePayment.stripe_session_id && (
                  <div class="flex items-start gap-3">
                    <CreditCard class="h-4 w-4 mt-1 text-muted-foreground" />
                    <div class="flex-1">
                      <p class="text-sm text-muted-foreground">Stripe Session ID</p>
                      <p class="text-xs font-mono bg-muted p-2 rounded break-all">{safePayment.stripe_session_id}</p>
                    </div>
                  </div>
                )}
                {safePayment.stripe_payment_intent && (
                  <div class="flex items-start gap-3">
                    <CreditCard class="h-4 w-4 mt-1 text-muted-foreground" />
                    <div class="flex-1">
                      <p class="text-sm text-muted-foreground">Stripe Payment Intent</p>
                      <p class="text-xs font-mono bg-muted p-2 rounded break-all">
                        {safePayment.stripe_payment_intent}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </body>
      </html>
    `
    receiptWindow.document.write(receiptHTML)
    receiptWindow.document.close()
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Payment Details</SheetTitle>
          </SheetHeader>
          <div className="space-y-6">
            {/* Payment Overview */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Overview</h3>
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <Badge variant="secondary" className={getPaymentTypeColor(safePayment.payment_type)}>
                    {safePayment.payment_type.charAt(0).toUpperCase() + safePayment.payment_type.slice(1)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="secondary" className={getStatusColor(safePayment.status)}>
                    {displayStatus}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="text-2xl font-bold">${Number(safePayment.amount).toFixed(2)}</span>
                </div>
                {payment.discount_applied && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Discount Applied</span>
                    <span className="text-sm font-semibold text-green-600">
                      -${Number(payment.discount_applied).toFixed(2)}
                    </span>
                  </div>
                )}
                {payment.coupon_code && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Coupon Code</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {payment.coupon_code}
                    </Badge>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date
                  </span>
                  <span className="text-sm font-medium">{new Date(safePayment.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Customer Information</h3>
              <div className="grid gap-4">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="text-sm font-medium">{safePayment.user_name || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{safePayment.user_email || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Item/Auction Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Item Details</h3>
              <div className="grid gap-4">
                <div className="flex items-start gap-3">
                  {getPaymentTypeIcon(safePayment.payment_type)}
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Items</p>
                    {payment.payment_items && payment.payment_items.length > 0 ? (
                      <div className="space-y-1">
                        {payment.payment_items.map((item: any, idx: number) => (
                          <p key={idx} className="text-sm font-medium">
                            {item.item_type}: ${Number(item.unit_price).toFixed(2)}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-medium">{safePayment.auction_title || "N/A"}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Payment Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Payment Information</h3>
              <div className="grid gap-4">
                {safePayment.stripe_session_id && (
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Stripe Session ID</p>
                      <p className="text-xs font-mono bg-muted p-2 rounded break-all">{safePayment.stripe_session_id}</p>
                    </div>
                  </div>
                )}
                {safePayment.stripe_payment_intent && (
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Stripe Payment Intent</p>
                      <p className="text-xs font-mono bg-muted p-2 rounded break-all">
                        {safePayment.stripe_payment_intent}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {isAdmin && (
              <div className="space-y-2">
                <Button onClick={handleOpenEditDialog} variant="outline" className="w-full bg-transparent">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Payment
                </Button>
                {safePayment.status === "pending" && (
                  <Button onClick={() => setIsDeleteDialogOpen(true)} variant="destructive" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Payment
                  </Button>
                )}
                {safePayment.status !== "pending" && safePayment.stripe_payment_intent && (
                  <Button onClick={() => setIsReverseDialogOpen(true)} variant="destructive" className="w-full">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reverse Charge
                  </Button>
                )}
                <Button onClick={handlePrintReceipt} variant="outline" className="w-full bg-transparent">
                  <Printer className="mr-2 h-4 w-4" />
                  Print Receipt
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
            <DialogDescription>Update payment details. Changes will be saved to the database only.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Payment Type</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auction">Auction</SelectItem>
                  <SelectItem value="shop">Shop</SelectItem>
                  <SelectItem value="ticket">Ticket</SelectItem>
                  <SelectItem value="donation">Donation</SelectItem>
                  <SelectItem value="raffle">Raffle</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="succeeded">Succeeded</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReverseDialogOpen} onOpenChange={setIsReverseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverse Charge</DialogTitle>
            <DialogDescription>
              Are you sure you want to refund this payment? This will process a refund through Stripe and cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Customer</span>
                <span className="text-sm font-medium">{safePayment?.user_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="text-sm font-medium">${Number(safePayment?.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Payment Intent</span>
                <span className="text-xs font-mono">{safePayment?.stripe_payment_intent?.slice(-12)}</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              The customer will receive a refund to their original payment method within 5-10 business days.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReverseDialogOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReverseCharge} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Refund"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Payment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this pending payment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Customer</span>
                <span className="text-sm font-medium">{safePayment?.user_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="text-sm font-medium">${Number(safePayment?.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="secondary" className={getStatusColor(safePayment.status)}>
                  {displayStatus}
                </Badge>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              This will permanently delete the payment record from the database.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePayment} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Confirm Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function getItemLabel() {
  return "Auction Title"
}

function getItemValue() {
  return "N/A"
}

export default PaymentDetailsSheet
