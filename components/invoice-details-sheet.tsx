"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface InvoiceItem {
  id?: string
  item_name: string
  item_description: string
  quantity: number
  unit_price: number
  total_amount: number
}

interface Invoice {
  id: string
  invoice_number: string
  invoice_date: string
  due_date: string | null
  name: string
  email: string
  phone: string | null
  school_name: string | null
  total_amount: number
  status: string
  payment_status?: string
  payment_id: string | null
  item_description: string | null
}

interface InvoiceDetailsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: Invoice | null
  eventId: string
  onSuccess?: () => void
}

export function InvoiceDetailsSheet({ open, onOpenChange, invoice, eventId, onSuccess }: InvoiceDetailsSheetProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")

  useEffect(() => {
    if (open && invoice) {
      loadInvoiceDetails()
      setCustomerName(invoice.name)
      setCustomerEmail(invoice.email)
      setCustomerPhone(invoice.phone || "")
    }
  }, [open, invoice])

  const loadInvoiceDetails = async () => {
    if (!invoice) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/po-requests/${invoice.id}/items`)
      if (response.ok) {
        const data = await response.json()
        setItems(data.items || [])
      } else {
        throw new Error("Failed to load invoice items")
      }
    } catch (error) {
      console.error("[v0] Failed to load invoice items:", error)
      toast({
        title: "Error",
        description: "Failed to load invoice details",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addItem = () => {
    setItems([
      ...items,
      {
        item_name: "",
        item_description: "",
        quantity: 1,
        unit_price: 0,
        total_amount: 0,
      },
    ])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    // Recalculate total for this item
    if (field === "quantity" || field === "unit_price") {
      const item = newItems[index]
      item.total_amount = item.quantity * item.unit_price
    }

    setItems(newItems)
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total_amount, 0)
  }

  const handleSave = async () => {
    if (!invoice) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/po-requests/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          items: items,
          total_amount: calculateTotal(),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update invoice")
      }

      toast({
        title: "Success",
        description: "Invoice updated successfully",
      })

      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error("[v0] Failed to save invoice:", error)
      toast({
        title: "Error",
        description: "Failed to update invoice",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!invoice) return null

  const isPaid = invoice.payment_id !== null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Invoice {invoice.invoice_number}
            {isPaid && <Badge className="bg-green-500">Paid</Badge>}
          </SheetTitle>
          <SheetDescription>
            View and edit invoice details. Created on {new Date(invoice.invoice_date).toLocaleDateString()}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-6">
            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="font-semibold">Customer Information</h3>
              <div className="space-y-2">
                <Label htmlFor="customerName">Name</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  disabled={isPaid}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  disabled={isPaid}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone</Label>
                <Input
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  disabled={isPaid}
                />
              </div>
            </div>

            {/* Invoice Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Invoice Items</h3>
                {!isPaid && (
                  <Button onClick={addItem} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                )}
              </div>

              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No items added yet</p>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="space-y-2">
                            <Label>Item Name</Label>
                            <Input
                              value={item.item_name}
                              onChange={(e) => updateItem(index, "item_name", e.target.value)}
                              disabled={isPaid}
                              placeholder="Enter item name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                              value={item.item_description}
                              onChange={(e) => updateItem(index, "item_description", e.target.value)}
                              disabled={isPaid}
                              placeholder="Enter item description"
                              rows={2}
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-2">
                              <Label>Quantity</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                                disabled={isPaid}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Unit Price</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unit_price}
                                onChange={(e) => updateItem(index, "unit_price", Number(e.target.value))}
                                disabled={isPaid}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Total</Label>
                              <Input value={`$${item.total_amount.toFixed(2)}`} disabled />
                            </div>
                          </div>
                        </div>
                        {!isPaid && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="ml-2 mt-7"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t">
                <span className="font-semibold">Total Amount:</span>
                <span className="text-2xl font-bold">${calculateTotal().toFixed(2)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            {!isPaid && (
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
