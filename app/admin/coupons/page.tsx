"use client"

import { useState, useEffect } from "react"
import { useEvent } from "@/contexts/event-context"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, Copy, Calendar, Eye } from "lucide-react"
import { toast } from "sonner"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { PaymentDetailsSheet } from "@/components/admin/payment-details-sheet"

interface Coupon {
  id: string
  code: string
  description: string
  discount_type: string
  discount_amount: string
  discount_percentage: string
  allowed_emails: string[] | null
  allow_all_users: boolean
  max_uses: number
  current_uses: number
  expiration_date: string | null
  is_active: boolean
  created_at: string
  applies_to: string
  applies_to_item_ids: string[]
}

export default function CouponsPage() {
  const { event } = useEvent()
  const { user } = useAuth()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [showUsageSheet, setShowUsageSheet] = useState(false)
  const [selectedCouponForUsage, setSelectedCouponForUsage] = useState<Coupon | null>(null)
  const [couponUsages, setCouponUsages] = useState<any[]>([])
  const [loadingUsages, setLoadingUsages] = useState(false)
  const [showPaymentSheet, setShowPaymentSheet] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<any>(null)

  // Form state
  const [code, setCode] = useState("")
  const [description, setDescription] = useState("")
  const [discountType, setDiscountType] = useState<"fixed" | "percentage">("fixed")
  const [discountAmount, setDiscountAmount] = useState("")
  const [discountPercentage, setDiscountPercentage] = useState("")
  const [allowedEmails, setAllowedEmails] = useState("")
  const [allowAllUsers, setAllowAllUsers] = useState(false)
  const [maxUses, setMaxUses] = useState("1")
  const [expirationDate, setExpirationDate] = useState("")
  const [appliesTo, setAppliesTo] = useState<"cart" | "ticket" | "shop">("cart")
  const [shopItems, setShopItems] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])

  useEffect(() => {
    loadCoupons()
    loadShopItems()
    loadTickets()
  }, [event?.id])

  const loadCoupons = async () => {
    if (!event?.id) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/events/${event.id}/coupons`)
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      const data = await response.json()
      setCoupons(data.coupons || [])
    } catch (error) {
      console.error("[v0] Error loading coupons:", error)
      toast.error("Failed to load coupons")
      setCoupons([])
    } finally {
      setLoading(false)
    }
  }

  const loadShopItems = async () => {
    if (!event?.id) return
    try {
      const response = await fetch(`/api/events/${event.id}/shop/items`)
      if (response.ok) {
        const data = await response.json()
        setShopItems(data.items || [])
      }
    } catch (error) {
      console.error("[v0] Error loading shop items:", error)
    }
  }

  const loadTickets = async () => {
    if (!event?.id) return
    try {
      const response = await fetch(`/api/events/${event.id}/tickets`)
      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets || [])
      }
    } catch (error) {
      console.error("[v0] Error loading tickets:", error)
    }
  }

  const handleSubmit = async () => {
    if (!event?.id) {
      toast.error("Event not found. Please refresh the page.")
      return
    }

    if (!code.trim()) {
      toast.error("Please enter a coupon code")
      return
    }

    if (discountType === "fixed" && (!discountAmount || Number(discountAmount) <= 0)) {
      toast.error("Please enter a valid discount amount")
      return
    }

    if (
      discountType === "percentage" &&
      (!discountPercentage || Number(discountPercentage) <= 0 || Number(discountPercentage) > 100)
    ) {
      toast.error("Please enter a valid discount percentage (1-100)")
      return
    }

    const emailList = allowedEmails
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e)

    try {
      const url = editingCoupon
        ? `/api/events/${event.id}/coupons/${editingCoupon.id}`
        : `/api/events/${event.id}/coupons`

      const method = editingCoupon ? "PUT" : "POST"

      const payload = {
        code: code.toUpperCase(),
        description,
        discountType,
        discountAmount: discountType === "fixed" ? Number(discountAmount) : 0,
        discountPercentage: discountType === "percentage" ? Number(discountPercentage) : 0,
        allowedEmails: emailList.length > 0 ? emailList : null,
        allowAllUsers,
        maxUses: Number(maxUses),
        expirationDate: expirationDate || null,
        isActive: editingCoupon?.is_active !== undefined ? editingCoupon.is_active : true,
        appliesTo,
        appliesToItemIds: selectedItemIds.length > 0 ? selectedItemIds : null,
      }

      console.log("[v0] Submitting coupon with payload:", JSON.stringify(payload, null, 2))

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || "Failed to save coupon")
        return
      }

      toast.success(editingCoupon ? "Coupon updated successfully" : "Coupon created successfully")
      setShowDialog(false)
      resetForm()
      loadCoupons()
    } catch (error) {
      console.error("[v0] Error saving coupon:", error)
      toast.error("Failed to save coupon")
    }
  }

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon)
    setCode(coupon.code)
    setDescription(coupon.description || "")
    setDiscountType(coupon.discount_type as "fixed" | "percentage")
    setDiscountAmount(coupon.discount_amount || "")
    setDiscountPercentage(coupon.discount_percentage || "")
    setAllowedEmails(coupon.allowed_emails?.join(", ") || "")
    setAllowAllUsers(coupon.allow_all_users)
    setMaxUses(String(coupon.max_uses))
    setExpirationDate(coupon.expiration_date ? new Date(coupon.expiration_date).toISOString().split("T")[0] : "")
    console.log("[v0] Editing coupon, applies_to:", coupon.applies_to)
    console.log("[v0] Editing coupon, applies_to_item_ids:", coupon.applies_to_item_ids)
    setAppliesTo((coupon.applies_to || "cart") as "cart" | "ticket" | "shop")
    setSelectedItemIds(coupon.applies_to_item_ids || [])
    setShowDialog(true)
  }

  const handleDelete = async (couponId: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return
    if (!event?.id) return

    try {
      const response = await fetch(`/api/events/${event.id}/coupons/${couponId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        toast.error("Failed to delete coupon")
        return
      }

      toast.success("Coupon deleted successfully")
      loadCoupons()
    } catch (error) {
      console.error("Error deleting coupon:", error)
      toast.error("Failed to delete coupon")
    }
  }

  const toggleActive = async (coupon: Coupon) => {
    if (!event?.id) return

    try {
      const response = await fetch(`/api/events/${event.id}/coupons/${coupon.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: coupon.description,
          discountType: coupon.discount_type,
          discountAmount: coupon.discount_amount,
          discountPercentage: coupon.discount_percentage,
          allowedEmails: coupon.allowed_emails,
          allowAllUsers: coupon.allow_all_users,
          maxUses: coupon.max_uses,
          expirationDate: coupon.expiration_date,
          isActive: !coupon.is_active,
        }),
      })

      if (!response.ok) {
        toast.error("Failed to update coupon")
        return
      }

      toast.success(coupon.is_active ? "Coupon deactivated" : "Coupon activated")
      loadCoupons()
    } catch (error) {
      console.error("Error toggling coupon:", error)
      toast.error("Failed to update coupon")
    }
  }

  const resetForm = () => {
    setEditingCoupon(null)
    setCode("")
    setDescription("")
    setDiscountType("fixed")
    setDiscountAmount("")
    setDiscountPercentage("")
    setAllowedEmails("")
    setAllowAllUsers(false)
    setMaxUses("1")
    setExpirationDate("")
    setAppliesTo("cart")
    setSelectedItemIds([])
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success("Code copied to clipboard")
  }

  const handleViewUsage = async (coupon: Coupon) => {
    setSelectedCouponForUsage(coupon)
    setShowUsageSheet(true)
    setLoadingUsages(true)

    try {
      const response = await fetch(`/api/events/${event.id}/coupons/${coupon.id}/usage`)
      if (response.ok) {
        const data = await response.json()
        setCouponUsages(data.usages || [])
      } else {
        toast.error("Failed to load coupon usage")
        setCouponUsages([])
      }
    } catch (error) {
      console.error("[v0] Error loading coupon usage:", error)
      toast.error("Failed to load coupon usage")
      setCouponUsages([])
    } finally {
      setLoadingUsages(false)
    }
  }

  const handleViewPaymentFromUsage = (payment: any) => {
    setSelectedPayment(payment)
    setShowPaymentSheet(true)
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Coupon Management</h1>
        <Button
          onClick={() => {
            resetForm()
            setShowDialog(true)
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Coupon
        </Button>
      </div>

      <div className="grid gap-4">
        {coupons.map((coupon) => (
          <Card key={coupon.id} className="p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <code className="text-lg font-bold bg-muted px-3 py-1 rounded">{coupon.code}</code>
                  <Button variant="ghost" size="sm" onClick={() => copyCode(coupon.code)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Badge variant={coupon.is_active ? "default" : "secondary"}>
                    {coupon.is_active ? "Active" : "Inactive"}
                  </Badge>
                  {coupon.discount_type === "fixed" && <Badge variant="outline">${coupon.discount_amount} off</Badge>}
                  {coupon.discount_type === "percentage" && (
                    <Badge variant="outline">{coupon.discount_percentage}% off</Badge>
                  )}
                </div>

                {coupon.description && <p className="text-sm text-muted-foreground mb-3">{coupon.description}</p>}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Usage:</span>
                    <div className="font-medium">
                      {coupon.current_uses} / {coupon.max_uses}
                    </div>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Allowed Users:</span>
                    <div className="font-medium">
                      {coupon.allow_all_users
                        ? "All Users"
                        : coupon.allowed_emails && coupon.allowed_emails.length > 0
                          ? `${coupon.allowed_emails.length} emails`
                          : "No restrictions"}
                    </div>
                  </div>

                  {coupon.expiration_date && (
                    <div>
                      <span className="text-muted-foreground">Expires:</span>
                      <div className="font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(coupon.expiration_date).toLocaleDateString()}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <div className="font-medium">{new Date(coupon.created_at).toLocaleDateString()}</div>
                  </div>
                </div>

                {coupon.allowed_emails && coupon.allowed_emails.length > 0 && !coupon.allow_all_users && (
                  <div className="mt-3 pt-3 border-t">
                    <span className="text-xs text-muted-foreground">Allowed Emails:</span>
                    <div className="text-xs mt-1 flex flex-wrap gap-1">
                      {coupon.allowed_emails.map((email, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {email}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 ml-4">
                <Button variant="ghost" size="sm" onClick={() => handleViewUsage(coupon)} title="View usage details">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toggleActive(coupon)}>
                  <Switch checked={coupon.is_active} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(coupon)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(coupon.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {coupons.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No coupons created yet</p>
            <Button
              onClick={() => {
                resetForm()
                setShowDialog(true)
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Coupon
            </Button>
          </Card>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? "Edit Coupon" : "Create New Coupon"}</DialogTitle>
            <DialogDescription>
              {editingCoupon ? "Update the coupon details below" : "Create a new discount coupon for your event"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">Coupon Code *</Label>
              <Input
                id="code"
                placeholder="SUMMER2024"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={!!editingCoupon}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Summer sale discount"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="discountType">Discount Type *</Label>
              <Select value={discountType} onValueChange={(v) => setDiscountType(v as "fixed" | "percentage")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {discountType === "fixed" && (
              <div className="grid gap-2">
                <Label htmlFor="discountAmount">Discount Amount ($) *</Label>
                <Input
                  id="discountAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="10.00"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                />
              </div>
            )}

            {discountType === "percentage" && (
              <div className="grid gap-2">
                <Label htmlFor="discountPercentage">Discount Percentage (%) *</Label>
                <Input
                  id="discountPercentage"
                  type="number"
                  min="1"
                  max="100"
                  placeholder="20"
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(e.target.value)}
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="maxUses">Maximum Uses *</Label>
              <Input
                id="maxUses"
                type="number"
                min="1"
                placeholder="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expirationDate">Expiration Date (Optional)</Label>
              <Input
                id="expirationDate"
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch id="allowAllUsers" checked={allowAllUsers} onCheckedChange={setAllowAllUsers} />
              <Label htmlFor="allowAllUsers">Allow all users (no email restrictions)</Label>
            </div>

            {!allowAllUsers && (
              <div className="grid gap-2">
                <Label htmlFor="allowedEmails">Allowed Email Addresses (Optional)</Label>
                <Textarea
                  id="allowedEmails"
                  placeholder="email1@example.com, email2@example.com"
                  value={allowedEmails}
                  onChange={(e) => setAllowedEmails(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter email addresses separated by commas. Leave empty to allow any email.
                </p>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="appliesTo">Applies To</Label>
              <Select
                value={appliesTo}
                onValueChange={(v) => {
                  setAppliesTo(v as "cart" | "ticket" | "shop")
                  setSelectedItemIds([])
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cart">Entire Cart</SelectItem>
                  <SelectItem value="ticket">Tickets Only</SelectItem>
                  <SelectItem value="shop">Shop Items Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {appliesTo === "shop" && shopItems.length > 0 && (
              <div className="grid gap-2">
                <Label>Specific Shop Items (Optional)</Label>
                <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                  {shopItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <Switch
                        checked={selectedItemIds.includes(String(item.id))}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedItemIds([...selectedItemIds, String(item.id)])
                          } else {
                            setSelectedItemIds(selectedItemIds.filter((id) => id !== String(item.id)))
                          }
                        }}
                      />
                      <Label className="cursor-pointer font-normal">
                        {item.name} - ${item.price}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Leave all unchecked to apply to all shop items</p>
              </div>
            )}

            {appliesTo === "ticket" && tickets.length > 0 && (
              <div className="grid gap-2">
                <Label>Specific Tickets (Optional)</Label>
                <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-center gap-2">
                      <Switch
                        checked={selectedItemIds.includes(String(ticket.id))}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedItemIds([...selectedItemIds, String(ticket.id)])
                          } else {
                            setSelectedItemIds(selectedItemIds.filter((id) => id !== String(ticket.id)))
                          }
                        }}
                      />
                      <Label className="cursor-pointer font-normal">
                        {ticket.name} - ${ticket.price}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Leave all unchecked to apply to all tickets</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>{editingCoupon ? "Update Coupon" : "Create Coupon"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={showUsageSheet} onOpenChange={setShowUsageSheet}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="border-b pb-4 mb-6">
            <SheetTitle>Coupon Usage</SheetTitle>
            {selectedCouponForUsage && (
              <div className="flex items-center gap-2 mt-2">
                <code className="text-lg font-bold bg-muted px-3 py-1 rounded">{selectedCouponForUsage.code}</code>
                <Badge variant="outline">
                  {selectedCouponForUsage.current_uses} / {selectedCouponForUsage.max_uses} uses
                </Badge>
              </div>
            )}
          </SheetHeader>

          <div className="space-y-4">
            {loadingUsages ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading usage data...</p>
                </div>
              </div>
            ) : couponUsages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No one has used this coupon yet</p>
              </div>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {couponUsages.length} {couponUsages.length === 1 ? "User" : "Users"}
                </h3>
                <div className="space-y-2">
                  {couponUsages.map((usage) => (
                    <Card
                      key={usage.id}
                      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleViewPaymentFromUsage(usage)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{usage.user_name || "Unknown"}</p>
                            <Badge
                              variant="secondary"
                              className={
                                usage.status === "succeeded" || usage.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : usage.status === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                              }
                            >
                              {usage.status === "succeeded" ? "Completed" : usage.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{usage.user_email}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-muted-foreground">
                              {new Date(usage.created_at).toLocaleDateString()} at{" "}
                              {new Date(usage.created_at).toLocaleTimeString()}
                            </span>
                            <Badge variant="outline" className="capitalize">
                              {usage.payment_type}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            ${Number(usage.payment_amount || usage.amount || 0).toFixed(2)}
                          </p>
                          {usage.discount_applied && (
                            <p className="text-sm text-green-600">
                              Saved: ${Number(usage.discount_applied).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {showPaymentSheet && (
        <PaymentDetailsSheet
          isOpen={showPaymentSheet}
          onClose={() => setShowPaymentSheet(false)}
          payment={selectedPayment}
          isAdmin={true}
          onUpdate={() => {
            // Refresh coupon usage when payment is updated
            if (selectedCouponForUsage) {
              handleViewUsage(selectedCouponForUsage)
            }
          }}
        />
      )}
    </div>
  )
}
